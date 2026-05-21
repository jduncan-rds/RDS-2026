<script setup lang="ts">
const props = defineProps<{
  images: any[]
  headline?: string
}>()

const current = ref(0)
let timer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  if (props.images.length > 1) {
    timer = setInterval(() => {
      current.value = (current.value + 1) % props.images.length
    }, 5000)
  }
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<template>
  <div class="relative w-full overflow-hidden bg-brown/10" style="height: 85vh;">
    <template v-for="(image, i) in images" :key="i">
      <div
        class="absolute inset-0 transition-opacity duration-1000"
        :class="i === current ? 'opacity-100' : 'opacity-0'"
      >
        <SanityImage
          :image="image"
          alt=""
          :width="1600"
          fit="crop"
          aspect-ratio="unset"
          :priority="i === 0"
          class="w-full h-full object-cover"
        />
      </div>
    </template>

    <!-- Gradient overlay -->
    <div class="absolute inset-0 bg-gradient-to-t from-brown/60 via-transparent to-transparent" />

    <!-- Headline -->
    <div v-if="headline || $slots.default" class="absolute bottom-0 left-0 right-0 p-10 lg:p-16">
      <div class="max-w-7xl mx-auto">
        <slot>
          <h2 v-if="headline" class="font-heading text-cream text-4xl md:text-6xl">
            {{ headline }}
          </h2>
        </slot>
      </div>
    </div>

    <!-- Dot indicators -->
    <div v-if="images.length > 1" class="absolute bottom-6 right-10 flex gap-2">
      <button
        v-for="(_, i) in images"
        :key="i"
        class="w-1.5 h-1.5 rounded-full transition-colors duration-300"
        :class="i === current ? 'bg-cream' : 'bg-cream/40'"
        :aria-label="`Go to slide ${i + 1}`"
        @click="current = i"
      />
    </div>
  </div>
</template>
