import type { SanityClient } from '@sanity/client'
import {
  canShipToCanada,
  computeOrderShippingDollars,
  destinationToZone,
  isRateMissingForZone,
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
  /** For messaging only — which item the customer needs to remove. */
  title?: string | null
}

/** Why a line can't ship to the chosen destination. */
export interface IneligibleLine {
  productId: string
  title: string | null
  reason: 'original' | 'framed' | 'no_rate'
}

export interface ShippingResult {
  cents: number
  zone: ShippingZone
  /** Non-empty only for Canada. Any entry means checkout must be blocked. */
  ineligible: IneligibleLine[]
  canadaEnabled: boolean
}

const FRAMEABLE_MEDIA_TYPES = new Set(['open_edition', 'pod_paper', 'pod_canvas'])

/**
 * Authoritative shipping cost (in cents) for an order to a given destination.
 * Resolves each line's per-product shipping override and, for originals, the
 * artwork dimensions used to pick a size band — then applies the shared
 * size-band × zone matrix. Used by both the cart quote and checkout so the
 * preview and the charge always match.
 *
 * For Canada it additionally reports which lines are ineligible: originals and
 * framed prints are US-only, and any size whose Zone 4 rate is unset is treated
 * as "not offered" rather than free.
 */
export async function computeShippingCents(
  sanity: SanityClient,
  lines: ShippingQuoteLine[],
  country: string,
  region: string,
): Promise<ShippingResult> {
  const isCanada = (country ?? 'US').toUpperCase() === 'CA'
  const zone = destinationToZone(country, region)
  if (!lines.length) {
    return { cents: 0, zone, ineligible: [], canadaEnabled: false }
  }

  const productIds = [...new Set(lines.map((l) => l.productId))]
  const [rates, rules, products] = await Promise.all([
    sanity.fetch<ShippingRates | null>(`*[_id == "shippingRates"][0]`),
    sanity.fetch<PricingRules | null>(`*[_id == "pricingRules"][0]`),
    sanity.fetch<
      { _id: string; shippingOverride: number | null; dims: string | null; title: string | null }[]
    >(
      `*[_type == "product" && _id in $ids]{
        _id, shippingOverride,
        "dims": artwork->dimensions,
        "title": artwork->title
      }`,
      { ids: productIds },
    ),
  ])

  const byId = Object.fromEntries(products.map((p) => [p._id, p]))
  const canadaEnabled = rates?.canadaEnabled === true

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

  const ineligible: IneligibleLine[] = []
  if (isCanada) {
    lines.forEach((l, i) => {
      const title = l.title ?? byId[l.productId]?.title ?? null
      if (!canShipToCanada(l.mediaType, l.frameId)) {
        ineligible.push({
          productId: l.productId,
          title,
          reason: l.mediaType === 'original' ? 'original' : 'framed',
        })
        return
      }
      // Eligible by type, but this size has no Canada rate configured — treat
      // as not offered rather than shipping it for free.
      if (isRateMissingForZone(shippingLines[i], rates, rules, zone)) {
        ineligible.push({ productId: l.productId, title, reason: 'no_rate' })
      }
    })
  }

  const dollars = computeOrderShippingDollars(shippingLines, rates, rules, zone)
  return { cents: Math.round(dollars * 100), zone, ineligible, canadaEnabled }
}
