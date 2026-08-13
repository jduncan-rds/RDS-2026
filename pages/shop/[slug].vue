<script setup lang="ts">
import groq from 'groq'
import { computeVariantPrice, computeFrameModifier, computePrintTotal, sqIn, parseSize, formatUsd } from '~/utils/pricing'
import type { PricingRules } from '~/utils/pricing'

const route = useRoute()
const slug = route.params.slug as string

interface ProductVariant {
  size: string
  mediaType: string
  price?: number | null
  inStock?: boolean
}

interface ProductQueryResult {
  _id: string
  productType: string
  originalPrice?: number | null
  originalForSale?: boolean
  originalUnavailableNote?: string | null
  simplePrice?: number | null
  simpleSku?: string | null
  simpleInStock?: boolean
  simpleDescription?: string | null
  productImages?: any[]
  variants?: ProductVariant[]
  artwork: {
    title: string
    slug: string
    images?: any[]
    medium?: string | null
    dimensions?: string | null
    year?: number | null
    artistNotes?: string | null
    status?: string
  }
}

interface Frame {
  _id: string
  name: string
  barImage?: any
  thumbnail?: any
  priceModifier?: number
  frameRateType?: string
  ratePerSqInA?: number
  ratePerSqInB?: number
  ratePerSqInC?: number
  ratePerSqInD?: number
  ratePerSqIn?: number
  mouldingInches?: number
}

// An artwork can back more than one product doc — e.g. a painting sold both
// as an Original and as a Print references the same artwork, so this array
// can have >1 entry for one slug. Which one to show is resolved below.
const { data: products } = await useSanityQuery<ProductQueryResult[]>(groq`
  *[_type == "product" && artwork->slug.current == $slug] {
    _id,
    productType,
    originalPrice,
    originalForSale,
    originalUnavailableNote,
    simplePrice,
    simpleSku,
    simpleInStock,
    simpleDescription,
    productImages,
    variants,
    artwork->{
      title,
      "slug": slug.current,
      images,
      medium,
      dimensions,
      year,
      artistNotes,
      status
    }
  }
`, { slug })

// Callers that know which listing they came from (Originals vs Prints vs
// Gifts) pass ?type=<productType> so we show the right one when an artwork
// backs multiple products. Without it (old links, direct visits), fall back
// to a fixed priority so the URL is at least deterministic.
const requestedType = route.query.type as string | undefined
const typePriority = ['original', 'print', 'calendar', 'card', 'gift']
const product = computed(() => {
  const list = products.value ?? []
  if (!list.length) return null
  if (requestedType) {
    const match = list.find((p) => p.productType === requestedType)
    if (match) return match
  }
  return [...list].sort(
    (a, b) => typePriority.indexOf(a.productType) - typePriority.indexOf(b.productType),
  )[0]
})

const { data: frames } = await useSanityQuery<Frame[]>(groq`
  *[_type == "frame"] | order(displayOrder asc) {
    _id, name, barImage, thumbnail, priceModifier, frameRateType,
    ratePerSqInA, ratePerSqInB, ratePerSqInC, ratePerSqInD, ratePerSqIn, mouldingInches
  }
`)

const { data: pricingRules } = await useSanityQuery<PricingRules>(groq`
  *[_id == "pricingRules"][0]
`)

const { data: printTypeInfo } = await useSanityQuery<{
  openEditionDescription?: string
  podPaperDescription?: string
  podCanvasDescription?: string
}>(groq`
  *[_id == "printTypeInfo"][0]{
    openEditionDescription,
    podPaperDescription,
    podCanvasDescription
  }
`)

if (!product.value) {
  throw createError({ statusCode: 404, statusMessage: 'Product not found' })
}

const artwork = computed(() => product.value?.artwork)
const isOriginal = computed(() => product.value?.productType === 'original')
// An original is buyable only if its artwork is available AND it hasn't been
// flagged not-for-online-purchase (e.g. consigned to a gallery).
const originalAvailable = computed(() => artwork.value?.status === 'available')
const originalForSale = computed(() => product.value?.originalForSale !== false)
const originalBuyable = computed(() => originalAvailable.value && originalForSale.value)
const isSimple = computed(() =>
  ['calendar', 'card', 'gift'].includes(product.value?.productType ?? ''),
)
const simpleTypeLabel = computed(() => {
  const map: Record<string, string> = {
    calendar: 'Calendar',
    card: 'Greeting Card',
    gift: 'Gift',
  }
  return map[product.value?.productType ?? ''] ?? ''
})

