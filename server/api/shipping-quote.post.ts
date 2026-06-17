import { createSanityClient } from '../utils/sanity'
import { computeShippingCents, type ShippingQuoteLine } from '../utils/shipping'
import { isValidState } from '../../utils/shipping'

/**
 * Shipping preview for the cart page. Prices are recomputed authoritatively at
 * checkout — this is display-only, so it trusts the client unit prices (used
 * just for the free-shipping threshold).
 */
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const state: string = body?.state
  const items = body?.items

  if (!isValidState(state)) {
    throw createError({ statusCode: 400, statusMessage: 'A valid US state is required.' })
  }
  if (!Array.isArray(items)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid cart.' })
  }

  const lines: ShippingQuoteLine[] = items.map((i: any) => ({
    productId: i.productId,
    size: i.size ?? null,
    mediaType: i.mediaType,
    quantity: Number(i.quantity) || 1,
    unitPriceDollars: Number(i.unitPrice) || 0,
  }))

  const sanity = createSanityClient()
  const { cents } = await computeShippingCents(sanity, lines, state)
  return { shippingCents: cents }
})
