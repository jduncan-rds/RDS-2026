<script setup lang="ts">
import groq from 'groq'
import { computeVariantPrice } from '~/utils/pricing'
import type { PricingRules, PrintMediaType } from '~/utils/pricing'

useSeoMeta({
  title: 'Shop Prints — Robert Duncan Fine Art',
  description: 'Shop fine art prints by Robert Duncan. Open edition and print-on-demand prints, available framed or unframed.',
})

const { data } = await useSanityQuery<{
  products: any[]
  categories: any[]
  banner: any
  pricingRules: PricingRules | null
}>(groq`{
  "products": *[_type == "product" && productType == "print"] | order(_createdAt desc) {
    _id,
    variants,
    artwork->{
      title,
      "slug": slug.current,
      "image": images[0],
      isNew,
      "categorySlugs": categories[]->slug.current
    }
  },
  "categories": *[_type == "category"] | order(name asc) { name, "slug": slug.current },
  "banner": *[_type == "storeBanner"][0] {
    displayStyle,
    bannerItems[active == true]{ image, textOverlay, linkUrl }
  },
  "pricingRules": *[_id == "pricingRules"][0]
}`)

const products = computed(() => data.value?.products ?? [])
const categories = computed(() => data.value?.categories ?? [])
const banner = computed(() => data.value?.banner)
const pricingRules = computed(() => data.value?.pricingRules ?? null)

const route = useRoute()
const activeCategories = ref<string[]>(
  route.query.category ? [String(route.query.category)] : [],
)
watch(
  () => route.query.category,
  (cat) => {
    activeCategories.value = cat ? [String(cat)] : []
  },
)
const showNewOnly = ref(false)
const hasActiveFilters = computed(() => activeCategories.value.length > 0 || showNewOnly.value)

function toggleCategory(slug: string) {
  const i = activeCategories.value.indexOf(slug)
  if (i >= 0) activeCategories.value.splice(i, 1)
  else activeCategories.value.push(slug)
}

const filtered = computed(() => {
  let result = products.value ?? []
  if (activeCategories.value.length > 0) {
    result = result.filter((p: any) =>
      p.artwork?.categorySlugs?.some((s: string) => activeCategories.value.includes(s)),
    )
  }
  if (showNewOnly.value) {
    result = result.filter((p: any) => p.artwork?.isNew)
  }
  return result
})

// Starting price for each product (lowest computed variant price)
function startingPrice(product: any): number | null {
  const rules = pricingRules.value
  if (!rules) return null
  const prices = (product.variants ?? [])
    .map((v: any) => computeVariantPrice(v.mediaType as PrintMediaType, v.size, rules, v.price))
    .filter((p: number | null): p is number => p != null)
  return prices.length ? Math.min(...prices) : null
}
</script>

<template>
  <div>
    <!-- Page header -->
    <div class="max-w-7xl mx-auto px-6 lg:px-10 pt-16">
      <p class="font-ui text-xs tracking-widest uppercase text-brown/50 mb-3">Fine Art Prints</p>
      <h1 class="font-heading text-5xl md:text-6xl text-brown">Shop</h1>
    </div>

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
        <button
          type="button"
          :class="[
            'font-ui text-xs tracking-widest uppercase px-4 py-2 border transition-colors duration-200 flex items-center gap-2',
            showNewOnly ? 'bg-rust text-cream border-rust' : 'bg-transparent text-brown border-brown/40 hover:border-brown',
          ]"
          @click="showNewOnly = !showNewOnly"
        >
          <span class="w-1.5 h-1.5 rounded-full bg-current" />
          New Work
        </button>
        <button
          v-if="hasActiveFilters"
          type="button"
          class="font-ui text-xs tracking-widest uppercase text-brown/40 hover:text-brown transition-colors ml-auto"
          @click="activeCategories = []; showNewOnly = false"
        >
          Clear
        </button>
      </div>
    </div>

    <!-- Promo banner -->
    <div v-if="banner?.bannerItems?.length" class="max-w-7xl mx-auto px-6 lg:px-10 mt-10">
      <div class="relative overflow-hidden bg-brown/5" style="height: 220px;">
        <SanityImage
          :image="banner.bannerItems[0].image"
          alt=""
          :width="1400"
          fit="crop"
          aspect-ratio="unset"
          class="w-full h-full object-cover"
        />
        <div v-if="banner.bannerItems[0].textOverlay" class="absolute inset-0 flex items-center justify-center bg-brown/30">
          <p class="font-heading text-cream text-3xl md:text-5xl text-center px-6">
            {{ banner.bannerItems[0].textOverlay }}
          </p>
        </div>
      </div>
    </div>

    <!-- Product grid -->
    <div class="max-w-7xl mx-auto px-6 lg:px-10 py-16">
      <div v-if="filtered.length" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        <div v-for="product in filtered" :key="product._id">
          <ArtworkCard
            :title="product.artwork?.title"
            :image="product.artwork?.image"
            :is-new="product.artwork?.isNew"
            :to="`/shop/${product.artwork?.slug}`"
          />
          <p v-if="startingPrice(product)" class="font-ui text-xs text-brown/50 mt-1">
            From ${{ startingPrice(product) }}
          </p>
        </div>
      </div>

      <div v-else class="py-24 text-center">
        <p class="font-body text-brown/40 text-lg italic">No prints found.</p>
        <button
          v-if="hasActiveFilters"
          class="mt-4 font-ui text-xs tracking-widest uppercase text-brown/50 hover:text-brown transition-colors underline underline-offset-4"
          @click="activeCategories = []; showNewOnly = false"
        >
          Clear filters
        </button>
      </div>
    </div>
  </div>
</template>
