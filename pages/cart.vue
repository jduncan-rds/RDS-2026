<script setup lang="ts">
import { US_STATES, CA_PROVINCES } from '~/utils/shipping'
import { formatUsd } from '~/utils/pricing'

const cart = useCartStore()

const mediaTypeLabel: Record<string, string> = {
  original: 'Original Painting',
  open_edition: 'Open Edition Print',
  pod_paper: 'Custom Print',
  pod_canvas: 'Custom Canvas',
  simple: '',
}

// A painting can back both an Original and a Print product under the same
// artwork slug — pass along which one this cart line actually is so
// /shop/[slug] doesn't guess.
function productLink(item: { artworkSlug: string; mediaType: string }) {
  const type = item.mediaType === 'original'
    ? 'original'
    : ['open_edition', 'pod_paper', 'pod_canvas'].includes(item.mediaType)
      ? 'print'
      : null
  return type ? `/shop/${item.artworkSlug}?type=${type}` : `/shop/${item.artworkSlug}`
}

const isCheckingOut = ref(false)
const checkoutError = ref<string | null>(null)

// Shipping depends on destination, so the customer picks a country + region
// here (before Stripe) and we quote it server-side. Checkout recomputes
// authoritatively and re-runs the same eligibility checks.
const shipCountry = ref<'US' | 'CA'>('US')
const shipState = ref<string>('')
const shippingCents = ref<number | null>(null)
const shippingLoading = ref(false)
const shippingUnavailable = ref<string | null>(null)

/** Canada is limited to calendars/cards/gifts and unframed prints. */
interface IneligibleLine {
  productId: string
  title: string | null
  reason: 'original' | 'framed' | 'no_rate'
}
const ineligible = ref<IneligibleLine[]>([])

const regions = computed(() => (shipCountry.value === 'CA' ? CA_PROVINCES : US_STATES))
const regionLabel = computed(() => (shipCountry.value === 'CA' ? 'province' : 'state'))

const INELIGIBLE_REASON: Record<IneligibleLine['reason'], string> = {
  original: 'original paintings ship within the US only',
  framed: 'framed pieces ship within the US only',
  no_rate: 'this size is not available to Canada',
}

const shippingDollars = computed(() =>
  shippingCents.value == null ? null : shippingCents.value / 100,
)
const grandTotal = computed(() => cart.total + (shippingDollars.value ?? 0))

async function quoteShipping() {
  shippingCents.value = null
  ineligible.value = []
  shippingUnavailable.value = null
  if (!shipState.value || !cart.items.length) return
  shippingLoading.value = true
  try {
    const res = await $fetch<{ shippingCents: number; ineligible: IneligibleLine[] }>(
      '/api/shipping-quote',
      {
        method: 'POST',
        body: { country: shipCountry.value, state: shipState.value, items: cart.items },
      },
    )
    shippingCents.value = res.shippingCents
    ineligible.value = res.ineligible ?? []
  } catch (err: any) {
    shippingCents.value = null
    // Canada switched off in Sanity, or an invalid destination.
    shippingUnavailable.value = err?.statusMessage ?? null
  } finally {
    shippingLoading.value = false
  }
}

// Switching country invalidates the region choice (state codes aren't provinces).
watch(shipCountry, () => {
  shipState.value = ''
  shippingCents.value = null
  ineligible.value = []
  shippingUnavailable.value = null
  checkoutError.value = null
})

// Re-quote when the region changes or the cart contents change.
watch(shipState, quoteShipping)
watch(
  () => cart.items.map((i) => `${i.productId}:${i.size}:${i.frameId}:${i.quantity}`).join('|'),
  () => {
    if (shipState.value) quoteShipping()
  },
)

const canCheckout = computed(
  () => !!shipState.value && !ineligible.value.length && !shippingUnavailable.value,
)

