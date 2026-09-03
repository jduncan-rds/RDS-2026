import { sqIn, selectBandKey, type PricingRules } from './pricing'

/** Zones 1–3 are US distance bands from Utah. Zone 4 is all of Canada. */
export type ShippingZone = 1 | 2 | 3 | 4

export type ShippingCountry = 'US' | 'CA'

export interface ShippingZoneRow {
  zone1?: number
  zone2?: number
  zone3?: number
  zone4?: number
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
  /** Master switch. Canada is refused everywhere until this is turned on. */
  canadaEnabled?: boolean
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

/** Canadian provinces + territories. All map to zone 4 — Canada is one zone. */
export const CA_PROVINCES: { code: string; name: string }[] = [
  { code: 'AB', name: 'Alberta' }, { code: 'BC', name: 'British Columbia' },
  { code: 'MB', name: 'Manitoba' }, { code: 'NB', name: 'New Brunswick' },
  { code: 'NL', name: 'Newfoundland and Labrador' }, { code: 'NT', name: 'Northwest Territories' },
  { code: 'NS', name: 'Nova Scotia' }, { code: 'NU', name: 'Nunavut' },
  { code: 'ON', name: 'Ontario' }, { code: 'PE', name: 'Prince Edward Island' },
  { code: 'QC', name: 'Quebec' }, { code: 'SK', name: 'Saskatchewan' },
  { code: 'YT', name: 'Yukon' },
]

const CA_PROVINCE_CODES = new Set(CA_PROVINCES.map((p) => p.code))

export function isValidState(code: string | null | undefined): boolean {
  return !!code && code.toUpperCase() in ZONE_BY_STATE
}

export function isValidProvince(code: string | null | undefined): boolean {
  return !!code && CA_PROVINCE_CODES.has(code.toUpperCase())
}

/** Validates a region code against its country. */
export function isValidDestination(
  country: string | null | undefined,
  region: string | null | undefined,
): boolean {
  const c = (country ?? 'US').toUpperCase()
  if (c === 'CA') return isValidProvince(region)
  if (c === 'US') return isValidState(region)
  return false
}

/** Map a state code to its zone. Unknown → farthest (3), a safe over-charge. */
export function stateToZone(state: string): ShippingZone {
  return ZONE_BY_STATE[state?.toUpperCase()] ?? 3
}

/**
 * Destination → zone. Every Canadian province is zone 4, so the province a
 * customer picks never changes the price (and can't be gamed).
 */
export function destinationToZone(
  country: string | null | undefined,
  region: string,
): ShippingZone {
  return (country ?? 'US').toUpperCase() === 'CA' ? 4 : stateToZone(region)
}

/**
 * Can this line ship to Canada? Originals (high declared value, art-specific
 * customs) and framed prints/canvas are US-only. Unframed prints and simple
 * goods (calendars/cards/gifts) are eligible.
 *
 * NB: deliberately keyed off mediaType rather than ShippingClass — that type
 * lumps originals and simple goods together as 'other'.
 */
export const CANADA_FRAMEABLE_MEDIA = new Set(['open_edition', 'pod_paper', 'pod_canvas'])

export function canShipToCanada(mediaType: string, frameId: string | null | undefined): boolean {
  if (mediaType === 'original') return false
  if (CANADA_FRAMEABLE_MEDIA.has(mediaType) && frameId) return false
  return true
}

/**
 * Zone amount for a row. Returns null when the cell is unset — callers must
 * distinguish "not configured" from "free". For zone 4 an unset cell means the
 * band is not offered to Canada; treating it as 0 would ship at a loss.
 */
function zoneAmount(row: ShippingZoneRow, zone: ShippingZone): number | null {
  const v = zone === 1 ? row.zone1 : zone === 2 ? row.zone2 : zone === 3 ? row.zone3 : row.zone4
  return v == null ? null : v
}

function zoneCost(row: ShippingZoneRow, zone: ShippingZone): number {
  return zoneAmount(row, zone) ?? 0
}

/** Resolves the rate row a line draws from, after all band fallbacks. */
function rowForLine(
  line: ShippingLineInput,
  rates: ShippingRates,
  rules: PricingRules,
): ShippingZoneRow {
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
  if (line.shippingClass !== 'unframed_print') return framedRow

  const unframedRow =
    key === 'A'
      ? rates.bandAUnframed
      : key === 'B'
        ? rates.bandBUnframed
        : key === 'C'
          ? rates.bandCUnframed
          : rates.bandDUnframed ?? rates.bandCUnframed
  return unframedRow ?? framedRow
}

/**
 * True when this line has no configured rate for the zone. Only meaningful for
 * zone 4: a blank Canada cell means the band isn't offered there, NOT that it
 * ships free. A per-product shippingOverride satisfies the requirement.
 */
export function isRateMissingForZone(
  line: ShippingLineInput,
  rates: ShippingRates | null,
  rules: PricingRules | null,
  zone: ShippingZone,
): boolean {
  if (!rates || !rules) return true
  if (zone !== 4 && line.shippingOverrideDollars != null && line.shippingOverrideDollars >= 0) {
    return false
  }
  const amount = zoneAmount(rowForLine(line, rates, rules), zone)
  return amount == null || amount <= 0
}

/**
 * Per-unit shipping in dollars for one line.
 *
 * A per-product Shipping Override is a DOMESTIC decision — it was set against
 * US costs — so it is deliberately ignored for zone 4. Canada always prices off
 * the Zone 4 matrix, and a product with an override but no Zone 4 rate is
 * reported ineligible rather than shipped at the domestic price.
 */
function perUnitShipping(
  line: ShippingLineInput,
  rates: ShippingRates,
  rules: PricingRules,
  zone: ShippingZone,
): number {
  if (zone !== 4 && line.shippingOverrideDollars != null && line.shippingOverrideDollars >= 0) {
    return line.shippingOverrideDollars
  }
  return zoneCost(rowForLine(line, rates, rules), zone)
}

/**
 * Canada only: anything larger than Band B (16x20 = 320 sq in, Band B tops out
 * at 385) ships rolled in its own tube and can't share a package. Band A/B
 * prints and simple goods all fit one flat mailer together.
 *
 * Items without a size (calendars/cards/gifts) always travel in the flat mailer.
 */
function needsOwnPackageToCanada(line: ShippingLineInput, rules: PricingRules): boolean {
  const sizeStr = line.size ?? line.fallbackSize ?? null
  const area = sizeStr ? sqIn(sizeStr) : null
  if (area == null) return false
  const key = selectBandKey(rules, area)
  return key === 'C' || key === 'D'
}

/**
 * Total order shipping in dollars. Free when the merchandise subtotal meets the
 * free-shipping threshold. Otherwise splits the order into two groups and adds
 * their totals:
 *  - Own-package items — every unit's own shipping cost is summed. Framed
 *    prints/canvas anywhere, plus (Canada only) anything above Band B, which
 *    needs its own tube.
 *  - Everything else — the single highest-shipping item in the group, plus the
 *    per-additional-item fee for every other unit. These share one package.
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

  // Expand each line by quantity, bucketed by whether it travels alone.
  const ownPackageCosts: number[] = []
  const otherCosts: number[] = []
  for (const line of lines) {
    const cost = perUnitShipping(line, rates, rules, zone)
    const ownPackage =
      line.shippingClass === 'framed_print' ||
      (zone === 4 && needsOwnPackageToCanada(line, rules))
    const bucket = ownPackage ? ownPackageCosts : otherCosts
    for (let i = 0; i < line.quantity; i++) bucket.push(cost)
  }

  const ownPackageTotal = ownPackageCosts.reduce((sum, cost) => sum + cost, 0)

  let otherTotal = 0
  if (otherCosts.length) {
    const highest = Math.max(...otherCosts)
    const extraUnits = otherCosts.length - 1
    const perExtra = rates.perAdditionalItem ?? 0
    otherTotal = highest + extraUnits * perExtra
  }

  return ownPackageTotal + otherTotal
}
