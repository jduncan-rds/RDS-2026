import { createClient } from '@sanity/client'

export function createSanityClient() {
  const config = useRuntimeConfig()
  return createClient({
    projectId: 'pwxocvdd',
    dataset: 'production',
    apiVersion: '2025-05-20',
    token: config.sanityApiToken as string,
    useCdn: false,
  })
}
