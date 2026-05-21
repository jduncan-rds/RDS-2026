import Stripe from 'stripe'
import { createSanityClient } from '../utils/sanity'
import { computeVariantPrice, computeFrameModifier } from '../../utils/pricing'
import type { PricingRules, FramePricingData, PrintMediaType } from '../../utils/pricing'

interface CartItemPayload {
  productId: string
  artworkSlug: string
  title: string
  imageUrl: string
  mediaType: 'original' | PrintMediaType
  size: string | null
  frameId: string | null
  frameName: string | null
  quantity: number
  unitPrice: number
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const stripe = new Stripe(config.stripeSecretKey as string)
  const sanity = createSanityClient()

  const body = await readBody(event)
  const items: CartItemPayload[] = body?.items

  if (!Array.isArray(items) || items.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Cart is empty.' })
  }

  for (const item of items) {
    if (!item.productId || !item.mediaType || !item.quantity || item.quantity < 1) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid cart item.' })
    }
  }

  // Batch all Sanity fetches
  const productIds = [...new Set(items.map((i) => i.productId))]
  const frameIds = [...new Set(items.map((i) => i.frameId).filter(Boolean) as string[])]

  const [products, frames, rules] = await Promise.all([
    sanity.fetch<any[]>(
      `*[_type == "product" && _id in $ids] { _id, originalPrice, variants[] { mediaType, size, price } }`,
      { ids: productIds },
    ),
    frameIds.length > 0
      ? sanity.fetch<any[]>(
          `*[_type == "frame" && _id in $ids] { _id, priceModifier, frameRateType, ratePerSqIn }`,
          { ids: frameIds },
        )
      : Promise.resolve([] as any[]),
    sanity.fetch<PricingRules>(`*[_id == "pricingRules"][0]`),
  ])

  if (
    !rules?.openEditionRatePerSqIn ||
    !rules?.podPaperRatePerSqIn ||
    !rules?.podCanvasRatePerSqIn
  ) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Pricing configuration is incomplete. Please contact us.',
    })
  }

  const productMap = Object.fromEntries(products.map((p) => [p._id, p]))
  const frameMap = Object.fromEntries(frames.map((f) => [f._id, f]))

  const lineItems = []

  for (const item of items) {
    const product = productMap[item.productId]
    if (!product) {
      throw createError({ statusCode: 400, statusMessage: `Product not found: ${item.title}` })
    }

    let unitAmountCents: number

    if (item.mediaType === 'original') {
      if (!product.originalPrice) {
        throw createError({
          statusCode: 400,
          statusMessage: `Price not set for original: ${item.title}`,
        })
      }
      unitAmountCents = Math.round(product.originalPrice * 100)
    } else {
      if (!item.size) {
        throw createError({ statusCode: 400, statusMessage: `Size required for: ${item.title}` })
      }

      const variant = product.variants?.find(
        (v: any) => v.mediaType === item.mediaType && v.size === item.size,
      )

      const base = computeVariantPrice(
        item.mediaType as PrintMediaType,
        item.size,
        rules,
        variant?.price,
      )

      if (base === null) {
        throw createError({
          statusCode: 400,
          statusMessage: `Cannot compute price for ${item.title} (${item.size})`,
        })
      }

      const frame: FramePricingData | null = item.frameId ? frameMap[item.frameId] ?? null : null
      const frameModifier = computeFrameModifier(frame, item.size)

      unitAmountCents = Math.round((base + frameModifier) * 100)
    }

    const nameParts = [item.title]
    if (item.size) nameParts.push(item.size)
    if (item.frameName) nameParts.push(item.frameName)

    lineItems.push({
      price_data: {
        currency: 'usd',
        product_data: {
          name: nameParts.join(' · '),
          images: item.imageUrl ? [item.imageUrl] : [],
        },
        unit_amount: unitAmountCents,
      },
      quantity: item.quantity,
    })
  }

  const host = getRequestHost(event)
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
  const baseUrl = `${protocol}://${host}`

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: lineItems,
    mode: 'payment',
    success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/checkout/cancel`,
    metadata: {
      items: JSON.stringify(
        items.map((i) => ({
          productId: i.productId,
          artworkSlug: i.artworkSlug,
          mediaType: i.mediaType,
          size: i.size,
          frameId: i.frameId,
          qty: i.quantity,
        })),
      ),
    },
  })

  return { url: session.url }
})
