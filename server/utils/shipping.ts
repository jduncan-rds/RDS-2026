import type { SanityClient } from '@sanity/client'
import {
  computeOrderShippingDollars,
  stateToZone,
  type ShippingClass,
  type ShippingLineInput,
  type ShippingRates,
  type ShippingZone,
} from '../../utils/shipping'
import type { PricingRules } from '../../utils/pricing'

export interface ShippingQuoteLine {
  productId: string
  size: string | null
  mediaType: string
  frameId: string | null
  quantity: number
  unitPriceDollars: number
}

const FRAMEABLE_MEDIA_TYPES = new Set(['open_edition', 'pod_paper', 'pod_canvas'])

/**
 * Authoritative shipping cost (in cents) for an order to a given US state.
 * Resolves each line's per-product shipping override and, for originals, the
 * artwork dimensions used to pick a size band — then applies the shared
 * size-band × zone matrix. Used by both the cart quote and checkout so the
 * preview and the charge always match.
 */
export async function computeShippingCents(
  sanity: SanityClient,
  lines: ShippingQuoteLine[],
  state: string,
): Promise<{ cents: number; zone: ShippingZone }> {
  const zone = stateToZone(state)
  if (!lines.length) return { cents: 0, zone }

  const productIds = [...new Set(lines.map((l) => l.productId))]
  const [rates, rules, products] = await Promise.all([
    sanity.fetch<ShippingRates | null>(`*[_id == "shippingRates"][0]`),
    sanity.fetch<PricingRules | null>(`*[_id == "pricingRules"][0]`),
    sanity.fetch<{ _id: string; shippingOverride: number | null; dims: string | null }[]>(
      `*[_type == "product" && _id in $ids]{ _id, shippingOverride, "dims": artwork->dimensions }`,
      { ids: productIds },
    ),
  ])

  const byId = Object.fromEntries(products.map((p) => [p._id, p]))

  const shippingLines: ShippingLineInput[] = lines.map((l) => {
    const p = byId[l.productId]
    const shippingClass: ShippingClass = !FRAMEABLE_MEDIA_TYPES.has(l.mediaType)
      ? 'other'
      : l.frameId
        ? 'framed_print'
        : 'unframed_print'
    return {
      size: l.size,
      quantity: l.quantity,
      unitPriceDollars: l.unitPriceDollars,
      shippingOverrideDollars: p?.shippingOverride ?? null,
      fallbackSize: l.mediaType === 'original' ? (p?.dims ?? null) : null,
      shippingClass,
    }
  })

  const dollars = computeOrderShippingDollars(shippingLines, rates, rules, zone)
  return { cents: Math.round(dollars * 100), zone }
}
