import { createImageUrlBuilder } from '@sanity/image-url'
import type { SanityImageSource } from '@sanity/image-url'

const builder = createImageUrlBuilder({ projectId: 'pwxocvdd', dataset: 'production' })

export function useSanityImageUrl(source: SanityImageSource) {
  return builder.image(source)
}
