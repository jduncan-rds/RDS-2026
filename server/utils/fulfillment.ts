/**
 * Phase 7 fulfillment routing.
 *
 * A paid order may mix three kinds of items:
 *  - originals (shipped by Robert himself)
 *  - prints / canvas (drop-shipped by Art City via ShipStation)
 *  - simple products (calendars / cards / gifts; also ShipStation, same flow,
 *    using the product's own SKU from Sanity)
 *
 * The webhook splits the order: originals go to `notifyOriginalPurchase`,
 * everything else goes to `sendFulfillableOrderToShipStation`. Both handlers
 * are best-effort + heavily logged — the durable record is the Supabase
 * order row, and fulfillment can be re-driven from there if a call fails.
 */

export interface OrderItemRow {
  id: string
  sanity_product_id: string
  title_snapshot: string
  media_type: 'original' | 'open_edition' | 'pod_paper' | 'pod_canvas' | 'simple'
  size: string | null
  frame_id: string | null
  frame_name_snapshot: string | null
  quantity: number
  unit_price: number // cents
  sku_snapshot: string | null
}

export interface ShippingInfo {
  name?: string | null
  email?: string | null
  address?: {
    line1?: string | null
    line2?: string | null
    city?: string | null
    state?: string | null
    postal_code?: string | null
    country?: string | null
  } | null
}

const dollars = (cents: number) => (cents / 100).toFixed(2)

/**
 * Notify Robert that an original sold (he ships these himself). Sends an
 * email via Resend if ORDERS_NOTIFY_EMAIL + Resend config are both present;
 * otherwise logs the details so nothing is lost.
 *
 * Best-effort: an email-provider failure is swallowed (with a console error)
 * so the webhook doesn't 500 and let Stripe retry on a successfully-flipped
 * order. The Supabase order row is the durable record.
 */
import { sendEmail } from './email'

export async function notifyOriginalPurchase(
  orderId: string,
  item: OrderItemRow,
  shipping: ShippingInfo,
): Promise<void> {
  const config = useRuntimeConfig()
  const notifyTo = config.ordersNotifyEmail as string | undefined

  const lines = [
    `Order: ${orderId}`,
    `Painting: ${item.title_snapshot}`,
    `Price: $${dollars(item.unit_price)}`,
    '',
    `Ship to: ${shipping.name ?? '(unknown)'}`,
    shipping.address?.line1 ?? '',
    shipping.address?.line2 ?? '',
    [shipping.address?.city, shipping.address?.state, shipping.address?.postal_code]
      .filter(Boolean)
      .join(', '),
    shipping.address?.country ?? '',
    '',
    `Buyer email: ${shipping.email ?? '(unknown)'}`,
  ].filter((l) => l !== null).join('\n')

  console.log('[fulfillment:original] NEW ORIGINAL SALE — Robert to ship', {
    orderId,
    notifyTo: notifyTo || '(ORDERS_NOTIFY_EMAIL unset)',
    title: item.title_snapshot,
  })

  if (!notifyTo) return

  await sendEmail({
    to: notifyTo,
    subject: `Original sold: ${item.title_snapshot}`,
    text: lines,
    from: config.resendFromEmailOrders as string | undefined,
  }).catch((err) => {
    console.error('[fulfillment:original] email send failed', { orderId, err })
  })
}

/**
 * Route prints + simple products to ShipStation's createorder API. Prints use
 * a composite SKU computed from product/media/size/frame; simple products use
 * the SKU snapshotted from Sanity at checkout time. If ShipStation credentials
 * are absent, log the payload that *would* have been sent so the order can be
 * placed manually and nothing is lost.
 */
export interface OrderAmounts {
  // All in cents, mirroring Stripe's own units.
  shippingCents: number
  taxCents: number
  amountPaidCents: number
}

/**
 * Customs descriptions must be plain and specific — "artwork" or "gift" invites
 * inspection and delay. Keep it concrete about what is physically in the box.
 */
function customsDescription(i: OrderItemRow): string {
  if (i.media_type === 'simple') return i.title_snapshot || 'Printed calendar'
  const medium = i.media_type === 'pod_canvas' ? 'canvas' : 'paper'
  return `Unframed art print on ${medium}${i.size ? ` (${i.size} in)` : ''}`
}

