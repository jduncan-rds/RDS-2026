import imageUrlBuilder from '@sanity/image-url'
import type { SanityImageSource } from '@sanity/image-url/lib/types/types'

const builder = imageUrlBuilder({ projectId: 'pwxocvdd', dataset: 'production' })

export function useSanityImageUrl(source: SanityImageSource) {
  return builder.image(source)
}
