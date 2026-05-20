<script setup lang="ts">
defineProps<{
  label: string
  active?: boolean
}>()

defineEmits<{
  click: []
}>()
</script>

<template>
  <button
    type="button"
    :class="[
      'font-ui text-xs tracking-widest uppercase px-4 py-2 border transition-colors duration-200',
      active
        ? 'bg-brown text-cream border-brown'
        : 'bg-transparent text-brown border-brown/40 hover:border-brown',
    ]"
    @click="$emit('click')"
  >
    {{ label }}
  </button>
</template>
