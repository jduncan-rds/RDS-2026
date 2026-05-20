<script setup lang="ts">
useSeoMeta({
  title: 'Robert Duncan Fine Art',
  description: 'Original oil paintings and fine art prints by Western and wildlife artist Robert Duncan.',
})
</script>

<template>
  <div>
    <!-- Hero placeholder -->
    <section class="bg-brown/5 flex items-center justify-center" style="min-height: 70vh;">
      <div class="text-center px-6">
        <p class="font-ui text-xs tracking-widest uppercase text-brown/50 mb-4">The Fine Art of</p>
        <h1 class="font-heading text-brown mb-6 leading-tight">
          <span class="block text-5xl md:text-7xl">Robert Duncan</span>
        </h1>
        <p class="font-body text-lg text-brown/70 mb-10 max-w-md mx-auto">
          Original oil paintings and fine art prints — Western, wildlife, and American life.
        </p>
        <div class="flex gap-4 justify-center">
          <AppButton as="a" href="/originals" variant="primary" size="lg">View Originals</AppButton>
          <AppButton as="a" href="/shop" variant="secondary" size="lg">Shop Prints</AppButton>
        </div>
      </div>
    </section>

    <!-- Component preview (remove before Phase 3) -->
    <section class="max-w-7xl mx-auto px-6 lg:px-10 py-20">
      <p class="font-ui text-xs tracking-widest uppercase text-brown/40 mb-8">Design System Preview</p>

      <div class="flex flex-wrap gap-3 mb-10">
        <AppButton variant="primary">Primary Button</AppButton>
        <AppButton variant="secondary">Secondary Button</AppButton>
        <AppButton variant="ghost">Ghost Button</AppButton>
        <AppButton variant="primary" size="sm">Small</AppButton>
        <AppButton variant="primary" size="lg">Large</AppButton>
      </div>

      <div class="flex flex-wrap gap-3 mb-10">
        <FilterPill label="Western" :active="true" />
        <FilterPill label="Wildlife" />
        <FilterPill label="Landscape" />
        <FilterPill label="Family" />
        <FilterPill label="New Work" />
      </div>

      <div class="flex gap-3 mb-10">
        <BadgeNew />
        <BadgeSold />
      </div>

      <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
        <ArtworkCard title="Morning Light" :image="null" :is-new="true" status="available" />
        <ArtworkCard title="Prairie Wind" :image="null" status="available" />
        <ArtworkCard title="Autumn Gather" :image="null" status="recently_sold" />
        <ArtworkCard title="Blue Hills" :image="null" :is-new="true" status="available" />
      </div>
    </section>
  </div>
</template>
