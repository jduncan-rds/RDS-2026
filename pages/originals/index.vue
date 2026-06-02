<script setup lang="ts">
import groq from 'groq'

useSeoMeta({
  title: 'Original Artwork — Robert Duncan Fine Art',
  description: 'Browse original oil paintings by Robert Duncan — available works and the archive of past pieces.',
})

// One representative image per section so the cards read as gateways rather
// than empty boxes: latest available original, latest archived original.
const { data } = await useSanityQuery<{
  availableImage: any
  archivedImage: any
}>(groq`{
  "availableImage": *[_type == "artwork" && status == "available"]
    | order(_createdAt desc)[0].images[0],
  "archivedImage": *[_type == "artwork" && status == "archived"]
    | order(_createdAt desc)[0].images[0]
}`)

const cards = computed(() => [
  {
    label: 'For Sale',
    title: 'Available Originals',
    blurb: 'One-of-a-kind oils currently available, hand-signed by Robert.',
    to: '/originals/available',
    image: data.value?.availableImage,
  },
  {
    label: 'The Archive',
    title: 'Archived Originals',
    blurb: 'A look back at past paintings from Robert’s collection.',
    to: '/originals/archived',
    image: data.value?.archivedImage,
  },
])
</script>

<template>
  <div>
    <!-- Page header -->
    <div class="max-w-7xl mx-auto px-6 lg:px-10 pt-16 pb-10">
      <p class="font-ui text-xs tracking-widest uppercase text-brown/50 mb-3">The Collection</p>
      <h1 class="font-heading text-5xl md:text-6xl text-brown">Original Artwork</h1>
    </div>

    <!-- Two-card landing -->
    <div class="max-w-7xl mx-auto px-6 lg:px-10 pb-24">
      <div class="grid md:grid-cols-2 gap-6 lg:gap-8">
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
