<script setup lang="ts">
import { loadStripe, type StripeEmbeddedCheckout } from '@stripe/stripe-js'

// Embedded Stripe Checkout mounted on our own page. The cart sends the customer
// here with ?state=XX (needed to price shipping). We create the session via
// /api/checkout (which also pre-creates the pending order) and mount the form.
const route = useRoute()
const cart = useCartStore()
const config = useRuntimeConfig()

const shipState = computed(() => String(route.query.state ?? ''))
const error = ref<string | null>(null)
let embedded: StripeEmbeddedCheckout | null = null

onMounted(async () => {
  if (!cart.items.length || !shipState.value) {
    await navigateTo('/cart')
    return
  }
  try {
    const stripe = await loadStripe(config.public.stripePublishableKey as string)
    if (!stripe) throw new Error('Stripe failed to load.')
    embedded = await stripe.initEmbeddedCheckout({
      fetchClientSecret: async () => {
        const { clientSecret } = await $fetch<{ clientSecret: string }>('/api/checkout', {
          method: 'POST',
          body: { items: cart.items, state: shipState.value },
        })
        return clientSecret
      },
    })
    embedded.mount('#embedded-checkout')
  } catch (err: any) {
    error.value =
      err?.data?.statusMessage ??
      'Could not start checkout. Please return to your cart and try again.'
  }
})

onBeforeUnmount(() => {
  embedded?.destroy()
})

useSeoMeta({ title: 'Checkout — Robert Duncan Fine Art' })
</script>

<template>
  <div class="max-w-3xl mx-auto px-6 py-12 lg:py-16">
    <div class="flex items-baseline justify-between mb-8">
      <h1 class="font-heading text-3xl text-brown">Checkout</h1>
      <NuxtLink
        to="/cart"
        class="font-ui text-xs tracking-widest uppercase text-brown/40 hover:text-brown transition-colors"
      >
        ← Back to cart
      </NuxtLink>
    </div>

    <p v-if="error" class="font-body text-rust mb-6">{{ error }}</p>

    <!-- Stripe mounts the embedded payment form here -->
    <div id="embedded-checkout" />
  </div>
</template>
