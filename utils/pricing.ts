export interface PricingRules {
  openEditionRatePerSqIn: number
  podPaperRatePerSqIn: number
  podCanvasRatePerSqIn: number
  openEditionMinPrice: number
  podPaperMinPrice: number
  podCanvasMinPrice: number
  roundTo: number
}

export interface FramePricingData {
  priceModifier: number
  frameRateType?: 'flat' | 'per_sq_in'
  ratePerSqIn?: number
}

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

export type PrintMediaType = 'open_edition' | 'pod_paper' | 'pod_canvas'

export function computeVariantPrice(
  mediaType: PrintMediaType,
  size: string,
  rules: PricingRules,
  priceOverride?: number | null,
): number | null {
  if (priceOverride != null && priceOverride > 0) return priceOverride

  const area = sqIn(size)
  if (area === null) return null

  let rate: number
  let min: number

  if (mediaType === 'open_edition') {
    rate = rules.openEditionRatePerSqIn
    min = rules.openEditionMinPrice
  } else if (mediaType === 'pod_paper') {
    rate = rules.podPaperRatePerSqIn
    min = rules.podPaperMinPrice
  } else {
    rate = rules.podCanvasRatePerSqIn
    min = rules.podCanvasMinPrice
  }

  if (!rate || rate <= 0) return null

  const computed = area * rate
  const floored = Math.max(computed, min)
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
): number {
  if (!frame) return 0

  if (frame.frameRateType === 'per_sq_in' && frame.ratePerSqIn && size) {
    const area = sqIn(size)
    if (area !== null) return area * frame.ratePerSqIn
  }

  return frame.priceModifier ?? 0
}
