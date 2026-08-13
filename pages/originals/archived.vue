<script setup lang="ts">
import groq from 'groq'

useSeoMeta({
  title: 'Archived Originals — Robert Duncan Fine Art',
  description: 'The archive of past original oil paintings by Robert Duncan.',
})

const { data } = await useSanityQuery<{
  artworks: any[]
  categories: any[]
}>(groq`{
  "artworks": *[_type == "artwork" && status == "archived"] | order(_createdAt desc) {
    _id,
    title,
    "slug": slug.current,
    "image": images[0],
    medium,
    dimensions,
    year,
    "categorySlugs": categories[]->slug.current
  },
  "categories": *[_type == "category"] | order(name asc) { name, "slug": slug.current }
}`)

const artworks = computed(() => data.value?.artworks ?? [])
const categories = computed(() => data.value?.categories ?? [])

const activeCategories = ref<string[]>([])

function toggleCategory(slug: string) {
  const i = activeCategories.value.indexOf(slug)
  if (i >= 0) activeCategories.value.splice(i, 1)
  else activeCategories.value.push(slug)
}

function clearFilters() {
  activeCategories.value = []
}

const filtered = computed(() => {
  if (activeCategories.value.length === 0) return artworks.value
  return artworks.value.filter((a: any) =>
    a.categorySlugs?.some((s: string) => activeCategories.value.includes(s)),
  )
})

const hasActiveFilters = computed(() => activeCategories.value.length > 0)
</script>

<template>
  <div>
    <!-- Page header -->
    <div class="max-w-7xl mx-auto px-6 lg:px-10 pt-16">
      <nav class="mb-3">
        <NuxtLink to="/originals" class="font-ui text-xs tracking-widest uppercase text-brown/40 hover:text-brown transition-colors">
          Originals
        </NuxtLink>
        <span class="font-ui text-xs text-brown/20 mx-2">/</span>
        <span class="font-ui text-xs tracking-widest uppercase text-brown/60">Archived</span>
      </nav>
      <h1 class="font-heading text-5xl md:text-6xl text-brown">Archived Originals</h1>
    </div>

    <!-- Spacer -->
    <div style="height: 20px;" />

    <!-- Sticky filter bar -->
    <div v-if="categories.length" class="sticky top-16 lg:top-20 z-40 bg-cream border-y border-brown/10">
      <div class="max-w-7xl mx-auto px-6 lg:px-10 py-4 flex flex-wrap items-center gap-3">
        <FilterPill
          v-for="cat in categories"
          :key="cat.slug"
          :label="cat.name"
          :active="activeCategories.includes(cat.slug)"
          @click="toggleCategory(cat.slug)"
        />

        <button
          v-if="hasActiveFilters"
          type="button"
          class="font-ui text-xs tracking-widest uppercase text-brown/40 hover:text-brown transition-colors ml-auto"
          @click="clearFilters"
        >
          Clear
        </button>
      </div>
    </div>

    <div class="max-w-7xl mx-auto px-6 lg:px-10 py-16">
      <div v-if="filtered.length" class="columns-2 md:columns-3 lg:columns-4 gap-6">
        <ArtworkCard
          v-for="artwork in filtered"
          :key="artwork.slug"
          class="break-inside-avoid mb-6"
          :title="artwork.title"
          :image="artwork.image"
          status="archived"
          :to="`/shop/${artwork.slug}?type=original`"
        />
      </div>

      <!-- Empty state -->
      <div v-else class="py-20 text-center">
        <p class="font-body text-brown/40 text-lg italic">No archived artwork found.</p>
        <button
          v-if="hasActiveFilters"
          class="mt-4 font-ui text-xs tracking-widest uppercase text-brown/50 hover:text-brown transition-colors underline underline-offset-4"
          @click="clearFilters"
        >
          Clear filters
        </button>
      </div>
    </div>
  </div>
</template>
