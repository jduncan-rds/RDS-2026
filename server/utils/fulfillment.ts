/**
 * Phase 7 fulfillment routing.
 *
 * A paid order may mix prints (drop-shipped by Art City via ShipStation) and
 * originals (shipped by Robert himself). The webhook splits the order and
 * calls the right handler for each part. Both handlers are intentionally
 * best-effort + heavily logged: the durable record is the Supabase order row,
 * and fulfillment can be re-driven from there if a downstream call fails.
 */

export interface OrderItemRow {
  id: string
  sanity_product_id: string
  title_snapshot: string
  media_type: 'original' | 'open_edition' | 'pod_paper' | 'pod_canvas'
  size: string | null
  frame_id: string | null
  quantity: number
  unit_price: number // cents
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
 * Notify Robert that an original sold (he ships these himself).
 * STUBBED: structured log for now. Wire Resend here when email is set up —
 * config.ordersNotifyEmail is the destination.
 */
export function notifyOriginalPurchase(
  orderId: string,
  item: OrderItemRow,
  shipping: ShippingInfo,
): void {
  const config = useRuntimeConfig()
  console.log('[fulfillment:original] NEW ORIGINAL SALE — Robert to ship', {
    orderId,
    notifyTo: config.ordersNotifyEmail || '(ORDERS_NOTIFY_EMAIL unset)',
    title: item.title_snapshot,
    price: `$${dollars(item.unit_price)}`,
    buyer: shipping.email,
    shipTo: shipping.name,
    address: shipping.address,
  })
  // TODO(email): when Resend is configured, send an email to
  // config.ordersNotifyEmail with these details instead of just logging.
}

/**
 * Route print items to Art City via ShipStation's createorder API.
 * If ShipStation credentials are absent, log the payload that *would* have
 * been sent so the order can be placed manually and nothing is lost.
 */
export async function sendPrintOrderToShipStation(
  orderId: string,
  printItems: OrderItemRow[],
  shipping: ShippingInfo,
): Promise<void> {
  if (printItems.length === 0) return

  const config = useRuntimeConfig()
  const key = config.shipstationApiKey as string | undefined
  const secret = config.shipstationApiSecret as string | undefined

  const payload = {
    orderNumber: orderId,
    orderDate: new Date().toISOString(),
    orderStatus: 'awaiting_shipment',
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
    items: printItems.map((i) => ({
      sku: [i.sanity_product_id, i.media_type, i.size, i.frame_id].filter(Boolean).join('|'),
      name: [i.title_snapshot, i.size].filter(Boolean).join(' · '),
      quantity: i.quantity,
      unitPrice: Number(dollars(i.unit_price)),
    })),
  }

  if (!key || !secret) {
    console.warn(
      '[fulfillment:print] ShipStation not configured — print fulfillment PENDING manual handling',
      { orderId, payload },
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
    console.error('[fulfillment:print] ShipStation createorder failed', {
      orderId,
      status: res.status,
      body: text,
    })
    throw new Error(`ShipStation createorder failed (${res.status})`)
  }

  console.log('[fulfillment:print] ShipStation order created', { orderId })
}
