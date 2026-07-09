import { sqIn, selectBandKey, type PricingRules } from './pricing'

export type ShippingZone = 1 | 2 | 3

export interface ShippingZoneRow {
  zone1?: number
  zone2?: number
  zone3?: number
}

export interface ShippingRates {
  bandA?: ShippingZoneRow
  bandAUnframed?: ShippingZoneRow
  bandB?: ShippingZoneRow
  bandBUnframed?: ShippingZoneRow
  bandC?: ShippingZoneRow
  bandCUnframed?: ShippingZoneRow
  bandD?: ShippingZoneRow
  bandDUnframed?: ShippingZoneRow
  perAdditionalItem?: number
  freeShippingThreshold?: number
}

/**
 * Classifies a cart line for shipping purposes:
 *  - 'framed_print': a print/canvas with a frame. Uses the band's default row;
 *    every unit's cost is summed into the order total (no per-additional fee).
 *  - 'unframed_print': a print/canvas with no frame. Uses the band's Unframed
 *    row; grouped with 'other' for highest-item + per-additional-item.
 *  - 'other' (default): originals and calendars/cards/gifts. Uses the band's
 *    default row; grouped with 'unframed_print' for highest-item + per-additional-item.
 */
export type ShippingClass = 'framed_print' | 'unframed_print' | 'other'

/** One cart line as far as shipping cares. Dollars, not cents. */
export interface ShippingLineInput {
  size: string | null
  quantity: number
  unitPriceDollars: number
  // Per-product flat override (>= 0 wins, including 0 = free). Blank = calculate.
  shippingOverrideDollars?: number | null
  // For items without a variant size (originals): the artwork's dimensions
  // string, used to pick a size band. Simple goods have neither → Band A.
  fallbackSize?: string | null
  shippingClass?: ShippingClass
}

/** US states + DC for the checkout dropdown. */
export const US_STATES: { code: string; name: string }[] = [
  { code: 'AL', name: 'Alabama' }, { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' }, { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' }, { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' }, { code: 'DE', name: 'Delaware' },
  { code: 'DC', name: 'District of Columbia' }, { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' }, { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' }, { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' }, { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' }, { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' }, { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' }, { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' }, { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' }, { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' }, { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' }, { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' }, { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' }, { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' }, { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' }, { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' }, { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' }, { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' }, { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' }, { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' }, { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' }, { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
]

// Destination zones by distance from Utah (the shipping origin). Adjust here if
// the zone groupings ever need to change — amounts live in Sanity, zones in code.
const ZONE_BY_STATE: Record<string, ShippingZone> = {}
;(['UT', 'ID', 'WY', 'NV', 'AZ', 'CO', 'NM'] as const).forEach((s) => (ZONE_BY_STATE[s] = 1))
;(['CA', 'OR', 'WA', 'MT', 'ND', 'SD', 'NE', 'KS', 'OK', 'TX', 'MN', 'IA', 'MO', 'AR', 'LA'] as const).forEach(
  (s) => (ZONE_BY_STATE[s] = 2),
)
;(['WI', 'IL', 'MI', 'IN', 'OH', 'KY', 'TN', 'MS', 'AL', 'GA', 'FL', 'SC', 'NC', 'VA', 'WV', 'MD', 'DE', 'DC', 'PA', 'NJ', 'NY', 'CT', 'RI', 'MA', 'VT', 'NH', 'ME', 'AK', 'HI'] as const).forEach(
  (s) => (ZONE_BY_STATE[s] = 3),
)

export function isValidState(code: string | null | undefined): boolean {
  return !!code && code.toUpperCase() in ZONE_BY_STATE
}

/** Map a state code to its zone. Unknown → farthest (3), a safe over-charge. */
export function stateToZone(state: string): ShippingZone {
  return ZONE_BY_STATE[state?.toUpperCase()] ?? 3
}

function zoneCost(row: ShippingZoneRow, zone: ShippingZone): number {
  return (zone === 1 ? row.zone1 : zone === 2 ? row.zone2 : row.zone3) ?? 0
}

/** Per-unit shipping in dollars for one line (override wins, else size×zone). */
function perUnitShipping(
  line: ShippingLineInput,
  rates: ShippingRates,
  rules: PricingRules,
  zone: ShippingZone,
): number {
  if (line.shippingOverrideDollars != null && line.shippingOverrideDollars >= 0) {
    return line.shippingOverrideDollars
  }
  const sizeStr = line.size ?? line.fallbackSize ?? null
  const area = sizeStr ? sqIn(sizeStr) : null
  // No usable size → smallest band.
  const key = area != null ? selectBandKey(rules, area) : 'A'
  // Band D falls back to Band C's row until a dedicated Band D row is set,
  // so shipping keeps working unchanged through the pricing rollout. Same
  // fallback for Unframed: an empty Unframed row reuses the band's default row.
  const framedRow =
    (key === 'A'
      ? rates.bandA
      : key === 'B'
        ? rates.bandB
        : key === 'C'
          ? rates.bandC
          : rates.bandD ?? rates.bandC) ?? {}
  if (line.shippingClass !== 'unframed_print') return zoneCost(framedRow, zone)

  const unframedRow =
    key === 'A'
      ? rates.bandAUnframed
      : key === 'B'
        ? rates.bandBUnframed
        : key === 'C'
          ? rates.bandCUnframed
          : rates.bandDUnframed ?? rates.bandCUnframed
  return zoneCost(unframedRow ?? framedRow, zone)
}

/**
 * Total order shipping in dollars. Free when the merchandise subtotal meets the
 * free-shipping threshold. Otherwise splits the order into two groups (see
 * ShippingClass) and adds their totals:
 *  - Framed prints/canvas: every unit's own shipping cost is summed.
 *  - Everything else (unframed prints/canvas, originals, simple goods): the
 *    single highest-shipping item in the group, plus the per-additional-item
 *    fee for every other unit in the group.
 */
export function computeOrderShippingDollars(
  lines: ShippingLineInput[],
  rates: ShippingRates | null,
  rules: PricingRules | null,
  zone: ShippingZone,
): number {
  if (!rates || !rules || !lines.length) return 0

  const subtotal = lines.reduce((s, l) => s + l.unitPriceDollars * l.quantity, 0)
  const threshold = rates.freeShippingThreshold
  if (threshold && threshold > 0 && subtotal >= threshold) return 0

  // Expand each line by quantity, bucketed by shipping group.
  const framedCosts: number[] = []
  const otherCosts: number[] = []
  for (const line of lines) {
    const cost = perUnitShipping(line, rates, rules, zone)
    const bucket = line.shippingClass === 'framed_print' ? framedCosts : otherCosts
    for (let i = 0; i < line.quantity; i++) bucket.push(cost)
  }

  const framedTotal = framedCosts.reduce((sum, cost) => sum + cost, 0)

  let otherTotal = 0
  if (otherCosts.length) {
    const highest = Math.max(...otherCosts)
    const extraUnits = otherCosts.length - 1
    const perExtra = rates.perAdditionalItem ?? 0
    otherTotal = highest + extraUnits * perExtra
  }

  return framedTotal + otherTotal
}
