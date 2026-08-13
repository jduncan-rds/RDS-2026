<script setup lang="ts">
import groq from 'groq'

useSeoMeta({
  title: 'Available Originals — Robert Duncan Fine Art',
  description: 'Original oil paintings by Robert Duncan currently available, plus recently sold pieces.',
})

const { data } = await useSanityQuery<{
  artworks: any[]
  categories: any[]
}>(groq`{
  "artworks": *[_type == "artwork" && status in ["available", "recently_sold"]] | order(_createdAt desc) {
    _id,
    title,
    "slug": slug.current,
    "image": images[0],
    isNew,
    status,
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
const showNewOnly = ref(false)

function toggleCategory(slug: string) {
  const i = activeCategories.value.indexOf(slug)
  if (i >= 0) activeCategories.value.splice(i, 1)
  else activeCategories.value.push(slug)
}

function clearFilters() {
  activeCategories.value = []
  showNewOnly.value = false
}

const filtered = computed(() => {
  let result = artworks.value ?? []
  if (activeCategories.value.length > 0) {
    result = result.filter((a: any) =>
      a.categorySlugs?.some((s: string) => activeCategories.value.includes(s)),
    )
  }
  if (showNewOnly.value) {
    result = result.filter((a: any) => a.isNew)
  }
  return result
})

const available = computed(() => filtered.value.filter((a: any) => a.status === 'available'))
const recentlySold = computed(() => filtered.value.filter((a: any) => a.status === 'recently_sold'))

const hasActiveFilters = computed(() => activeCategories.value.length > 0 || showNewOnly.value)
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
        <span class="font-ui text-xs tracking-widest uppercase text-brown/60">Available</span>
      </nav>
      <h1 class="font-heading text-5xl md:text-6xl text-brown">Available Originals</h1>
    </div>

    <!-- Spacer -->
    <div style="height: 20px;" />

    <!-- Sticky filter bar -->
    <div class="sticky top-16 lg:top-20 z-40 bg-cream border-y border-brown/10">
      <div class="max-w-7xl mx-auto px-6 lg:px-10 py-4 flex flex-wrap items-center gap-3">
        <FilterPill
          v-for="cat in categories"
          :key="cat.slug"
          :label="cat.name"
          :active="activeCategories.includes(cat.slug)"
          @click="toggleCategory(cat.slug)"
        />

        <div class="w-px h-5 bg-brown/20 mx-1 hidden sm:block" />

        <!-- New Work toggle -->
        <button
          type="button"
          :class="[
            'font-ui text-xs tracking-widest uppercase px-4 py-2 border transition-colors duration-200 flex items-center gap-2',
            showNewOnly
              ? 'bg-rust text-cream border-rust'
              : 'bg-transparent text-brown border-brown/40 hover:border-brown',
          ]"
          @click="showNewOnly = !showNewOnly"
        >
          <span class="w-1.5 h-1.5 rounded-full bg-current" />
          New Work
        </button>

        <!-- Clear filters -->
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

    <div class="max-w-7xl mx-auto px-6 lg:px-10 py-16 space-y-20">

      <!-- Available -->
      <section v-if="available.length">
        <h2 class="font-heading text-3xl text-brown mb-8">Available</h2>
        <div class="columns-2 md:columns-3 lg:columns-4 gap-6">
          <ArtworkCard
            v-for="artwork in available"
            :key="artwork.slug"
            class="break-inside-avoid mb-6"
            :title="artwork.title"
            :image="artwork.image"
            :is-new="artwork.isNew"
            :artwork-id="artwork._id"
            status="available"
            :to="`/shop/${artwork.slug}?type=original`"
          />
        </div>
      </section>

      <!-- Recently Sold -->
      <section v-if="recentlySold.length">
        <h2 class="font-heading text-3xl text-brown mb-8">Recently Sold</h2>
        <div class="columns-2 md:columns-3 lg:columns-4 gap-6">
          <ArtworkCard
            v-for="artwork in recentlySold"
            :key="artwork.slug"
            class="break-inside-avoid mb-6"
            :title="artwork.title"
            :image="artwork.image"
            :artwork-id="artwork._id"
            status="recently_sold"
          />
        </div>
      </section>

      <!-- Empty state -->
      <div
        v-if="!available.length && !recentlySold.length"
        class="py-20 text-center"
      >
        <p class="font-body text-brown/40 text-lg italic">No artwork found.</p>
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
