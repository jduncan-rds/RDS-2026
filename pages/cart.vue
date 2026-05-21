<script setup lang="ts">
const cart = useCartStore()

const mediaTypeLabel: Record<string, string> = {
  original: 'Original Painting',
  open_edition: 'Open Edition Print',
  pod_paper: 'Custom Print',
  pod_canvas: 'Custom Canvas',
}

const isCheckingOut = ref(false)
const checkoutError = ref<string | null>(null)

async function checkout() {
  if (!cart.items.length) return
  isCheckingOut.value = true
  checkoutError.value = null
  try {
    const { url } = await $fetch<{ url: string }>('/api/checkout', {
      method: 'POST',
      body: { items: cart.items },
    })
    if (url) await navigateTo(url, { external: true })
  } catch (err: any) {
    checkoutError.value = err?.data?.statusMessage ?? 'Something went wrong. Please try again.'
    isCheckingOut.value = false
  }
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
          <NuxtLink :to="`/shop/${item.artworkSlug}`" class="shrink-0">
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
            <NuxtLink :to="`/shop/${item.artworkSlug}`" class="font-heading text-lg text-brown hover:text-rust transition-colors">
              {{ item.title }}
            </NuxtLink>
            <p class="font-ui text-xs tracking-widest uppercase text-brown/50 mt-1">
              {{ mediaTypeLabel[item.mediaType] ?? item.mediaType }}
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
              ${{ (item.unitPrice * item.quantity).toLocaleString() }}
            </p>
            <p v-if="item.quantity > 1" class="font-ui text-xs text-brown/40 mt-1">
              ${{ item.unitPrice.toLocaleString() }} ea.
            </p>
          </div>
        </div>
      </div>

      <!-- Order summary -->
      <div class="lg:sticky lg:top-28 border border-brown/10 p-6">
        <h2 class="font-ui text-xs tracking-widest uppercase text-brown/60 mb-6">Order Summary</h2>

        <div class="flex justify-between mb-2">
          <span class="font-body text-brown/70">Subtotal</span>
          <span class="font-heading text-xl text-brown">${{ cart.total.toLocaleString() }}</span>
        </div>
        <p class="font-ui text-xs text-brown/40 mb-8">Shipping and taxes calculated at checkout.</p>

        <p v-if="checkoutError" class="font-body text-sm text-rust mb-4">{{ checkoutError }}</p>

        <AppButton
          variant="primary"
          size="lg"
          class="w-full"
          :disabled="isCheckingOut"
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
