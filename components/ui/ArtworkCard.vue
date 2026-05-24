<script setup lang="ts">
import { resolveComponent } from 'vue'

defineProps<{
  title: string
  image: object | null
  isNew?: boolean
  status?: 'available' | 'recently_sold' | 'archived'
  to?: string
  artworkId?: string
}>()

const NuxtLink = resolveComponent('NuxtLink')
</script>

<template>
  <component :is="to ? NuxtLink : 'div'" :to="to" class="group block">
    <div class="relative overflow-hidden bg-brown/5">
      <SanityImage
        v-if="image"
        :image="image"
        :alt="title"
        aspect-ratio="4/5"
        :width="600"
        class="w-full transition-transform duration-500 group-hover:scale-[1.03]"
      />
      <div v-else class="w-full aspect-[4/5] bg-brown/10" />

      <div class="absolute top-3 left-3 flex gap-1.5">
        <BadgeNew v-if="isNew" />
        <BadgeSold v-if="status === 'recently_sold'" />
      </div>

      <div v-if="artworkId" class="absolute top-3 right-3">
        <HeartButton :artwork-id="artworkId" />
      </div>
    </div>

    <div class="pt-3 pb-1">
      <p class="font-body text-brown text-base leading-snug">{{ title }}</p>
    </div>
  </component>
</template>
