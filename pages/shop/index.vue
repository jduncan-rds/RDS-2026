<script setup lang="ts">
import groq from 'groq'

useSeoMeta({
  title: 'Shop — Robert Duncan Fine Art',
  description: 'Originals, fine art prints, calendars, and gifts by Robert Duncan.',
})

// Pull one representative image per section so the cards feel like actual
// gateways rather than empty boxes. Each query is broad-but-lazy: latest
// available original, latest print, latest non-print item.
const { data } = await useSanityQuery<{
  originalImage: any
  printImage: any
  giftImage: any
}>(groq`{
  "originalImage": *[_type == "product" && productType == "original" && artwork->status == "available"]
    | order(_createdAt desc)[0].artwork->images[0],
  "printImage": *[_type == "product" && productType == "print"]
    | order(_createdAt desc)[0].artwork->images[0],
  "giftImage": *[_type == "product" && productType in ["calendar", "card", "gift"]]
    | order(_createdAt desc)[0].artwork->images[0]
}`)

const cards = computed(() => [
  {
    label: 'Originals',
    title: 'Original Paintings',
    blurb: 'One-of-a-kind oils, hand-signed by Robert.',
    to: '/originals',
    image: data.value?.originalImage,
  },
  {
    label: 'Prints & Canvas',
    title: 'Fine Art Prints',
    blurb: 'Museum-quality open edition and custom prints, framed or unframed.',
    to: '/shop/prints',
    image: data.value?.printImage,
  },
  {
    label: 'Calendars & Gifts',
    title: 'Calendars & Gifts',
    blurb: 'Annual calendars, greeting cards, and gifts featuring his work.',
    to: '/shop/gifts',
    image: data.value?.giftImage,
  },
])
</script>

<template>
  <div>
    <!-- Page header -->
    <div class="max-w-7xl mx-auto px-6 lg:px-10 pt-16 pb-10">
      <p class="font-ui text-xs tracking-widest uppercase text-brown/50 mb-3">Browse</p>
      <h1 class="font-heading text-5xl md:text-6xl text-brown">Shop</h1>
    </div>

    <!-- Three-card landing -->
    <div class="max-w-7xl mx-auto px-6 lg:px-10 pb-24">
      <div class="grid md:grid-cols-3 gap-6 lg:gap-8">
        <NuxtLink
          v-for="card in cards"
          :key="card.to"
          :to="card.to"
          class="group block"
        >
          <div class="relative overflow-hidden bg-brown/5 aspect-[4/5]">
            <SanityImage
              v-if="card.image"
              :image="card.image"
              :alt="card.title"
              :width="900"
              fit="crop"
              aspect-ratio="4/5"
              class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
            />
            <div v-else class="w-full h-full bg-brown/10" />

            <!-- Gradient + label overlay -->
            <div class="absolute inset-0 bg-gradient-to-t from-brown/80 via-brown/10 to-transparent" />
            <div class="absolute inset-x-0 bottom-0 p-6 lg:p-8">
              <p class="font-ui text-[10px] tracking-widest uppercase text-cream/80 mb-2">
                {{ card.label }}
              </p>
              <h2 class="font-heading text-2xl lg:text-3xl text-cream mb-2">
                {{ card.title }}
              </h2>
              <p class="font-body text-cream/80 text-sm leading-snug max-w-xs">
                {{ card.blurb }}
              </p>
              <p class="mt-4 font-ui text-[10px] tracking-widest uppercase text-cream/70 group-hover:text-cream transition-colors">
                Browse →
              </p>
            </div>
          </div>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
