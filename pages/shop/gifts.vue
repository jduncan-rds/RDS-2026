<script setup lang="ts">
import groq from 'groq'

useSeoMeta({
  title: 'Calendars & Gifts — Robert Duncan Fine Art',
  description: 'Calendars, greeting cards, and gifts featuring fine art by Robert Duncan.',
})

const { data: products } = await useSanityQuery<any[]>(groq`
  *[_type == "product" && productType in ["calendar", "card", "gift"]]
    | order(_createdAt desc) {
      _id,
      productType,
      simplePrice,
      simpleInStock,
      artwork->{
        _id,
        title,
        "slug": slug.current,
        "image": images[0]
      }
    }
`)

const route = useRoute()
const activeType = ref<string>(
  route.query.type ? String(route.query.type) : 'all',
)
watch(
  () => route.query.type,
  (t) => { activeType.value = t ? String(t) : 'all' },
)

const typeFilters = [
  { value: 'all', label: 'All' },
  { value: 'calendar', label: 'Calendars' },
  { value: 'card', label: 'Greeting Cards' },
  { value: 'gift', label: 'Gifts' },
]

const filtered = computed(() => {
  const all = products.value ?? []
  if (activeType.value === 'all') return all
  return all.filter((p) => p.productType === activeType.value)
})

const typeLabel: Record<string, string> = {
  calendar: 'Calendar',
  card: 'Greeting Card',
  gift: 'Gift',
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
        <span class="font-ui text-xs tracking-widest uppercase text-brown/60">Calendars &amp; Gifts</span>
      </nav>
      <h1 class="font-heading text-5xl md:text-6xl text-brown">Calendars &amp; Gifts</h1>
    </div>

    <div style="height: 20px;" />

    <!-- Type filter bar -->
    <div class="sticky top-16 lg:top-20 z-40 bg-cream border-y border-brown/10">
      <div class="max-w-7xl mx-auto px-6 lg:px-10 py-4 flex flex-wrap items-center gap-3">
        <button
          v-for="f in typeFilters"
          :key="f.value"
          type="button"
          :class="[
            'font-ui text-xs tracking-widest uppercase px-4 py-2 border transition-colors duration-200',
            activeType === f.value
              ? 'bg-brown text-cream border-brown'
              : 'bg-transparent text-brown border-brown/40 hover:border-brown',
          ]"
          @click="activeType = f.value"
        >
          {{ f.label }}
        </button>
      </div>
    </div>

    <!-- Product grid -->
    <div class="max-w-7xl mx-auto px-6 lg:px-10 py-16">
      <div v-if="filtered.length" class="columns-2 md:columns-3 lg:columns-4 gap-6">
        <div v-for="product in filtered" :key="product._id" class="break-inside-avoid mb-6">
          <ArtworkCard
            :title="product.artwork?.title"
            :image="product.artwork?.image"
            :artwork-id="product.artwork?._id"
            :to="`/shop/${product.artwork?.slug}`"
          />
          <div class="mt-1 flex items-baseline justify-between gap-3">
            <p class="font-ui text-[10px] tracking-widest uppercase text-brown/40">
              {{ typeLabel[product.productType] ?? product.productType }}
            </p>
            <p v-if="product.simplePrice" class="font-ui text-xs text-brown/50">
              ${{ product.simplePrice }}
            </p>
          </div>
        </div>
      </div>

      <div v-else class="py-24 text-center">
        <p class="font-body text-brown/40 text-lg italic">
          {{ activeType === 'all' ? 'Nothing here yet.' : 'No items in this category.' }}
        </p>
      </div>
    </div>
  </div>
</template>