// Image gallery — show artwork images first, then any extra product photos
// (calendar shots, lifestyle mockups, packaging, etc.) added at the product
// level. All clickable as thumbnails under the main image.
const displayImages = computed(() => [
  ...(artwork.value?.images ?? []),
  ...(product.value?.productImages ?? []),
])
const activeImageIndex = ref(0)
const activeImage = computed(() => displayImages.value[activeImageIndex.value] ?? null)

const lightboxOpen = ref(false)
const lightboxImageUrl = computed(() => {
  if (!activeImage.value) return null
  return useSanityImageUrl(activeImage.value).width(1400).fit('max').auto('format').url()
})

function openFullImage() {
  if (!activeImage.value) return
  lightboxOpen.value = true
}

function onLightboxKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') lightboxOpen.value = false
}

watch(lightboxOpen, (open) => {
  if (import.meta.client) {
    document.body.classList.toggle('overflow-hidden', open)
    if (open) window.addEventListener('keydown', onLightboxKeydown)
    else window.removeEventListener('keydown', onLightboxKeydown)
  }
})

onUnmounted(() => {
  if (import.meta.client) {
    document.body.classList.remove('overflow-hidden')
    window.removeEventListener('keydown', onLightboxKeydown)
  }
})

// Product options
const mediaTypes = [
  { value: 'open_edition', label: 'Open Edition Print' },
  { value: 'pod_paper', label: 'Custom Print' },
  { value: 'pod_canvas', label: 'Custom Canvas' },
]

const availableMediaTypes = computed(() =>
  mediaTypes.filter((mt) =>
    product.value?.variants?.some((v: any) => v.mediaType === mt.value && v.inStock !== false),
  ),
)

const selectedMediaType = ref<string>(availableMediaTypes.value[0]?.value ?? 'open_edition')

// Blurb explaining the currently selected print type (editable in Sanity →
// Print Type Descriptions). Switches as the customer changes Print Type.
const mediaTypeDescription = computed(() => {
  const info = printTypeInfo.value
  if (!info) return null
  const byType: Record<string, string | undefined> = {
    open_edition: info.openEditionDescription,
    pod_paper: info.podPaperDescription,
    pod_canvas: info.podCanvasDescription,
  }
  return byType[selectedMediaType.value]?.trim() || null
})
const selectedSize = ref<string | null>(null)
const selectedFrameId = ref<string | null>(null)
const quantity = ref(1)

const availableSizes = computed(() => {
  const filtered = (product.value?.variants ?? []).filter(
    (v: any) => v.mediaType === selectedMediaType.value && v.inStock !== false,
  )
  return [...filtered].sort((a: any, b: any) => {
    const aArea = sqIn(a.size) ?? Number.MAX_SAFE_INTEGER
    const bArea = sqIn(b.size) ?? Number.MAX_SAFE_INTEGER
    return aArea - bArea
  })
})

watch(selectedMediaType, () => { selectedSize.value = null })
watch(availableSizes, (sizes) => {
  if (sizes.length === 1) selectedSize.value = sizes[0].size
}, { immediate: true })

const selectedVariant = computed(() =>
  availableSizes.value.find((v: any) => v.size === selectedSize.value) ?? null,
)

const selectedFrame = computed(() =>
  frames.value?.find((f: any) => f._id === selectedFrameId.value) ?? null,
)

// Frame thickness, in px, scaled by two things:
//  1. The artwork's real size — a fixed-width moulding reads as a thicker frame
//     on a small print and a thinner one on a large print, so we scale inversely
//     to the artwork's characteristic size (geometric mean of its dimensions).
//  2. The selected frame's real moulding width — a 3" frame should look thicker
//     than a 2" one on the same print, relative to a 2.5" baseline.
// Clamped so tiny prints don't get a giant frame nor huge ones a hairline.
// Approximate by design — it just needs to read as proportional.
const frameWidth = computed(() => {
  const mouldFactor = (selectedFrame.value?.mouldingInches ?? 2.5) / 2.5
  const sizeStr = selectedVariant.value?.size ?? artwork.value?.dimensions
  const dims = sizeStr ? parseSize(sizeStr) : null
  // base 810/characteristic gives ~45px at an 18" characteristic; 41 is the
  // fallback when size is unknown/unparseable (e.g. originals).
  const base = dims ? 810 / Math.sqrt(dims.w * dims.h) : 41
  return Math.round(Math.min(68, Math.max(20, base * mouldFactor)))
})

