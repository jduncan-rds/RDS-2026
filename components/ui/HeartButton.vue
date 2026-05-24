<script setup lang="ts">
const props = defineProps<{
  artworkId: string
}>()

const favorites = useFavoritesStore()
const user = useSupabaseUser()
const isFavorited = computed(() => favorites.has(props.artworkId))

const showGuestHint = ref(false)
let hintTimeout: ReturnType<typeof setTimeout> | null = null

async function onClick(e: Event) {
  e.preventDefault()
  e.stopPropagation()

  const wasOff = !isFavorited.value
  await favorites.toggle(props.artworkId)

  // First time a guest saves something, surface a brief hint about signing in
  // so the favorite persists across devices.
  if (wasOff && !user.value) {
    showGuestHint.value = true
    if (hintTimeout) clearTimeout(hintTimeout)
    hintTimeout = setTimeout(() => {
      showGuestHint.value = false
    }, 2500)
  }
}
</script>

<template>
  <div class="relative">
    <button
      type="button"
      :aria-label="isFavorited ? 'Remove from favorites' : 'Add to favorites'"
      :aria-pressed="isFavorited"
      class="inline-flex items-center justify-center w-9 h-9 rounded-full bg-cream/90 backdrop-blur-sm border border-brown/10 hover:bg-cream transition-colors"
      @click="onClick"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="w-[18px] h-[18px] transition-colors"
        :class="isFavorited ? 'text-rust' : 'text-brown/60'"
        :fill="isFavorited ? 'currentColor' : 'none'"
        viewBox="0 0 24 24"
        stroke="currentColor"
        stroke-width="1.5"
      >
        <path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
      </svg>
    </button>

    <Transition name="fade">
      <div
        v-if="showGuestHint"
        class="absolute top-full right-0 mt-2 w-56 bg-brown text-cream font-ui text-[10px] tracking-wider uppercase px-3 py-2 z-10 leading-snug"
      >
        Saved. <NuxtLink to="/login" class="underline underline-offset-2 hover:text-rust">Log in</NuxtLink> to keep across devices.
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
