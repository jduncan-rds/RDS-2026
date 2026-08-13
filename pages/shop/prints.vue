<script setup lang="ts">
import groq from 'groq'
import { computeVariantPrice, formatUsd } from '~/utils/pricing'
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
  "products": *[_type == "product" && productType == "print"] | order(artwork->title asc) {
    _id,
    variants,
    artwork->{
      _id,
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
const router = useRouter()
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
const showOpenEditionOnly = ref(false)

// Search — initialized from ?q= and kept in sync (replaceState so we don't pollute history)
const searchQuery = ref<string>(route.query.q ? String(route.query.q) : '')
let urlSyncTimer: ReturnType<typeof setTimeout> | null = null
watch(searchQuery, (q) => {
  if (urlSyncTimer) clearTimeout(urlSyncTimer)
  urlSyncTimer = setTimeout(() => {
    const next = { ...route.query }
    if (q) next.q = q
    else delete next.q
    router.replace({ query: next })
  }, 250)
})
watch(
  () => route.query.q,
  (q) => {
    const v = q ? String(q) : ''
    if (v !== searchQuery.value) searchQuery.value = v
  },
)

const hasActiveFilters = computed(
  () =>
    activeCategories.value.length > 0 ||
    showNewOnly.value ||
    showOpenEditionOnly.value ||
    searchQuery.value.trim().length > 0,
)

function clearAllFilters() {
  activeCategories.value = []
  showNewOnly.value = false
  showOpenEditionOnly.value = false
  searchQuery.value = ''
}

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
  if (showOpenEditionOnly.value) {
    result = result.filter((p: any) =>
      (p.variants ?? []).some((v: any) => v.mediaType === 'open_edition'),
    )
  }
  const q = searchQuery.value.trim().toLowerCase()
  if (q) {
    result = result.filter((p: any) =>
      (p.artwork?.title ?? '').toLowerCase().includes(q),
    )
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
      <nav class="mb-3">
        <NuxtLink to="/shop" class="font-ui text-xs tracking-widest uppercase text-brown/40 hover:text-brown transition-colors">
          Shop
        </NuxtLink>
        <span class="font-ui text-xs text-brown/20 mx-2">/</span>
        <span class="font-ui text-xs tracking-widest uppercase text-brown/60">Prints &amp; Canvas</span>
      </nav>
      <h1 class="font-heading text-5xl md:text-6xl text-brown">Prints &amp; Canvas</h1>
    </div>

    <div style="height: 20px;" />

    <!-- Sticky filter bar -->
    <div class="sticky top-16 lg:top-20 z-40 bg-cream border-y border-brown/10">
      <div class="max-w-7xl mx-auto px-6 lg:px-10 py-4 space-y-3">
        <!-- Row 1: Search + Clear -->
        <div class="flex items-center gap-3">
          <div class="relative w-full sm:max-w-md">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-brown/40 pointer-events-none"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="1.5"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
              />
            </svg>
            <input
              v-model="searchQuery"
              type="search"
              placeholder="Search by title…"
              class="w-full font-ui text-sm pl-9 pr-8 py-2 bg-transparent border border-brown/40 text-brown placeholder:text-brown/40 focus:outline-none focus:border-brown"
            />
            <button
              v-if="searchQuery"
              type="button"
              class="absolute right-2 top-1/2 -translate-y-1/2 text-brown/40 hover:text-brown w-5 h-5 flex items-center justify-center"
              aria-label="Clear search"
              @click="searchQuery = ''"
            >
              ✕
            </button>
          </div>
          <div class="flex items-center gap-3 ml-auto">
            <button
              v-if="hasActiveFilters"
              type="button"
              class="font-ui text-xs tracking-widest uppercase text-brown/40 hover:text-brown transition-colors whitespace-nowrap"
              @click="clearAllFilters"
            >
              Clear all
            </button>
            <button
              type="button"
              :class="[
                'font-ui text-xs tracking-widest uppercase px-4 py-2 border transition-colors duration-200 whitespace-nowrap',
                showOpenEditionOnly ? 'bg-rust text-cream border-rust' : 'bg-transparent text-brown border-brown/40 hover:border-brown',
              ]"
              @click="showOpenEditionOnly = !showOpenEditionOnly"
            >
              Open Edition Prints
            </button>
          </div>
        </div>

        <!-- Row 2: Category pills + New Work -->
        <div class="flex flex-wrap items-center gap-3">
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
        </div>
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
      <div v-if="filtered.length" class="columns-2 md:columns-3 lg:columns-4 gap-6">
        <div v-for="product in filtered" :key="product._id" class="break-inside-avoid mb-6">
          <ArtworkCard
            :title="product.artwork?.title"
            :image="product.artwork?.image"
            :is-new="product.artwork?.isNew"
            :artwork-id="product.artwork?._id"
            :to="`/shop/${product.artwork?.slug}?type=print`"
          />
          <p v-if="startingPrice(product)" class="font-ui text-xs text-brown/50 mt-1">
            From ${{ formatUsd(startingPrice(product)!) }}
          </p>
        </div>
      </div>

      <div v-else class="py-24 text-center">
        <p class="font-body text-brown/40 text-lg italic">
          <template v-if="searchQuery">No prints match &ldquo;{{ searchQuery }}&rdquo;.</template>
          <template v-else>No prints found.</template>
        </p>
        <button
          v-if="hasActiveFilters"
          class="mt-4 font-ui text-xs tracking-widest uppercase text-brown/50 hover:text-brown transition-colors underline underline-offset-4"
          @click="clearAllFilters"
        >
          Clear filters
        </button>
      </div>
    </div>
  </div>
</template>
