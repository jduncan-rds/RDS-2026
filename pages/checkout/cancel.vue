<script setup lang="ts">
useSeoMeta({ title: 'Checkout Cancelled — Robert Duncan Fine Art' })
</script>

<template>
  <div class="max-w-2xl mx-auto px-6 py-24 text-center">
    <h1 class="font-heading text-4xl text-brown mb-4">Checkout Cancelled</h1>
    <p class="font-body text-brown/60 leading-relaxed mb-10">
      No worries — your cart is still saved. Take your time and come back whenever you're ready.
    </p>
    <div class="flex flex-col sm:flex-row gap-4 justify-center">
      <NuxtLink to="/cart">
        <AppButton variant="primary">Return to Cart</AppButton>
      </NuxtLink>
      <NuxtLink to="/shop">
        <AppButton variant="secondary">Continue Shopping</AppButton>
      </NuxtLink>
    </div>
  </div>
</template>