const displayPrice = computed(() => {
  if (isOriginal.value) return product.value?.originalPrice ?? null
  if (isSimple.value) return product.value?.simplePrice ?? null
  if (!selectedVariant.value || !pricingRules.value) return null
  const base = computeVariantPrice(
    selectedMediaType.value as any,
    selectedVariant.value.size,
    pricingRules.value,
    selectedVariant.value.price,
  )
  if (base === null) return null
  return computePrintTotal(
    base,
    computeFrameModifier(selectedFrame.value, selectedVariant.value.size, pricingRules.value),
  )
})

// Add to cart
const cart = useCartStore()
const addedToCart = ref(false)

function addToCart() {
  if (!product.value || !artwork.value) return
  if (!isOriginal.value && !isSimple.value && !selectedVariant.value) return

  const imageUrl = artwork.value.images?.[0]
    ? useSanityImageUrl(artwork.value.images[0]).width(400).auto('format').url()
    : ''

  let kind: 'original' | 'simple' | 'open_edition' | 'pod_paper' | 'pod_canvas'
  if (isOriginal.value) kind = 'original'
  else if (isSimple.value) kind = 'simple'
  else kind = selectedMediaType.value as any

  cart.add({
    productId: product.value._id,
    artworkSlug: artwork.value.slug,
    title: artwork.value.title,
    imageUrl,
    mediaType: kind,
    size: isOriginal.value || isSimple.value ? null : selectedSize.value,
    frameId: isSimple.value ? null : selectedFrameId.value,
    frameName: isSimple.value ? null : (selectedFrame.value?.name ?? null),
    quantity: quantity.value,
    unitPrice: displayPrice.value ?? 0,
  })

  addedToCart.value = true
  setTimeout(() => { addedToCart.value = false }, 2500)
}

useSeoMeta({
  title: computed(() => `${artwork.value?.title ?? 'Artwork'} — Robert Duncan Fine Art`),
  description: computed(() => `${artwork.value?.title} by Robert Duncan. ${artwork.value?.medium ?? ''}`),
})
</script>

