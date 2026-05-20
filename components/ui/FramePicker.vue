<script setup lang="ts">
defineProps<{
  frames: any[]
  selectedId: string | null
}>()

defineEmits<{ select: [id: string | null] }>()
</script>

<template>
  <div>
    <p class="font-ui text-xs tracking-widest uppercase text-brown/60 mb-3">Frame</p>
    <div class="flex flex-wrap gap-3">
      <!-- No frame -->
      <button
        type="button"
        :class="[
          'w-14 h-14 border transition-all duration-200 flex flex-col items-center justify-center gap-1',
          selectedId === null
            ? 'border-brown ring-1 ring-brown'
            : 'border-brown/20 hover:border-brown/50',
        ]"
        title="No frame"
        @click="$emit('select', null)"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-brown/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
        <span class="font-ui text-[9px] tracking-wider uppercase text-brown/40">None</span>
      </button>

      <!-- Frame options -->
      <button
        v-for="frame in frames"
        :key="frame._id"
        type="button"
        :class="[
          'w-14 h-14 border transition-all duration-200 overflow-hidden relative',
          selectedId === frame._id
            ? 'border-brown ring-1 ring-brown'
            : 'border-brown/20 hover:border-brown/50',
        ]"
        :title="`${frame.name}${frame.priceModifier > 0 ? ` (+$${frame.priceModifier})` : ''}`"
        @click="$emit('select', frame._id)"
      >
        <SanityImage
          v-if="frame.thumbnail"
          :image="frame.thumbnail"
          :alt="frame.name"
          :width="80"
          class="w-full h-full object-cover"
        />
        <div v-else class="w-full h-full bg-brown/10" />
      </button>
    </div>

    <!-- Selected frame name -->
    <p v-if="selectedId" class="mt-2 font-ui text-xs text-brown/50">
      {{ frames.find(f => f._id === selectedId)?.name }}
      <span v-if="(frames.find(f => f._id === selectedId)?.priceModifier ?? 0) > 0">
        · +${{ frames.find(f => f._id === selectedId)?.priceModifier }}
      </span>
    </p>
    <p v-else class="mt-2 font-ui text-xs text-brown/50">Unframed</p>
  </div>
</template>
