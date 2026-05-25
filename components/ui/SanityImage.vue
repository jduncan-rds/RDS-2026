<script setup lang="ts">
import type { SanityImageSource } from '@sanity/image-url'

const props = withDefaults(defineProps<{
  image: SanityImageSource
  alt: string
  width?: number
  height?: number
  fit?: 'clip' | 'crop' | 'fill' | 'fillmax' | 'max' | 'scale' | 'min'
  aspectRatio?: string
  priority?: boolean
}>(), {
  fit: 'crop',
})

// Build the image URL reactively. The previous `const builder = useSanityImageUrl(props.image)`
// captured the source once at setup; when `props.image` later changed (e.g. user
// clicks a thumbnail and the parent swaps which image to show), `src`/`srcset`
// kept resolving the original image.
const builder = computed(() => useSanityImageUrl(props.image))

const src = computed(() =>
  builder.value.width(props.width ?? 800).fit(props.fit).auto('format').url()
)

const srcset = computed(() => {
  const widths = [400, 800, 1200, 1600]
  return widths
    .map((w) => `${builder.value.width(w).fit(props.fit).auto('format').url()} ${w}w`)
    .join(', ')
})
</script>

<template>
  <img
    :src="src"
    :srcset="srcset"
    :alt="alt"
    :style="aspectRatio ? { aspectRatio, objectFit: 'cover' } : {}"
    :loading="priority ? 'eager' : 'lazy'"
    :fetchpriority="priority ? 'high' : undefined"
    decoding="async"
  />
</template>