async function checkout() {
  if (!cart.items.length) return
  if (!shipState.value) {
    checkoutError.value = `Please select your shipping ${regionLabel.value} to see shipping and continue.`
    return
  }
  if (ineligible.value.length) {
    checkoutError.value = 'Please remove the items that cannot ship to Canada to continue.'
    return
  }
  if (shippingUnavailable.value) {
    checkoutError.value = shippingUnavailable.value
    return
  }
  checkoutError.value = null
  isCheckingOut.value = true
  // The /checkout page mounts the embedded Stripe form and creates the session
  // (it needs the destination to price shipping).
  await navigateTo({
    path: '/checkout',
    query: { country: shipCountry.value, state: shipState.value },
  })
}

useSeoMeta({ title: 'Cart — Robert Duncan Fine Art' })
</script>

<template>
  <div class="max-w-5xl mx-auto px-6 lg:px-10 py-12 lg:py-20">
    <h1 class="font-heading text-4xl text-brown mb-12">Your Cart</h1>

    <!-- Empty state -->
    <div v-if="!cart.items.length" class="text-center py-24">
      <p class="font-body text-brown/50 mb-8">Your cart is empty.</p>
      <NuxtLink to="/shop">
        <AppButton variant="primary">Browse the Shop</AppButton>
      </NuxtLink>
    </div>

    <!-- Cart items + summary -->
    <div v-else class="grid lg:grid-cols-3 gap-12 items-start">

      <!-- Items list -->
      <div class="lg:col-span-2 space-y-6">
        <div
          v-for="(item, index) in cart.items"
          :key="index"
          class="flex gap-5 pb-6 border-b border-brown/10"
        >
          <!-- Thumbnail -->
          <NuxtLink :to="productLink(item)" class="shrink-0">
            <img
              v-if="item.imageUrl"
              :src="item.imageUrl"
              :alt="item.title"
              class="w-20 h-20 object-cover"
            />
            <div v-else class="w-20 h-20 bg-brown/10" />
          </NuxtLink>

          <!-- Details -->
          <div class="flex-1 min-w-0">
            <NuxtLink :to="productLink(item)" class="font-heading text-lg text-brown hover:text-rust transition-colors">
              {{ item.title }}
            </NuxtLink>
            <p
              v-if="mediaTypeLabel[item.mediaType] || item.size || item.frameName"
              class="font-ui text-xs tracking-widest uppercase text-brown/50 mt-1"
            >
              <template v-if="mediaTypeLabel[item.mediaType]">
                {{ mediaTypeLabel[item.mediaType] }}
              </template>
              <template v-if="item.size"> · {{ item.size }}</template>
              <template v-if="item.frameName"> · {{ item.frameName }}</template>
            </p>

            <!-- Quantity -->
            <div class="flex items-center gap-3 mt-3">
              <button
                type="button"
                class="w-7 h-7 border border-brown/30 hover:border-brown transition-colors flex items-center justify-center font-ui text-brown disabled:opacity-30 text-sm"
                :disabled="item.quantity <= 1"
                @click="item.quantity = Math.max(1, item.quantity - 1)"
              >−</button>
              <span class="font-ui text-sm w-5 text-center">{{ item.quantity }}</span>
              <button
                type="button"
                class="w-7 h-7 border border-brown/30 hover:border-brown transition-colors flex items-center justify-center font-ui text-brown text-sm"
                @click="item.quantity++"
              >+</button>
              <button
                type="button"
                class="ml-4 font-ui text-xs tracking-widest uppercase text-brown/30 hover:text-rust transition-colors"
                @click="cart.remove(index)"
              >Remove</button>
            </div>
          </div>

          <!-- Line total -->
          <div class="shrink-0 text-right">
            <p class="font-heading text-xl text-brown">
              ${{ formatUsd(item.unitPrice * item.quantity) }}
            </p>
            <p v-if="item.quantity > 1" class="font-ui text-xs text-brown/40 mt-1">
              ${{ formatUsd(item.unitPrice) }} ea.
            </p>
          </div>
        </div>
      </div>

      <!-- Order summary -->
      <div class="lg:sticky lg:top-28 border border-brown/10 p-6">
        <h2 class="font-ui text-xs tracking-widest uppercase text-brown/60 mb-6">Order Summary</h2>

        <div class="flex justify-between mb-2">
          <span class="font-body text-brown/70">Subtotal</span>
          <span class="font-heading text-xl text-brown">${{ formatUsd(cart.total) }}</span>
        </div>

        <!-- Shipping destination -->
        <div class="mt-4 mb-4">
          <label class="font-ui text-xs tracking-widest uppercase text-brown/50 block mb-2">
            Ship to
          </label>
          <select
            v-model="shipCountry"
            class="w-full font-ui text-sm px-3 py-2 mb-2 bg-transparent border border-brown/40 text-brown focus:outline-none focus:border-brown"
          >
            <option value="US">United States</option>
            <option value="CA">Canada</option>
          </select>
          <select
            v-model="shipState"
            class="w-full font-ui text-sm px-3 py-2 bg-transparent border border-brown/40 text-brown focus:outline-none focus:border-brown"
          >
            <option value="" disabled>Select your {{ regionLabel }}…</option>
            <option v-for="r in regions" :key="r.code" :value="r.code">{{ r.name }}</option>
          </select>
        </div>

        <!-- Canada is limited to calendars/cards/gifts and unframed prints.
             Checkout is blocked until the ineligible items are removed. -->
        <div
          v-if="ineligible.length"
          class="mb-6 p-4 border border-rust/40 bg-rust/5"
        >
          <p class="font-body text-sm text-brown mb-2">
            These items can’t ship to Canada. Please remove them to continue:
          </p>
          <ul class="font-ui text-xs text-brown/70 space-y-1">
            <li v-for="item in ineligible" :key="item.productId + item.reason">
              <span class="text-brown">{{ item.title ?? 'Item' }}</span>
              — {{ INELIGIBLE_REASON[item.reason] }}
            </li>
          </ul>
        </div>

        <p
          v-else-if="shippingUnavailable"
          class="mb-6 p-4 border border-rust/40 bg-rust/5 font-body text-sm text-brown"
        >
          {{ shippingUnavailable }}
        </p>

        <div class="flex justify-between mb-2">
          <span class="font-body text-brown/70">Shipping</span>
          <span class="font-body text-brown/80">
            <template v-if="!shipState">—</template>
            <template v-else-if="shippingLoading">…</template>
            <!-- Blocked orders must not quote a price: the figure would only
                 cover the shippable lines and changes once the cart is fixed. -->
            <template v-else-if="ineligible.length || shippingUnavailable">—</template>
            <template v-else-if="shippingDollars === 0">Free</template>
            <template v-else-if="shippingDollars != null">${{ formatUsd(shippingDollars) }}</template>
            <template v-else>—</template>
          </span>
        </div>

        <div class="flex justify-between items-baseline mt-4 pt-4 border-t border-brown/10 mb-2">
          <span class="font-body text-brown">Total</span>
          <span class="font-heading text-2xl text-brown">
            ${{ formatUsd(canCheckout && shippingDollars != null ? grandTotal : cart.total) }}
          </span>
        </div>
        <p v-if="!shipState" class="font-ui text-xs text-brown/40 mb-8">
          Select your {{ regionLabel }} to calculate shipping. Taxes calculated at checkout.
        </p>
        <p v-else-if="shipCountry === 'CA'" class="font-ui text-xs text-brown/40 mb-8">
          Ships USPS, typically 1–3 weeks. Any duties or taxes are collected by Canada
          Post on delivery. Prices in USD.
        </p>
        <p v-else class="font-ui text-xs text-brown/40 mb-8">Taxes calculated at checkout.</p>

        <p v-if="checkoutError" class="font-body text-sm text-rust mb-4">{{ checkoutError }}</p>

        <AppButton
          variant="primary"
          size="lg"
          class="w-full"
          :disabled="isCheckingOut || !canCheckout"
          @click="checkout"
        >
          {{ isCheckingOut ? 'Redirecting…' : 'Proceed to Checkout' }}
        </AppButton>

        <NuxtLink to="/shop" class="block text-center font-ui text-xs tracking-widest uppercase text-brown/40 hover:text-brown transition-colors mt-4">
          Continue Shopping
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
