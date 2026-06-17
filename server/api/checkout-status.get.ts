import Stripe from 'stripe'

/**
 * Reads the status of a Checkout Session, used by the return page after
 * Embedded Checkout redirects back. Order fulfillment is still driven by the
 * Stripe webhook — this is only for showing the customer the right message.
 */
export default defineEventHandler(async (event) => {
  const sessionId = getQuery(event).session_id as string | undefined
  if (!sessionId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing session id.' })
  }

  const config = useRuntimeConfig()
  const stripe = new Stripe(config.stripeSecretKey as string)
  const session = await stripe.checkout.sessions.retrieve(sessionId)

  return {
    status: session.status, // 'open' | 'complete' | 'expired'
    paymentStatus: session.payment_status, // 'paid' | 'unpaid' | 'no_payment_required'
  }
})
