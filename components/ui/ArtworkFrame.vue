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
        class="absolute bottom-0 left-0 right-0 overflow-hidden pointer-events-none"
        :style="{
          height: `${fw}px`,
          clipPath: `polygon(0 100%, ${fw}px 0, calc(100% - ${fw}px) 0, 100% 100%)`,
        }"
      >
        <div :style="{
          position: 'absolute',
          top: '0', left: '0', right: '0', bottom: '0',
          backgroundImage: `url(${barUrl})`,
          backgroundSize: 'auto 100%',
          backgroundRepeat: 'repeat-x',
          transform: 'rotate(180deg)',
          transformOrigin: 'center',
        }" />
      </div>
      <!-- Left -->
      <div
        class="absolute top-0 bottom-0 left-0 overflow-hidden pointer-events-none"
        :style="{
          width: `${fw}px`,
          clipPath: `polygon(0 0, 100% ${fw}px, 100% calc(100% - ${fw}px), 0 100%)`,
        }"
      >
        <div :style="{
          position: 'absolute',
          top: '50%', left: '50%',
          width: '100vh', height: `${fw}px`,
          backgroundImage: `url(${barUrl})`,
          backgroundSize: 'auto 100%',
          backgroundRepeat: 'repeat-x',
          transform: 'translate(-50%, -50%) rotate(270deg)',
        }" />
      </div>
      <!-- Right -->
      <div
        class="absolute top-0 bottom-0 right-0 overflow-hidden pointer-events-none"
        :style="{
          width: `${fw}px`,
          clipPath: `polygon(100% 0, 0 ${fw}px, 0 calc(100% - ${fw}px), 100% 100%)`,
        }"
      >
        <div :style="{
          position: 'absolute',
          top: '50%', left: '50%',
          width: '100vh', height: `${fw}px`,
          backgroundImage: `url(${barUrl})`,
          backgroundSize: 'auto 100%',
          backgroundRepeat: 'repeat-x',
          transform: 'translate(-50%, -50%) rotate(90deg)',
        }" />
      </div>
    </template>

    <slot />
  </div>
</template>
