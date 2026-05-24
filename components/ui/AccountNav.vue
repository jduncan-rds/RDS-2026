<script setup lang="ts">
const supabase = useSupabaseClient()
const user = useSupabaseUser()
const favorites = useFavoritesStore()
const route = useRoute()

const links = [
  { label: 'Account', to: '/account' },
  { label: 'Orders', to: '/account/orders' },
  { label: 'Profile', to: '/account/profile' },
  { label: 'Favorites', to: '/favorites' },
]

function isActive(to: string) {
  return route.path === to
}

async function logout() {
  // Clear favorites BEFORE signOut: the plugin's watcher is best-effort, but
  // doing it here guarantees the lit hearts disappear the instant the user
  // signs out, even if route navigation interleaves with the auth event.
  favorites.clearOnSignOut()
  await supabase.auth.signOut()
  await navigateTo('/')
}

const displayName = computed(() => {
  const meta = user.value?.user_metadata as Record<string, unknown> | undefined
  return (meta?.full_name as string | undefined) || user.value?.email || ''
})
</script>

<template>
  <div class="border-b border-brown/10 pb-6 mb-12 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
    <div>
      <p class="font-ui text-xs tracking-widest uppercase text-brown/50 mb-2">Your Account</p>
      <p class="font-heading text-2xl text-brown">{{ displayName }}</p>
    </div>
    <nav class="flex items-center gap-6">
      <NuxtLink
        v-for="link in links"
        :key="link.to"
        :to="link.to"
        class="font-ui text-xs tracking-widest uppercase transition-colors pb-1"
        :class="isActive(link.to) ? 'text-brown border-b border-brown' : 'text-brown/60 hover:text-brown'"
      >
        {{ link.label }}
      </NuxtLink>
      <button
        type="button"
        class="font-ui text-xs tracking-widest uppercase text-brown/60 hover:text-rust transition-colors"
        @click="logout"
      >
        Log Out
      </button>
    </nav>
  </div>
</template>
