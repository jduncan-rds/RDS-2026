<script setup lang="ts">
import groq from 'groq'

useSeoMeta({
  title: 'Robert Duncan Fine Art',
  description: 'Original oil paintings and fine art prints by Western and wildlife artist Robert Duncan.',
})

interface HomepageSettings {
  heroImages?: any[]
  heroHeadline?: string | null
  heroHeadlineSize?: string | null
  heroQuote?: string | null
  heroQuoteAttribution?: string | null
  heroQuoteFont?: string | null
  heroQuoteSize?: string | null
  heroQuoteBackground?: string | null
  featuredProducts?: {
    _id: string
    productType: string
    title: string
    slug: string
    image?: any
    isNew?: boolean
    status?: string
  }[]
}

const { data: homepage } = await useSanityQuery<HomepageSettings>(groq`
  *[_type == "homepageSettings"][0]{
    heroImages,
    heroHeadline,
    heroHeadlineSize,
    heroQuote,
    heroQuoteAttribution,
    heroQuoteFont,
    heroQuoteSize,
    heroQuoteBackground,
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

// Hero quote styling driven by Sanity choices.
const quoteFontClasses: Record<string, string> = {
  heading: 'font-heading',
  body: 'font-body',
  ui: 'font-ui',
}
const quoteSizeClasses: Record<string, string> = {
  small: 'text-xl md:text-2xl',
  medium: 'text-2xl md:text-3xl',
  large: 'text-3xl md:text-4xl',
  xlarge: 'text-4xl md:text-5xl',
}
const quoteBgClasses: Record<string, string> = {
  none: '',
  soft: 'bg-brown/5',
  sage: 'bg-sage',
  rust: 'bg-rust',
  dark: 'bg-brown',
}
const quoteFontClass = computed(
  () => quoteFontClasses[homepage.value?.heroQuoteFont ?? 'heading'] ?? quoteFontClasses.heading,
)
const quoteSizeClass = computed(
  () => quoteSizeClasses[homepage.value?.heroQuoteSize ?? 'medium'] ?? quoteSizeClasses.medium,
)
const quoteBgClass = computed(
  () => quoteBgClasses[homepage.value?.heroQuoteBackground ?? 'none'] ?? '',
)
// Colored backgrounds need light text for contrast.
const quoteOnColor = computed(() =>
  ['sage', 'rust', 'dark'].includes(homepage.value?.heroQuoteBackground ?? 'none'),
)
</script>

<template>
  <div>
    <!-- Hero -->
    <section v-if="homepage?.heroImages?.length">
      <HeroCarousel
        :images="homepage.heroImages"
        :headline="homepage.heroHeadline"
        :headline-size="homepage.heroHeadlineSize"
      />
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

    <!-- Inspiring quote -->
    <section v-if="homepage?.heroQuote" class="px-6 lg:px-10 py-16 md:py-20" :class="quoteBgClass">
      <blockquote class="max-w-4xl mx-auto text-center">
        <p
          class="leading-snug whitespace-pre-line"
          :class="[quoteFontClass, quoteSizeClass, quoteOnColor ? 'text-cream' : 'text-brown']"
        >
          {{ homepage.heroQuote }}
        </p>
        <footer
          v-if="homepage.heroQuoteAttribution"
          class="font-ui text-xs md:text-sm tracking-widest uppercase mt-6"
          :class="quoteOnColor ? 'text-cream/70' : 'text-brown/50'"
        >
          {{ homepage.heroQuoteAttribution }}
        </footer>
      </blockquote>
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
          :to="`/shop/${item.slug}?type=${item.productType}`"
        />
      </div>
    </section>
  </div>
</template>
