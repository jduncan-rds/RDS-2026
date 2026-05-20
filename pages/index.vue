<script setup lang="ts">
import groq from 'groq'

useSeoMeta({
  title: 'Robert Duncan Fine Art',
  description: 'Original oil paintings and fine art prints by Western and wildlife artist Robert Duncan.',
})

const { data: homepage } = await useSanityQuery(groq`
  *[_type == "homepageSettings"][0]{
    heroImages,
    heroHeadline,
    featuredArtwork[]->{
      title,
      "slug": slug.current,
      "image": images[0],
      isNew,
      status
    }
  }
`)

const { data: categories } = await useSanityQuery(groq`
  *[_type == "category"] | order(name asc){ name, "slug": slug.current }
`)
</script>

<template>
  <div>
    <!-- Hero -->
    <section v-if="homepage?.heroImages?.length">
      <HeroCarousel :images="homepage.heroImages" :headline="homepage.heroHeadline" />
    </section>
    <section v-else class="bg-brown/5 flex items-center justify-center" style="min-height: 75vh;">
      <div class="text-center px-6">
        <p class="font-ui text-xs tracking-widest uppercase text-brown/50 mb-4">The Fine Art of</p>
        <h1 class="font-heading text-brown mb-6 leading-tight">
          <span class="block text-5xl md:text-7xl">Robert Duncan</span>
        </h1>
        <p class="font-body text-lg text-brown/70 mb-10 max-w-md mx-auto">
          Original oil paintings and fine art prints — Western, wildlife, and American life.
        </p>
        <div class="flex gap-4 justify-center flex-wrap">
          <AppButton as="NuxtLink" to="/originals" variant="primary" size="lg">View Originals</AppButton>
          <AppButton as="NuxtLink" to="/shop" variant="secondary" size="lg">Shop Prints</AppButton>
        </div>
      </div>
    </section>

    <!-- Category navigation -->
    <section v-if="categories?.length" class="border-b border-brown/10">
      <div class="max-w-7xl mx-auto px-6 lg:px-10 py-6 flex gap-3 flex-wrap">
        <NuxtLink
          v-for="cat in categories"
          :key="cat.slug"
          :to="`/shop?category=${cat.slug}`"
          class="font-ui text-xs tracking-widest uppercase text-brown/60 hover:text-brown transition-colors pb-1 border-b border-transparent hover:border-brown"
        >
          {{ cat.name }}
        </NuxtLink>
      </div>
    </section>

    <!-- Featured artwork -->
    <section v-if="homepage?.featuredArtwork?.length" class="max-w-7xl mx-auto px-6 lg:px-10 py-20">
      <div class="flex items-baseline justify-between mb-10">
        <h2 class="font-heading text-3xl md:text-4xl text-brown">Featured Work</h2>
        <NuxtLink to="/originals" class="font-ui text-xs tracking-widest uppercase text-brown/50 hover:text-brown transition-colors">
          View All
        </NuxtLink>
      </div>
      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        <ArtworkCard
          v-for="artwork in homepage.featuredArtwork"
          :key="artwork.slug"
          :title="artwork.title"
          :image="artwork.image"
          :is-new="artwork.isNew"
          :status="artwork.status"
          :to="artwork.status === 'available' ? `/shop/${artwork.slug}` : undefined"
        />
      </div>
    </section>

    <!-- CTA strip -->
    <section class="bg-brown text-cream py-20">
      <div class="max-w-7xl mx-auto px-6 lg:px-10 text-center">
        <h2 class="font-heading text-3xl md:text-5xl mb-6">Fine Art Prints</h2>
        <p class="font-body text-cream/70 text-lg mb-10 max-w-md mx-auto">
          Museum-quality open edition and print-on-demand prints, available framed or unframed.
        </p>
        <AppButton as="NuxtLink" to="/shop" variant="secondary" size="lg" class="border-cream text-cream hover:bg-cream hover:text-brown">
          Shop the Collection
        </AppButton>
      </div>
    </section>
  </div>
</template>
