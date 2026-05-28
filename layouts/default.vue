<script setup lang="ts">
const navLinks = [
  { label: 'Originals', to: '/originals' },
  { label: 'Prints', to: '/shop/prints' },
  { label: 'Gifts', to: '/shop/gifts' },
  { label: 'About Robert', to: '/about' },
  { label: 'Contact', to: '/contact' },
]

const mobileMenuOpen = ref(false)
const cart = useCartStore()
const user = useSupabaseUser()
</script>

<template>
  <div class="min-h-screen bg-cream text-brown flex flex-col">
    <!-- Nav -->
    <header class="border-b border-brown/10 bg-cream sticky top-0 z-50">
      <div class="max-w-7xl mx-auto px-6 lg:px-10 flex items-center justify-between h-16 lg:h-20">

        <!-- Logo -->
        <NuxtLink to="/" class="font-heading text-xl lg:text-2xl text-brown tracking-wide">
          Robert Duncan Fine Art
        </NuxtLink>

        <!-- Desktop nav -->
        <nav class="hidden md:flex items-center gap-8">
          <NuxtLink
            v-for="link in navLinks"
            :key="link.to"
            :to="link.to"
            class="font-ui text-xs tracking-widest uppercase text-brown/70 hover:text-brown transition-colors"
            active-class="text-brown"
          >
            {{ link.label }}
          </NuxtLink>
        </nav>

        <!-- Actions -->
        <div class="flex items-center gap-4">
          <NuxtLink
            v-if="user"
            to="/account"
            class="hidden md:flex items-center text-brown/70 hover:text-brown transition-colors font-ui text-xs tracking-widest uppercase"
            aria-label="Account"
          >
            Account
          </NuxtLink>
          <NuxtLink
            v-else
            to="/login"
            class="hidden md:flex items-center text-brown/70 hover:text-brown transition-colors font-ui text-xs tracking-widest uppercase"
          >
            Log In
          </NuxtLink>
          <NuxtLink
            to="/shop/prints"
            class="hidden md:block text-brown/70 hover:text-brown transition-colors"
            aria-label="Search prints"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </NuxtLink>
          <NuxtLink to="/favorites" class="hidden md:block text-brown/70 hover:text-rust transition-colors" aria-label="Favorites">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
            </svg>
          </NuxtLink>
          <NuxtLink to="/cart" class="text-brown/70 hover:text-rust transition-colors relative" aria-label="Cart">
              <span v-if="cart.count > 0" class="absolute -top-1.5 -right-1.5 w-4 h-4 bg-rust text-cream font-ui text-[9px] flex items-center justify-center rounded-full">
                {{ cart.count }}
              </span>
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0z" />
            </svg>
          </NuxtLink>

          <!-- Mobile hamburger -->
          <button
            class="md:hidden text-brown/70 hover:text-brown transition-colors"
            aria-label="Open menu"
            @click="mobileMenuOpen = !mobileMenuOpen"
          >
            <svg v-if="!mobileMenuOpen" xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
            <svg v-else xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Mobile menu -->
      <div v-if="mobileMenuOpen" class="md:hidden border-t border-brown/10 bg-cream px-6 py-4 flex flex-col gap-4">
        <NuxtLink
          v-for="link in navLinks"
          :key="link.to"
          :to="link.to"
          class="font-ui text-xs tracking-widest uppercase text-brown/70 hover:text-brown transition-colors py-1"
          @click="mobileMenuOpen = false"
        >
          {{ link.label }}
        </NuxtLink>
        <div class="h-px bg-brown/10 my-1" />
        <NuxtLink
          v-if="user"
          to="/account"
          class="font-ui text-xs tracking-widest uppercase text-brown/70 hover:text-brown transition-colors py-1"
          @click="mobileMenuOpen = false"
        >
          Account
        </NuxtLink>
        <NuxtLink
          v-else
          to="/login"
          class="font-ui text-xs tracking-widest uppercase text-brown/70 hover:text-brown transition-colors py-1"
          @click="mobileMenuOpen = false"
        >
          Log In
        </NuxtLink>
        <NuxtLink
          to="/shop/prints"
          class="font-ui text-xs tracking-widest uppercase text-brown/70 hover:text-brown transition-colors py-1"
          @click="mobileMenuOpen = false"
        >
          Search Prints
        </NuxtLink>
        <NuxtLink
          to="/favorites"
          class="font-ui text-xs tracking-widest uppercase text-brown/70 hover:text-brown transition-colors py-1"
          @click="mobileMenuOpen = false"
        >
          Favorites
        </NuxtLink>
      </div>
    </header>

    <!-- Page content -->
    <main class="flex-1">
      <slot />
    </main>

    <!-- Footer -->
    <footer class="border-t border-brown/10 mt-24">
      <div class="max-w-7xl mx-auto px-6 lg:px-10 py-12 flex flex-col md:flex-row items-center justify-between gap-6">
        <p class="font-heading text-lg text-brown">Robert Duncan</p>
        <nav class="flex gap-6">
          <NuxtLink
            v-for="link in navLinks"
            :key="link.to"
            :to="link.to"
            class="font-ui text-xs tracking-widest uppercase text-brown/50 hover:text-brown transition-colors"
          >
            {{ link.label }}
          </NuxtLink>
        </nav>
        <p class="font-ui text-xs text-brown/40 tracking-wide">
          © {{ new Date().getFullYear() }} Robert Duncan. All rights reserved.
        </p>
      </div>
    </footer>
  </div>
</template>
