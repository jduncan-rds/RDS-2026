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
    featuredProducts[]->{
      _id,
      productType,
      "title": artwork->title,
      "slug": artwork->slug.current,
      "image": artwork->images[0],
      "isNew": artwork->isNew,
      "status": artwork->status
    }
  }
`)

const productTypeLabels: Record<string, string> = {
  original: 'Original',
  print: 'Print',
  calendar: 'Calendar',
  card: 'Greeting Card',
  gift: 'Gift',
}
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
          <AppButton as="NuxtLink" to="/shop/prints" variant="secondary" size="lg">Shop Prints</AppButton>
        </div>
      </div>
    </section>

    <!-- Featured work -->
    <section v-if="homepage?.featuredProducts?.length" class="max-w-7xl mx-auto px-6 lg:px-10 py-20">
      <h2 class="font-heading text-3xl md:text-4xl text-brown mb-10">Featured Work</h2>
      <div class="columns-2 md:columns-3 lg:columns-4 gap-6">
        <ArtworkCard
          v-for="item in homepage.featuredProducts"
          :key="item._id"
          class="break-inside-avoid mb-6"
          :title="item.title"
          :image="item.image"
          :is-new="item.isNew"
          :status="item.productType === 'original' ? item.status : undefined"
          :eyebrow="productTypeLabels[item.productType]"
          :to="`/shop/${item.slug}`"
        />
      </div>
    </section>
  </div>
</template>
