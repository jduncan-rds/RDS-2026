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

  // Singleton documents (Homepage Settings, Store Banner, Site Settings)
  const singletons = [
    { _id: 'homepageSettings', _type: 'homepageSettings' },
    { _id: 'storeBanner', _type: 'storeBanner', displayStyle: 'single', bannerItems: [] },
    { _id: 'siteSettings', _type: 'siteSettings' },
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

  console.log('\nSeed complete.')
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