<template>
  <div class="max-w-7xl mx-auto px-6 lg:px-10 py-12 lg:py-20">
    <div class="grid lg:grid-cols-2 gap-12 lg:gap-20 items-start">

      <!-- Image gallery -->
      <div class="lg:sticky lg:top-28">
        <ArtworkFrame :frame="selectedFrame" :frame-width="frameWidth">
          <button
            v-if="activeImage"
            type="button"
            class="block w-full cursor-zoom-in"
            title="View full-size image"
            @click="openFullImage"
          >
            <SanityImage
              :image="activeImage"
              :alt="artwork?.title ?? ''"
              :width="1200"
              fit="max"
              class="block w-full h-auto"
            />
          </button>
          <div v-else class="w-full aspect-[4/5] bg-brown/10" />
        </ArtworkFrame>

        <!-- Thumbnails -->
        <div v-if="displayImages.length > 1" class="flex gap-2 mt-4 flex-wrap">
          <button
            v-for="(img, i) in displayImages"
            :key="i"
            type="button"
            :class="[
              'w-16 h-16 overflow-hidden border transition-all duration-200',
              i === activeImageIndex ? 'border-brown' : 'border-transparent opacity-60 hover:opacity-100',
            ]"
            @click="activeImageIndex = i"
          >
            <SanityImage :image="img" :alt="`View ${i + 1}`" :width="120" fit="crop" aspect-ratio="1/1" class="w-full h-full object-cover" />
          </button>
        </div>

        <!-- Artist notes -->
        <div v-if="artwork?.artistNotes" class="mt-8 p-6 bg-brown/5">
          <p class="font-ui text-xs tracking-widest uppercase text-brown/40 mb-2">Artist Notes</p>
          <p class="font-body text-brown/70 italic leading-relaxed">{{ artwork.artistNotes }}</p>
        </div>
      </div>

      <Teleport to="body">
        <div
          v-if="lightboxOpen"
          class="fixed inset-0 z-50 flex items-center justify-center bg-brown/90 p-6 sm:p-12"
          @click="lightboxOpen = false"
        >
          <button
            type="button"
            class="absolute top-5 right-5 sm:top-8 sm:right-8 text-cream/80 hover:text-cream transition-colors font-ui text-xs tracking-widest uppercase"
            @click="lightboxOpen = false"
          >
            Close ✕
          </button>
          <img
            v-if="lightboxImageUrl"
            :src="lightboxImageUrl"
            :alt="artwork?.title ?? ''"
            class="max-w-full max-h-full object-contain"
            @click.stop
          >
        </div>
      </Teleport>

      <!-- Product details -->
      <div>
        <!-- Breadcrumb -->
        <nav class="mb-6">
          <NuxtLink to="/shop" class="font-ui text-xs tracking-widest uppercase text-brown/40 hover:text-brown transition-colors">
            Shop
          </NuxtLink>
          <span class="font-ui text-xs text-brown/20 mx-2">/</span>
          <NuxtLink
            :to="isSimple ? '/shop/gifts' : '/shop/prints'"
            class="font-ui text-xs tracking-widest uppercase text-brown/40 hover:text-brown transition-colors"
          >
            {{ isSimple ? 'Calendars & Gifts' : 'Prints &amp; Canvas' }}
          </NuxtLink>
          <span class="font-ui text-xs text-brown/20 mx-2">/</span>
          <span class="font-ui text-xs tracking-widest uppercase text-brown/60">{{ artwork?.title }}</span>
        </nav>

        <!-- Title + meta -->
        <h1 class="font-heading text-4xl md:text-5xl text-brown mb-3">{{ artwork?.title }}</h1>
        <p v-if="artwork?.medium || artwork?.dimensions" class="font-body text-brown/50 mb-8">
          {{ [artwork.medium, artwork.dimensions, artwork.year].filter(Boolean).join(' · ') }}
        </p>

        <!-- Original: simple price + buy -->
        <template v-if="isOriginal">
          <p v-if="artwork?.status !== 'archived' && product?.originalPrice != null" class="font-heading text-3xl text-brown mb-8">
            ${{ formatUsd(product.originalPrice) }}
          </p>
          <div v-if="originalBuyable">
            <AppButton variant="primary" size="lg" class="w-full sm:w-auto" @click="addToCart">
              {{ addedToCart ? 'Added to Cart ✓' : 'Add to Cart' }}
            </AppButton>
          </div>
          <!-- Available but reserved/consigned elsewhere: show where to buy -->
          <div v-else-if="originalAvailable && !originalForSale">
            <p class="font-ui text-xs tracking-widest uppercase text-brown/50 mb-3">Not available for online purchase</p>
            <p
              v-if="product?.originalUnavailableNote"
              class="font-body text-brown/70 leading-relaxed whitespace-pre-line max-w-prose"
            >
              {{ product.originalUnavailableNote }}
            </p>
          </div>
          <p v-else-if="artwork?.status === 'archived'" class="font-ui text-xs tracking-widest uppercase text-brown/40">
            This piece is archived and not currently available for purchase.
          </p>
          <p v-else class="font-ui text-xs tracking-widest uppercase text-brown/40">This piece has been sold.</p>
        </template>

        <!-- Simple (calendar / card / gift): fixed price, no framing, no size -->
        <template v-else-if="isSimple">
          <p v-if="simpleTypeLabel" class="font-ui text-xs tracking-widest uppercase text-brown/50 mb-3">
            {{ simpleTypeLabel }}
          </p>
          <p class="font-heading text-3xl text-brown mb-6">
            ${{ product?.simplePrice != null ? formatUsd(product.simplePrice) : '' }}
          </p>

          <p v-if="product?.simpleDescription" class="font-body text-brown/70 leading-relaxed mb-8">
            {{ product.simpleDescription }}
          </p>

          <!-- Quantity -->
          <div v-if="product?.simpleInStock !== false" class="mb-8">
            <p class="font-ui text-xs tracking-widest uppercase text-brown/60 mb-3">Quantity</p>
            <div class="flex items-center gap-4">
              <button
                type="button"
                class="w-8 h-8 border border-brown/30 hover:border-brown transition-colors flex items-center justify-center font-ui text-brown disabled:opacity-30"
                :disabled="quantity <= 1"
                @click="quantity = Math.max(1, quantity - 1)"
              >
                −
              </button>
              <span class="font-ui text-sm w-6 text-center">{{ quantity }}</span>
              <button
                type="button"
                class="w-8 h-8 border border-brown/30 hover:border-brown transition-colors flex items-center justify-center font-ui text-brown"
                @click="quantity++"
              >
                +
              </button>
            </div>
          </div>

          <div class="border-t border-brown/10 pt-8">
            <div v-if="product?.simpleInStock !== false">
              <div class="flex items-baseline justify-between mb-6">
                <p class="font-ui text-xs tracking-widest uppercase text-brown/50">Total</p>
                <p class="font-heading text-3xl text-brown">
                  ${{ formatUsd((product?.simplePrice ?? 0) * quantity) }}
                </p>
              </div>
              <AppButton
                variant="primary"
                size="lg"
                class="w-full"
                :disabled="!displayPrice"
                @click="addToCart"
              >
                {{ addedToCart ? 'Added to Cart ✓' : 'Add to Cart' }}
              </AppButton>
            </div>
            <p v-else class="font-ui text-xs tracking-widest uppercase text-brown/40">
              Out of stock.
            </p>
          </div>
        </template>

        <!-- Print: full selector UI -->
        <template v-else>
          <!-- Media type selector -->
          <div class="mb-5">
            <p class="font-ui text-xs tracking-widest uppercase text-brown/60 mb-3">Print Type</p>
            <div class="flex flex-wrap gap-3">
              <button
                v-for="mt in availableMediaTypes"
                :key="mt.value"
                type="button"
                :class="[
                  'font-ui text-xs tracking-widest uppercase px-4 py-2 border transition-colors duration-200',
                  selectedMediaType === mt.value
                    ? 'bg-brown text-cream border-brown'
                    : 'bg-transparent text-brown border-brown/30 hover:border-brown',
                ]"
                @click="selectedMediaType = mt.value"
              >
                {{ mt.label }}
              </button>
            </div>
            <p
              v-if="mediaTypeDescription"
              class="font-body text-sm text-brown/60 leading-relaxed mt-3"
            >
              {{ mediaTypeDescription }}
            </p>
          </div>

          <!-- Size selector -->
          <div class="mb-8">
            <p class="font-ui text-xs tracking-widest uppercase text-brown/60 mb-3">Size</p>
            <div class="flex flex-wrap gap-3">
              <button
                v-for="variant in availableSizes"
                :key="variant.size"
                type="button"
                :class="[
                  'font-ui text-xs tracking-widest uppercase px-4 py-2 border transition-colors duration-200',
                  selectedSize === variant.size
                    ? 'bg-brown text-cream border-brown'
                    : 'bg-transparent text-brown border-brown/30 hover:border-brown',
                ]"
                @click="selectedSize = variant.size"
              >
                {{ variant.size }}
              </button>
            </div>
            <p v-if="!availableSizes.length" class="font-body text-sm text-brown/40 italic mt-2">
              No sizes available for this print type.
            </p>
          </div>

          <!-- Frame picker -->
          <div v-if="frames?.length" class="mb-8">
            <FramePicker
              :frames="frames"
              :selected-id="selectedFrameId"
              @select="selectedFrameId = $event"
            />
          </div>

          <!-- Quantity -->
          <div class="mb-8">
            <p class="font-ui text-xs tracking-widest uppercase text-brown/60 mb-3">Quantity</p>
            <div class="flex items-center gap-4">
              <button
                type="button"
                class="w-8 h-8 border border-brown/30 hover:border-brown transition-colors flex items-center justify-center font-ui text-brown disabled:opacity-30"
                :disabled="quantity <= 1"
                @click="quantity = Math.max(1, quantity - 1)"
              >
                −
              </button>
              <span class="font-ui text-sm w-6 text-center">{{ quantity }}</span>
              <button
                type="button"
                class="w-8 h-8 border border-brown/30 hover:border-brown transition-colors flex items-center justify-center font-ui text-brown"
                @click="quantity++"
              >
                +
              </button>
            </div>
          </div>

          <!-- Price + Add to cart -->
          <div class="border-t border-brown/10 pt-8">
            <div class="flex items-baseline justify-between mb-6">
              <p class="font-ui text-xs tracking-widest uppercase text-brown/50">Total</p>
              <p class="font-heading text-3xl text-brown">
                {{ displayPrice ? `$${formatUsd(displayPrice * quantity)}` : '—' }}
              </p>
            </div>
            <AppButton
              variant="primary"
              size="lg"
              class="w-full"
              :disabled="!selectedSize || !displayPrice"
              @click="addToCart"
            >
              {{ addedToCart ? 'Added to Cart ✓' : 'Add to Cart' }}
            </AppButton>
            <p v-if="!selectedSize" class="mt-3 font-ui text-xs text-brown/40 text-center">
              Please select a size
            </p>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
