import { createClient } from '@sanity/client'
import * as dotenv from 'dotenv'

dotenv.config()

const client = createClient({
  projectId: 'pwxocvdd',
  dataset: 'production',
  apiVersion: '2025-05-20',
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
})

async function seed() {
  console.log('Seeding Sanity...')

  // Categories
  const categoryNames = [
    'Country Life',
    'Farm Life',
    'Family',
    'Western',
    'Native American',
    'Wildlife',
    'Figurative',
    'Landscape',
  ]

  console.log('Creating categories...')
  const categoryIds: Record<string, string> = {}

  for (const name of categoryNames) {
    const slug = name.toLowerCase().replace(/\s+/g, '-')
    const existing = await client.fetch(
      `*[_type == "category" && slug.current == $slug][0]._id`,
      { slug },
    )
    if (existing) {
      console.log(`  Skipping "${name}" (already exists)`)
      categoryIds[name] = existing
      continue
    }
    const doc = await client.create({
      _type: 'category',
      name,
      slug: { _type: 'slug', current: slug },
    })
    categoryIds[name] = doc._id
    console.log(`  Created "${name}"`)
  }

  // Singleton documents (Homepage Settings, Store Banner, Site Settings, Pricing Rules)
  const singletons = [
    { _id: 'homepageSettings', _type: 'homepageSettings' },
    { _id: 'storeBanner', _type: 'storeBanner', displayStyle: 'single', bannerItems: [] },
    { _id: 'siteSettings', _type: 'siteSettings' },
    {
      _id: 'pricingRules',
      _type: 'pricingRules',
      openEditionRatePerSqIn: 0.40,
      podPaperRatePerSqIn: 0.55,
      podCanvasRatePerSqIn: 0.75,
      openEditionMinPrice: 25,
      podPaperMinPrice: 35,
      podCanvasMinPrice: 50,
      roundTo: 1,
      notes: 'Initial rates — adjust in Studio to match your actual margins.',
    },
  ]

  console.log('Creating singletons...')
  for (const doc of singletons) {
    const existing = await client.fetch(`*[_id == $id][0]._id`, { id: doc._id })
    if (existing) {
      console.log(`  Skipping ${doc._id} (already exists)`)
      continue
    }
    await client.createOrReplace(doc)
    console.log(`  Created ${doc._id}`)
  }

  // Test artwork
  console.log('Creating test artwork...')
  const testArtworkSlug = 'test-morning-light'
  const existingArtwork = await client.fetch(
    `*[_type == "artwork" && slug.current == $slug][0]._id`,
    { slug: testArtworkSlug },
  )

  if (existingArtwork) {
    console.log('  Skipping test artwork (already exists)')
  } else {
    const westernId = categoryIds['Western']
    const landscapeId = categoryIds['Landscape']
    await client.create({
      _type: 'artwork',
      title: 'Morning Light (Test)',
      slug: { _type: 'slug', current: testArtworkSlug },
      medium: 'Oil on canvas',
      dimensions: '24" × 36"',
      year: 2024,
      isNew: true,
      status: 'available',
      categories: [
        { _type: 'reference', _ref: westernId },
        { _type: 'reference', _ref: landscapeId },
      ],
    })
    console.log('  Created test artwork')
  }

  // Test product linked to test artwork
  console.log('Creating test product...')
  const artworkId = await client.fetch(
    `*[_type == "artwork" && slug.current == $slug][0]._id`,
    { slug: testArtworkSlug },
  )
  const existingProduct = await client.fetch(
    `*[_type == "product" && artwork._ref == $id][0]._id`,
    { id: artworkId },
  )
  if (existingProduct) {
    console.log('  Skipping test product (already exists)')
  } else if (artworkId) {
    await client.create({
      _type: 'product',
      artwork: { _type: 'reference', _ref: artworkId },
      productType: 'print',
      variants: [
        { _key: 'oe-8x10', mediaType: 'open_edition', size: '8x10', price: 45, inStock: true },
        { _key: 'oe-11x14', mediaType: 'open_edition', size: '11x14', price: 65, inStock: true },
        { _key: 'oe-16x20', mediaType: 'open_edition', size: '16x20', price: 95, inStock: true },
        { _key: 'pod-paper-11x14', mediaType: 'pod_paper', size: '11x14', price: 75, inStock: true },
        { _key: 'pod-canvas-16x20', mediaType: 'pod_canvas', size: '16x20', price: 145, inStock: true },
      ],
    })
    console.log('  Created test product')
  }

  console.log('\nSeed complete.')
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
