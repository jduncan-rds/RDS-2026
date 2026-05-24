import Stripe from 'stripe'
import { serverSupabaseUser } from '#supabase/server'
import { createSanityClient } from '../utils/sanity'
import { createSupabaseAdmin } from '../utils/supabase'
import { computeVariantPrice, computeFrameModifier } from '../../utils/pricing'
import type { PricingRules, FramePricingData, PrintMediaType } from '../../utils/pricing'

interface CartItemPayload {
  productId: string
  artworkSlug: string
  title: string
  imageUrl: string
  mediaType: 'original' | PrintMediaType
  size: string | null
  frameId: string | null
  frameName: string | null
  quantity: number
  unitPrice: number
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const stripe = new Stripe(config.stripeSecretKey as string)
  const sanity = createSanityClient()

  const body = await readBody(event)
  const items: CartItemPayload[] = body?.items

  if (!Array.isArray(items) || items.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Cart is empty.' })
  }

  for (const item of items) {
    if (!item.productId || !item.mediaType || !item.quantity || item.quantity < 1) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid cart item.' })
    }
  }

  // Batch all Sanity fetches
  const productIds = [...new Set(items.map((i) => i.productId))]
  const frameIds = [...new Set(items.map((i) => i.frameId).filter(Boolean) as string[])]

  const [products, frames, rules] = await Promise.all([
    sanity.fetch<any[]>(
      `*[_type == "product" && _id in $ids] { _id, originalPrice, "artworkStatus": artwork->status, variants[] { mediaType, size, price } }`,
      { ids: productIds },
    ),
    frameIds.length > 0
      ? sanity.fetch<any[]>(
          `*[_type == "frame" && _id in $ids] { _id, priceModifier, frameRateType, ratePerSqIn }`,
          { ids: frameIds },
        )
      : Promise.resolve([] as any[]),
    sanity.fetch<PricingRules>(`*[_id == "pricingRules"][0]`),
  ])

  if (
    !rules?.openEditionRatePerSqIn ||
    !rules?.podPaperRatePerSqIn ||
    !rules?.podCanvasRatePerSqIn
  ) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Pricing configuration is incomplete. Please contact us.',
    })
  }

  const productMap = Object.fromEntries(products.map((p) => [p._id, p]))
  const frameMap = Object.fromEntries(frames.map((f) => [f._id, f]))

  const lineItems = []
  // Captured alongside line items so we can write order_items snapshots with
  // the same authoritative price (in cents) used for the Stripe charge.
  const orderItemRows: {
    sanity_product_id: string
    title_snapshot: string
    image_url_snapshot: string | null
    media_type: string
    size: string | null
    frame_id: string | null
    quantity: number
    unit_price: number
  }[] = []

  for (const item of items) {
    const product = productMap[item.productId]
    if (!product) {
      throw createError({ statusCode: 400, statusMessage: `Product not found: ${item.title}` })
    }

    let unitAmountCents: number

    if (item.mediaType === 'original') {
      if (!product.originalPrice) {
        throw createError({
          statusCode: 400,
          statusMessage: `Price not set for original: ${item.title}`,
        })
      }
      // Inventory check (Trust Rule #5): originals are one-of-a-kind. Block
      // checkout unless the artwork is still available.
      if (product.artworkStatus !== 'available') {
        throw createError({
          statusCode: 409,
          statusMessage: `Sorry, "${item.title}" is no longer available.`,
        })
      }
      unitAmountCents = Math.round(product.originalPrice * 100)
    } else {
      if (!item.size) {
        throw createError({ statusCode: 400, statusMessage: `Size required for: ${item.title}` })
      }

      const variant = product.variants?.find(
        (v: any) => v.mediaType === item.mediaType && v.size === item.size,
      )

      const base = computeVariantPrice(
        item.mediaType as PrintMediaType,
        item.size,
        rules,
        variant?.price,
      )

      if (base === null) {
        throw createError({
          statusCode: 400,
          statusMessage: `Cannot compute price for ${item.title} (${item.size})`,
        })
      }

      const frame: FramePricingData | null = item.frameId ? frameMap[item.frameId] ?? null : null
      const frameModifier = computeFrameModifier(frame, item.size)

      unitAmountCents = Math.round((base + frameModifier) * 100)
    }

    const mediaTypeLabel: Record<string, string> = {
      original: 'Original Painting',
      open_edition: 'Open Edition Print',
      pod_paper: 'Custom Print',
      pod_canvas: 'Custom Canvas',
    }

    const descriptionParts: string[] = [mediaTypeLabel[item.mediaType] ?? item.mediaType]
    if (item.size) descriptionParts.push(item.size)
    if (item.mediaType !== 'original') {
      descriptionParts.push(`Frame: ${item.frameName ?? 'Unframed'}`)
    }

    lineItems.push({
      price_data: {
        currency: 'usd',
        product_data: {
          name: item.title,
          description: descriptionParts.join(' · '),
          images: item.imageUrl ? [item.imageUrl] : [],
        },
        unit_amount: unitAmountCents,
      },
      quantity: item.quantity,
    })

    orderItemRows.push({
      sanity_product_id: item.productId,
      title_snapshot: item.title,
      image_url_snapshot: item.imageUrl || null,
      media_type: item.mediaType,
      size: item.size,
      frame_id: item.frameId,
      quantity: item.quantity,
      unit_price: unitAmountCents,
    })
  }

  const orderTotalCents = orderItemRows.reduce((sum, r) => sum + r.unit_price * r.quantity, 0)

  // Auth context (Phase 8): if the request carries a Supabase session, we
  // associate the order with the user *and* attach a Stripe Customer to the
  // Checkout Session so shipping address + email prefill from prior orders.
  // Guests continue to work exactly as before.
  //
  // `serverSupabaseUser` returns the decoded JWT payload — the user id lives
  // in `sub` (JWT standard), not `id`. Don't reach for `.id` here.
  const supabase = createSupabaseAdmin()
  const authedUser = await serverSupabaseUser(event).catch((err) => {
    console.error('[checkout] serverSupabaseUser threw:', err)
    return null
  })
  const authedUserId = authedUser?.sub ?? null

  let stripeCustomerId: string | null = null
  if (authedUser && authedUserId) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', authedUserId)
      .single()

    if (profile?.stripe_customer_id) {
      stripeCustomerId = profile.stripe_customer_id
    } else {
      // First authed checkout — create a Stripe Customer and save the id back
      // to the profile. We do NOT save payment methods on this customer
      // (no `setup_future_usage`), so it only holds email + shipping address.
      const customer = await stripe.customers.create({
        email: authedUser.email,
        metadata: { supabase_user_id: authedUserId },
      })
      stripeCustomerId = customer.id
      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customer.id })
        .eq('id', authedUserId)
    }
  }

  // Pre-create the order (Trust Rule #4): write a 'pending' order + items now,
  // while we still hold the full cart with price/title/image snapshots. The
  // webhook later flips it to 'confirmed' and fills in buyer email + shipping.
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      status: 'pending',
      total: orderTotalCents,
      user_id: authedUserId,
    })
    .select('id')
    .single()

  if (orderError || !order) {
    console.error('[checkout] failed to create order', orderError)
    throw createError({ statusCode: 500, statusMessage: 'Could not start checkout. Please try again.' })
  }

  const { error: itemsError } = await supabase
    .from('order_items')
    .insert(orderItemRows.map((r) => ({ ...r, order_id: order.id })))

  if (itemsError) {
    console.error('[checkout] failed to create order_items', itemsError)
    throw createError({ statusCode: 500, statusMessage: 'Could not start checkout. Please try again.' })
  }

  const host = getRequestHost(event)
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
  const baseUrl = `${protocol}://${host}`

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    payment_method_types: ['card'],
    line_items: lineItems,
    mode: 'payment',
    shipping_address_collection: { allowed_countries: ['US'] },
    success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/checkout/cancel`,
    // The webhook looks the order up by this id and reads its items from
    // Supabase — no need to stuff the full cart into metadata (500-char cap).
    metadata: { orderId: order.id },
  }

  if (stripeCustomerId) {
    sessionParams.customer = stripeCustomerId
    // Save addresses entered at checkout back to the Customer so the next
    // visit prefills them. `shipping: 'auto'` writes the shipping address;
    // `name: 'auto'` writes the billing name.
    sessionParams.customer_update = { shipping: 'auto', name: 'auto' }
  }

  const session = await stripe.checkout.sessions.create(sessionParams)

  return { url: session.url }
})
