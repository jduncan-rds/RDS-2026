<script setup lang="ts">
import type { SanityImageSource } from '@sanity/image-url/lib/types/types'

const props = withDefaults(defineProps<{
  image: SanityImageSource
  alt: string
  width?: number
  height?: number
  fit?: 'clip' | 'crop' | 'fill' | 'fillmax' | 'max' | 'scale' | 'min'
  aspectRatio?: string
}>(), {
  fit: 'crop',
})

const builder = useSanityImageUrl(props.image)

const src = computed(() =>
  builder.width(props.width ?? 800).fit(props.fit).auto('format').url()
)

const srcset = computed(() => {
  const widths = [400, 800, 1200, 1600]
  return widths
    .map((w) => `${builder.width(w).fit(props.fit).auto('format').url()} ${w}w`)
    .join(', ')
})
</script>

<template>
  <img
    :src="src"
    :srcset="srcset"
    :alt="alt"
    :style="aspectRatio ? { aspectRatio, objectFit: 'cover' } : {}"
    loading="lazy"
    decoding="async"
  />
</template>
