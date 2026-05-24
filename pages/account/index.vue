<script setup lang="ts">
definePageMeta({ layout: 'default' })

useSeoMeta({
  title: 'Account — Robert Duncan Fine Art',
})

const user = useSupabaseUser()
</script>

<template>
  <div class="max-w-7xl mx-auto px-6 lg:px-10 py-20">
    <div class="max-w-3xl">
      <AccountNav />

      <div class="space-y-6">
        <p class="font-body text-brown/80 text-lg">
          Welcome back. Save favorites, view your orders, and update your account settings.
        </p>

        <div class="grid sm:grid-cols-3 gap-4 mt-10">
          <NuxtLink
            to="/account/orders"
            class="block border border-brown/15 hover:border-brown/40 transition-colors px-6 py-8"
          >
            <p class="font-ui text-xs tracking-widest uppercase text-brown/50 mb-2">View</p>
            <p class="font-heading text-xl text-brown">Orders</p>
          </NuxtLink>

          <NuxtLink
            to="/favorites"
            class="block border border-brown/15 hover:border-brown/40 transition-colors px-6 py-8"
          >
            <p class="font-ui text-xs tracking-widest uppercase text-brown/50 mb-2">View</p>
            <p class="font-heading text-xl text-brown">Favorites</p>
          </NuxtLink>

          <NuxtLink
            to="/account/profile"
            class="block border border-brown/15 hover:border-brown/40 transition-colors px-6 py-8"
          >
            <p class="font-ui text-xs tracking-widest uppercase text-brown/50 mb-2">Manage</p>
            <p class="font-heading text-xl text-brown">Profile</p>
          </NuxtLink>
        </div>

        <p class="font-ui text-xs text-brown/40 mt-12">
          Signed in as {{ user?.email }}
        </p>
      </div>
    </div>
  </div>
</template>
