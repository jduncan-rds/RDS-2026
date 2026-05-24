<script setup lang="ts">
import groq from 'groq'

definePageMeta({ layout: 'default' })

useSeoMeta({
  title: 'Favorites — Robert Duncan Fine Art',
})

const favorites = useFavoritesStore()
const sanity = useSanity()
const user = useSupabaseUser()

const ids = computed(() => favorites.ids)

const { data: artworks } = await useAsyncData(
  'favorites-artworks',
  async () => {
    if (!ids.value.length) return []
    return await sanity.client.fetch<any[]>(
      groq`*[_type == "artwork" && _id in $ids] {
        _id,
        title,
        "slug": slug.current,
        "image": images[0],
        isNew,
        status,
        "hasProductPage": defined(*[_type == "product" && artwork._ref == ^._id][0])
      }`,
      { ids: ids.value },
    )
  },
  { watch: [ids] },
)
</script>

<template>
  <div class="max-w-7xl mx-auto px-6 lg:px-10 py-20">
    <div class="max-w-6xl">
      <div class="mb-12">
        <p class="font-ui text-xs tracking-widest uppercase text-brown/50 mb-3">Saved</p>
        <h1 class="font-heading text-5xl md:text-6xl text-brown">Favorites</h1>
      </div>

      <!-- Guest banner — invite to sign in to sync across devices -->
      <div
        v-if="!user && ids.length"
        class="border border-brown/15 bg-brown/[0.03] px-6 py-4 mb-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
      >
        <p class="font-body text-sm text-brown/70">
          Your favorites are saved on this device. Sign in to keep them across devices.
        </p>
        <NuxtLink
          to="/login?next=/favorites"
          class="font-ui text-xs tracking-widest uppercase text-brown hover:text-rust transition-colors underline underline-offset-4 whitespace-nowrap"
        >
          Log In
        </NuxtLink>
      </div>

      <div v-if="!ids.length" class="py-16 text-center border border-brown/10">
        <p class="font-body text-brown/50 text-lg italic mb-6">No favorites yet.</p>
        <NuxtLink
          to="/shop"
          class="font-ui text-xs tracking-widest uppercase text-brown hover:text-rust transition-colors underline underline-offset-4"
        >
          Browse the shop
        </NuxtLink>
      </div>

      <div v-else class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        <ArtworkCard
          v-for="artwork in artworks"
          :key="artwork._id"
          :title="artwork.title"
          :image="artwork.image"
          :is-new="artwork.isNew"
          :status="artwork.status"
          :artwork-id="artwork._id"
          :to="artwork.hasProductPage ? `/shop/${artwork.slug}` : undefined"
        />
      </div>
    </div>
  </div>
</template>