export async function sendFulfillableOrderToShipStation(
  orderId: string,
  fulfillItems: OrderItemRow[],
  shipping: ShippingInfo,
  amounts: OrderAmounts,
): Promise<void> {
  if (fulfillItems.length === 0) return

  const config = useRuntimeConfig()
  const key = config.shipstationApiKey as string | undefined
  const secret = config.shipstationApiSecret as string | undefined

  // International (currently Canada only) requires a customs declaration or
  // ShipStation cannot produce a label. Art City adds the package weight at
  // ship time; everything else has to come from us.
  const destCountry = (shipping.address?.country ?? 'US').toUpperCase()
  const isInternational = destCountry !== 'US'

  const payload: Record<string, unknown> = {
    orderNumber: orderId,
    orderDate: new Date().toISOString(),
    orderStatus: 'awaiting_shipment',
    // Order-level totals, not per-item — same across the whole order even if
    // it also included an original (which doesn't ship via ShipStation), so
    // this can overstate shipping/tax slightly for a mixed original+print cart.
    amountPaid: Number(dollars(amounts.amountPaidCents)),
    taxAmount: Number(dollars(amounts.taxCents)),
    shippingAmount: Number(dollars(amounts.shippingCents)),
    billTo: { name: shipping.name ?? null },
    shipTo: {
      name: shipping.name ?? null,
      street1: shipping.address?.line1 ?? null,
      street2: shipping.address?.line2 ?? null,
      city: shipping.address?.city ?? null,
      state: shipping.address?.state ?? null,
      postalCode: shipping.address?.postal_code ?? null,
      country: shipping.address?.country ?? 'US',
    },
    items: fulfillItems.map((i) => ({
      // Simple products (calendars/cards/gifts) ship under the SKU set in
      // Sanity. Prints keep the historical composite SKU.
      sku:
        i.sku_snapshot ??
        [i.sanity_product_id, i.media_type, i.size, i.frame_id].filter(Boolean).join('|'),
      name: [
        i.title_snapshot,
        i.size,
        i.frame_name_snapshot ? `Frame: ${i.frame_name_snapshot}` : null,
      ]
        .filter(Boolean)
        .join(' · '),
      quantity: i.quantity,
      unitPrice: Number(dollars(i.unit_price)),
    })),
  }

  if (isInternational) {
    payload.internationalOptions = {
      contents: 'merchandise',
      nonDelivery: 'return_to_sender',
      customsItems: fulfillItems.map((i) => ({
        description: customsDescription(i),
        quantity: i.quantity,
        value: Number(dollars(i.unit_price)),
        // US-origin goods enter Canada duty-free under CUSMA — worth declaring
        // accurately, it's often the difference between $0 and a bill.
        countryOfOrigin: 'US',
        harmonizedTariffCode: i.media_type === 'simple' ? '4910.00' : '4911.91',
      })),
    }
  }

  if (!key || !secret) {
    // Serialize rather than passing the object: console.* only inspects two
    // levels deep, which would hide `items` and `customsItems` — the whole
    // reason this log exists.
    console.warn(
      '[fulfillment:shipstation] ShipStation not configured — fulfillment PENDING manual handling',
      `\norderId: ${orderId}\n${JSON.stringify(payload, null, 2)}`,
    )
    return
  }

  const auth = Buffer.from(`${key}:${secret}`).toString('base64')
  const res = await fetch('https://ssapi.shipstation.com/orders/createorder', {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    console.error('[fulfillment:shipstation] createorder failed', {
      orderId,
      status: res.status,
      body: text,
    })
    throw new Error(`ShipStation createorder failed (${res.status})`)
  }

  console.log('[fulfillment:shipstation] order created', { orderId })
}

const MEDIA_TYPE_LABEL: Record<OrderItemRow['media_type'], string> = {
  original: 'Original Painting',
  open_edition: 'Open Edition Print',
  pod_paper: 'Custom Print',
  pod_canvas: 'Custom Canvas',
  simple: '',
}

/**
 * Emails the customer an itemized order confirmation covering every item in
 * the order, regardless of type. Best-effort, same as the other handlers
 * here — a failure is logged, never thrown, so it can't undo the order
 * confirmation or block fulfillment.
 */
export async function sendOrderConfirmationEmail(
  orderId: string,
  items: OrderItemRow[],
  shipping: ShippingInfo,
  amounts: OrderAmounts,
): Promise<void> {
  if (!shipping.email) {
    console.warn('[email:order-confirmation] no customer email on order, skipping', { orderId })
    return
  }

  const config = useRuntimeConfig()

  const itemLines = items.map((i) => {
    const detail = [MEDIA_TYPE_LABEL[i.media_type] || null, i.size, i.frame_name_snapshot ? `Frame: ${i.frame_name_snapshot}` : null]
      .filter(Boolean)
      .join(' · ')
    const qtyPrefix = i.quantity > 1 ? `${i.quantity} × ` : ''
    return `${qtyPrefix}${i.title_snapshot}${detail ? ` (${detail})` : ''} — $${dollars(i.unit_price * i.quantity)}`
  })

  const merchandiseCents = items.reduce((sum, i) => sum + i.unit_price * i.quantity, 0)

  const addressLines = [
    shipping.name,
    shipping.address?.line1,
    shipping.address?.line2,
    [shipping.address?.city, shipping.address?.state, shipping.address?.postal_code]
      .filter(Boolean)
      .join(', '),
    shipping.address?.country,
  ].filter(Boolean)

  const lines = [
    'Thank you for your order from Robert Duncan Fine Art!',
    '',
    `Order: ${orderId}`,
    '',
    ...itemLines,
    '',
    `Subtotal: $${dollars(merchandiseCents)}`,
    `Shipping: $${dollars(amounts.shippingCents)}`,
    ...(amounts.taxCents > 0 ? [`Tax: $${dollars(amounts.taxCents)}`] : []),
    `Total: $${dollars(amounts.amountPaidCents)}`,
    '',
    'Shipping to:',
    ...addressLines,
    '',
    'Questions about your order? Just reply to this email.',
  ].join('\n')

  await sendEmail({
    to: shipping.email,
    subject: 'Your Robert Duncan Fine Art order confirmation',
    text: lines,
    from: config.resendFromEmailOrders as string | undefined,
    replyTo: config.contactEmail as string | undefined,
  }).catch((err) => {
    console.error('[email:order-confirmation] send failed', { orderId, err })
  })
}
