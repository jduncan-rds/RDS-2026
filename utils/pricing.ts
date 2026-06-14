export interface BandRates {
  openEditionRatePerSqIn?: number
  openEditionMinPrice?: number
  podPaperRatePerSqIn?: number
  podPaperMinPrice?: number
  podCanvasRatePerSqIn?: number
  podCanvasMinPrice?: number
}

export interface PricingRules {
  // Size-band thresholds (square inches). A: area ≤ bandAMaxSqIn,
  // B: ≤ bandBMaxSqIn, C: everything larger.
  bandAMaxSqIn?: number
  bandBMaxSqIn?: number
  bandA?: BandRates
  bandB?: BandRates
  bandC?: BandRates
  roundTo: number

  // --- Legacy (pre-band) single-rate fields. Kept optional so pricing keeps
  // working during/after rollout if the band fields aren't populated yet. ---
  openEditionRatePerSqIn?: number
  podPaperRatePerSqIn?: number
  podCanvasRatePerSqIn?: number
  openEditionMinPrice?: number
  podPaperMinPrice?: number
  podCanvasMinPrice?: number
}

export interface FramePricingData {
  priceModifier?: number
  frameRateType?: 'flat' | 'per_sq_in'
  // Per-band per-sq-in rates.
  ratePerSqInA?: number
  ratePerSqInB?: number
  ratePerSqInC?: number
  // Legacy single per-sq-in rate (fallback during/after rollout).
  ratePerSqIn?: number
}

export type BandKey = 'A' | 'B' | 'C'
export type PrintMediaType = 'open_edition' | 'pod_paper' | 'pod_canvas'

export function parseSize(size: string): { w: number; h: number } | null {
  if (typeof size !== 'string') return null
  const normalized = size.replace(/"/g, '').replace(/×/g, 'x').toLowerCase().trim()
  const parts = normalized.split(/\s*x\s*/)
  if (parts.length !== 2) return null

  // Each dimension must be a clean decimal — no fractions ("3/8"), mixed
  // numbers ("14 3/8"), or trailing text. parseFloat would silently read
  // "14 3/8" as 14, so we reject anything that isn't a bare number rather
  // than let a wrong size flow into a real price.
  const decimal = /^\d+(\.\d+)?$/
  const rawW = parts[0].trim()
  const rawH = parts[1].trim()
  if (!decimal.test(rawW) || !decimal.test(rawH)) return null

  const w = parseFloat(rawW)
  const h = parseFloat(rawH)
  if (w <= 0 || h <= 0 || w > 120 || h > 120) return null
  return { w, h }
}

export function sqIn(size: string): number | null {
  const parsed = parseSize(size)
  return parsed ? parsed.w * parsed.h : null
}

function roundToNearest(value: number, nearest: number): number {
  return Math.round(value / nearest) * nearest
}

/**
 * Which size band an area falls into, given the rules' thresholds.
 * Defaults to 250 / 500 if thresholds are missing.
 */
export function selectBandKey(rules: PricingRules, area: number): BandKey {
  const aMax = rules.bandAMaxSqIn ?? 250
  const bMax = rules.bandBMaxSqIn ?? 500
  if (area <= aMax) return 'A'
  if (area <= bMax) return 'B'
  return 'C'
}

/**
 * Resolve the band rate object for a given area. If the band fields haven't
 * been populated (e.g. mid-rollout), synthesize a band from the legacy
 * single-rate fields so pricing keeps working unchanged.
 */
function resolveBandRates(rules: PricingRules, area: number): BandRates {
  const hasBands = !!(rules.bandA || rules.bandB || rules.bandC)
  if (!hasBands) {
    return {
      openEditionRatePerSqIn: rules.openEditionRatePerSqIn,
      openEditionMinPrice: rules.openEditionMinPrice,
      podPaperRatePerSqIn: rules.podPaperRatePerSqIn,
      podPaperMinPrice: rules.podPaperMinPrice,
      podCanvasRatePerSqIn: rules.podCanvasRatePerSqIn,
      podCanvasMinPrice: rules.podCanvasMinPrice,
    }
  }
  const key = selectBandKey(rules, area)
  return (key === 'A' ? rules.bandA : key === 'B' ? rules.bandB : rules.bandC) ?? {}
}

export function computeVariantPrice(
  mediaType: PrintMediaType,
  size: string,
  rules: PricingRules,
  priceOverride?: number | null,
): number | null {
  if (priceOverride != null && priceOverride > 0) return priceOverride

  const area = sqIn(size)
  if (area === null) return null

  const band = resolveBandRates(rules, area)

  let rate: number | undefined
  let min: number | undefined

  if (mediaType === 'open_edition') {
    rate = band.openEditionRatePerSqIn
    min = band.openEditionMinPrice
  } else if (mediaType === 'pod_paper') {
    rate = band.podPaperRatePerSqIn
    min = band.podPaperMinPrice
  } else {
    rate = band.podCanvasRatePerSqIn
    min = band.podCanvasMinPrice
  }

  if (!rate || rate <= 0) return null

  const computed = area * rate
  const floored = Math.max(computed, min ?? 0)
  return roundToNearest(floored, rules.roundTo || 1)
}

/**
 * Final per-unit print price = base variant price + frame modifier, rounded
 * UP to the next whole dollar so customers never see odd cents (e.g. the
 * per-sq-in frame charge turning $329.75 into $330). Used by both the product
 * page display and the authoritative server checkout so they stay in sync.
 */
export function computePrintTotal(base: number, frameModifier: number): number {
  return Math.ceil(base + frameModifier)
}

export function computeFrameModifier(
  frame: FramePricingData | null,
  size: string | null,
  rules: PricingRules | null,
): number {
  if (!frame) return 0

  if (frame.frameRateType === 'per_sq_in' && size) {
    const area = sqIn(size)
    if (area !== null) {
      // Prefer the per-band rate; fall back to the legacy single rate so
      // pricing keeps working before band rates are filled in.
      let rate: number | undefined = frame.ratePerSqIn
      if (rules) {
        const key = selectBandKey(rules, area)
        const banded =
          key === 'A' ? frame.ratePerSqInA : key === 'B' ? frame.ratePerSqInB : frame.ratePerSqInC
        if (banded && banded > 0) rate = banded
      }
      if (rate && rate > 0) return area * rate
    }
  }

  return frame.priceModifier ?? 0
}
