import { createSanityClient } from '../utils/sanity'
import { computeShippingCents, type ShippingQuoteLine } from '../utils/shipping'
import { isValidDestination } from '../../utils/shipping'

/**
 * Shipping preview for the cart page. Prices are recomputed authoritatively at
 * checkout — this is display-only, so it trusts the client unit prices (used
 * just for the free-shipping threshold).
 *
 * For Canada it also returns `ineligible`: originals and framed pieces are
 * US-only, and any size without a Zone 4 rate is treated as not offered. The
 * cart uses this to block checkout until those items are removed; the checkout
 * endpoint enforces the same rule authoritatively.
 */
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const country: string = (body?.country ?? 'US').toUpperCase()
  const region: string = body?.state
  const items = body?.items

  if (!isValidDestination(country, region)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'A valid shipping state or province is required.',
    })
  }
  if (!Array.isArray(items)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid cart.' })
  }

  const lines: ShippingQuoteLine[] = items.map((i: any) => ({
    productId: i.productId,
    size: i.size ?? null,
    mediaType: i.mediaType,
    frameId: i.frameId ?? null,
    quantity: Number(i.quantity) || 1,
    unitPriceDollars: Number(i.unitPrice) || 0,
    title: i.title ?? null,
  }))

  const sanity = createSanityClient()
  const { cents, ineligible, canadaEnabled } = await computeShippingCents(
    sanity,
    lines,
    country,
    region,
  )

  // Canada is refused entirely until Robert turns it on in Sanity (after the
  // Zone 4 rates are filled in).
  if (country === 'CA' && !canadaEnabled) {
    throw createError({
      statusCode: 400,
      statusMessage: 'We are not shipping to Canada at this time.',
    })
  }

  return { shippingCents: cents, ineligible }
})
