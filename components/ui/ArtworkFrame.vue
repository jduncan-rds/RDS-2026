<script setup lang="ts">
const props = defineProps<{
  frame: { _id: string; barImage: any; priceModifier: number } | null
  frameWidth?: number
}>()

const fw = computed(() => props.frameWidth ?? 28)

const barUrl = computed(() => {
  if (!props.frame?.barImage) return null
  return useSanityImageUrl(props.frame.barImage).width(800).auto('format').url()
})
</script>

<template>
  <div class="relative" :style="frame ? `padding: ${fw}px` : ''">
    <!-- Frame bars -->
    <template v-if="frame && barUrl">
      <!-- Top -->
      <div
        class="absolute top-0 left-0 right-0 pointer-events-none"
        :style="{
          height: `${fw}px`,
          backgroundImage: `url(${barUrl})`,
          backgroundSize: 'auto 100%',
          backgroundRepeat: 'repeat-x',
          clipPath: `polygon(${fw}px 100%, 0 0, 100% 0, calc(100% - ${fw}px) 100%)`,
        }"
      />
      <!-- Bottom -->
      <div
        class="absolute bottom-0 left-0 right-0 pointer-events-none"
        :style="{
          height: `${fw}px`,
          backgroundImage: `url(${barUrl})`,
          backgroundSize: 'auto 100%',
          backgroundRepeat: 'repeat-x',
          clipPath: `polygon(0 100%, ${fw}px 0, calc(100% - ${fw}px) 0, 100% 100%)`,
        }"
      />
      <!-- Left -->
      <div
        class="absolute top-0 bottom-0 left-0 pointer-events-none"
        :style="{
          width: `${fw}px`,
          backgroundImage: `url(${barUrl})`,
          backgroundSize: '100% auto',
          backgroundRepeat: 'repeat-y',
          clipPath: `polygon(0 0, 100% ${fw}px, 100% calc(100% - ${fw}px), 0 100%)`,
        }"
      />
      <!-- Right -->
      <div
        class="absolute top-0 bottom-0 right-0 pointer-events-none"
        :style="{
          width: `${fw}px`,
          backgroundImage: `url(${barUrl})`,
          backgroundSize: '100% auto',
          backgroundRepeat: 'repeat-y',
          clipPath: `polygon(100% 0, 0 ${fw}px, 0 calc(100% - ${fw}px), 100% 100%)`,
        }"
      />
    </template>

    <slot />
  </div>
</template>
