import Stripe from 'stripe'
import { createSanityClient } from '../../utils/sanity'
import { createSupabaseAdmin } from '../../utils/supabase'
import {
  notifyOriginalPurchase,
  sendPrintOrderToShipStation,
  type OrderItemRow,
  type ShippingInfo,
} from '../../utils/fulfillment'

/**
 * Stripe webhook — the source of truth for "payment succeeded".
 *
 * Trust rules enforced here:
 *  - Verify the stripe-signature on every event (reject unsigned/forged).
 *  - Idempotency: record the event id before doing work; skip if seen before.
 *  - Flip the pre-created order pending -> confirmed, then split fulfillment:
 *    originals notify Robert + mark the Sanity artwork recently_sold; prints
 *    route to Art City via ShipStation.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const webhookSecret = config.stripeWebhookSecret as string
  if (!webhookSecret) {
    throw createError({ statusCode: 500, statusMessage: 'Webhook secret not configured.' })
  }

  const stripe = new Stripe(config.stripeSecretKey as string)
  const signature = getHeader(event, 'stripe-signature')
  const rawBody = await readRawBody(event, 'utf8')

  if (!signature || !rawBody) {
    throw createError({ statusCode: 400, statusMessage: 'Missing signature or body.' })
  }

  let stripeEvent: Stripe.Event
  try {
    stripeEvent = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
  } catch (err: any) {
    // Bad signature → reject. Stripe will not retry a 400.
    throw createError({ statusCode: 400, statusMessage: `Webhook signature failed: ${err.message}` })
  }

  const supabase = createSupabaseAdmin()

  // Idempotency: claim the event id first. A duplicate (Stripe retry) hits the
  // primary-key conflict and we acknowledge without reprocessing.
  const { error: claimError } = await supabase
    .from('processed_webhook_events')
    .insert({ stripe_event_id: stripeEvent.id })

  if (claimError) {
    if (claimError.code === '23505') {
      return { received: true, duplicate: true }
    }
    console.error('[webhook] could not record event', claimError)
    throw createError({ statusCode: 500, statusMessage: 'Could not record event.' })
  }

  if (stripeEvent.type === 'checkout.session.completed') {
    await handleCheckoutCompleted(stripeEvent.data.object as Stripe.Checkout.Session, supabase)
  }

  return { received: true }
})

async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
  supabase: ReturnType<typeof createSupabaseAdmin>,
) {
  const orderId = session.metadata?.orderId
  if (!orderId) {
    console.error('[webhook] checkout.session.completed has no orderId in metadata', {
      sessionId: session.id,
    })
    return
  }

  // Stripe shipping shape has shifted across API versions; read defensively.
  const s = session as any
  const shippingDetails = s.shipping_details ?? s.collected_information?.shipping_details ?? null
  const shipping: ShippingInfo = {
    name: shippingDetails?.name ?? session.customer_details?.name ?? null,
    email: session.customer_details?.email ?? null,
    address: shippingDetails?.address ?? session.customer_details?.address ?? null,
  }

  const paymentIntentId =
    typeof session.payment_intent === 'string'
      ? session.payment_intent
      : (session.payment_intent?.id ?? null)

  // Confirm the order. Scoped to status='pending' so a retry can't downgrade
  // an already-shipped order.
  const { error: updateError } = await supabase
    .from('orders')
    .update({
      status: 'confirmed',
      stripe_payment_intent_id: paymentIntentId,
      guest_email: shipping.email,
      shipping_address: shippingDetails ?? session.customer_details ?? null,
    })
    .eq('id', orderId)
    .eq('status', 'pending')

  if (updateError) {
    console.error('[webhook] failed to confirm order', { orderId, updateError })
    throw createError({ statusCode: 500, statusMessage: 'Failed to confirm order.' })
  }

  const { data: itemRows, error: itemsError } = await supabase
    .from('order_items')
    .select('id, sanity_product_id, title_snapshot, media_type, size, frame_id, quantity, unit_price')
    .eq('order_id', orderId)

  if (itemsError || !itemRows) {
    console.error('[webhook] failed to load order items', { orderId, itemsError })
    throw createError({ statusCode: 500, statusMessage: 'Failed to load order items.' })
  }

  const items = itemRows as OrderItemRow[]
  const originals = items.filter((i) => i.media_type === 'original')
  const prints = items.filter((i) => i.media_type !== 'original')

  // Originals: notify Robert + mark the Sanity artwork recently_sold.
  if (originals.length > 0) {
    const sanity = createSanityClient()
    for (const item of originals) {
      notifyOriginalPurchase(orderId, item, shipping)
      try {
        const artworkId = await sanity.fetch<string | null>(
          `*[_id == $pid][0].artwork->_id`,
          { pid: item.sanity_product_id },
        )
        if (artworkId) {
          await sanity.patch(artworkId).set({ status: 'recently_sold' }).commit()
        }
      } catch (err) {
        console.error('[webhook] failed to mark artwork recently_sold', {
          productId: item.sanity_product_id,
          err,
        })
      }
    }
  }

  // Prints: route to Art City via ShipStation (stubbed if creds absent).
  try {
    await sendPrintOrderToShipStation(orderId, prints, shipping)
  } catch (err) {
    console.error('[webhook] print fulfillment error (order still confirmed)', { orderId, err })
  }
}
