<script setup lang="ts">
withDefaults(defineProps<{
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  as?: string
  disabled?: boolean
}>(), {
  variant: 'primary',
  size: 'md',
  as: 'button',
})
</script>

<template>
  <component
    :is="as"
    :disabled="disabled"
    :class="[
      'inline-flex items-center justify-center font-ui tracking-widest uppercase transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rust focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none',
      {
        'bg-brown text-cream hover:bg-brown-light': variant === 'primary',
        'border border-brown text-brown hover:bg-brown hover:text-cream': variant === 'secondary',
        'text-brown hover:text-rust': variant === 'ghost',
        'text-xs px-4 py-2': size === 'sm',
        'text-xs px-6 py-3': size === 'md',
        'text-sm px-8 py-4': size === 'lg',
      },
    ]"
  >
    <slot />
  </component>
</template>
