<script setup lang="ts">
const cart = useCartStore()

onMounted(() => {
  cart.clear()
})

useSeoMeta({ title: 'Order Confirmed — Robert Duncan Fine Art' })
</script>

<template>
  <div class="max-w-2xl mx-auto px-6 py-24 text-center">
    <div class="mb-8">
      <svg xmlns="http://www.w3.org/2000/svg" class="w-12 h-12 mx-auto text-sage" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
      </svg>
    </div>
    <h1 class="font-heading text-4xl text-brown mb-4">Thank You</h1>
    <p class="font-body text-brown/60 leading-relaxed mb-10">
      Your order has been received. You'll get a confirmation email shortly with your order details.
    </p>
    <div class="flex flex-col sm:flex-row gap-4 justify-center">
      <NuxtLink to="/shop">
        <AppButton variant="primary">Continue Shopping</AppButton>
      </NuxtLink>
      <NuxtLink to="/">
        <AppButton variant="secondary">Back to Home</AppButton>
      </NuxtLink>
    </div>
  </div>
</template>
