/**
 * One-time migration: convert single-rate pricing to the three size bands.
 *
 * - pricingRules: copies the legacy top-level rates/mins into bandA/B/C (so
 *   prices are unchanged) and sets bandAMaxSqIn=250 / bandBMaxSqIn=500.
 * - frames (per-sq-in): copies the legacy ratePerSqIn into ratePerSqInA/B/C.
 *   Flat-fee frames are untouched.
 *
 * Legacy fields are intentionally LEFT in place (they're already removed from
 * the schema so they won't show in the Studio). This makes the migration safe
 * regardless of whether the new frontend code has deployed yet — both the old
 * and new code keep working through the transition. Harmless to clean up later.
 *
 * Idempotent: skips docs whose bands are already populated.
 *
 * Usage:
 *   npx tsx scripts/migrate-pricing-bands.ts --dry-run
 *   npx tsx scripts/migrate-pricing-bands.ts
 */
import { createClient } from '@sanity/client'
import * as dotenv from 'dotenv'

dotenv.config()

const DRY_RUN = process.argv.includes('--dry-run')
// Run AFTER the banded frontend code is deployed and bands are populated:
// removes the now-orphaned legacy single-rate fields (clears the Studio
// "Unknown fields" warning).
const CLEANUP = process.argv.includes('--cleanup-legacy')
// Removes the open-edition minimum-price floor from all bands (feature removed:
// open editions no longer have a price floor).
const DROP_OE_MIN = process.argv.includes('--drop-openedition-min')

const client = createClient({
  projectId: 'pwxocvdd',
  dataset: 'production',
  apiVersion: '2025-05-20',
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
})

const BAND_A_MAX = 250
const BAND_B_MAX = 500

async function migratePricingRules() {
  const doc = await client.fetch<any>(`*[_id == "pricingRules"][0]`)
  if (!doc) {
    console.log('• pricingRules: not found, skipping')
    return
  }

  const alreadyMigrated = doc.bandA?.openEditionRatePerSqIn != null
  if (alreadyMigrated) {
    console.log('• pricingRules: bands already populated — skipping')
    return
  }

  const band = {
    openEditionRatePerSqIn: doc.openEditionRatePerSqIn ?? 0,
    podPaperRatePerSqIn: doc.podPaperRatePerSqIn ?? 0,
    podCanvasRatePerSqIn: doc.podCanvasRatePerSqIn ?? 0,
    openEditionMinPrice: doc.openEditionMinPrice ?? 0,
    podPaperMinPrice: doc.podPaperMinPrice ?? 0,
    podCanvasMinPrice: doc.podCanvasMinPrice ?? 0,
  }

  console.log('• pricingRules: copying legacy rates into bands A/B/C', band)

  if (DRY_RUN) return

  await client
    .patch('pricingRules')
    .set({
      bandAMaxSqIn: doc.bandAMaxSqIn ?? BAND_A_MAX,
      bandBMaxSqIn: doc.bandBMaxSqIn ?? BAND_B_MAX,
      bandA: { ...band },
      bandB: { ...band },
      bandC: { ...band },
    })
    .commit()
  console.log('  ✓ pricingRules migrated')
}

async function migrateFrames() {
  const frames = await client.fetch<any[]>(
    `*[_type == "frame" && frameRateType == "per_sq_in" && defined(ratePerSqIn) && !defined(ratePerSqInA)]{ _id, name, ratePerSqIn }`,
  )
  if (!frames.length) {
    console.log('• frames: none needing migration — skipping')
    return
  }

  for (const f of frames) {
    console.log(`• frame "${f.name}": ratePerSqIn ${f.ratePerSqIn} → A/B/C`)
    if (DRY_RUN) continue
    await client
      .patch(f._id)
      .set({
        ratePerSqInA: f.ratePerSqIn,
        ratePerSqInB: f.ratePerSqIn,
        ratePerSqInC: f.ratePerSqIn,
      })
      .commit()
    console.log(`  ✓ ${f.name} migrated`)
  }
}

async function cleanupLegacy() {
  // pricingRules: drop legacy top-level rate/min fields (only safe once bands
  // are populated and the banded code is deployed).
  const doc = await client.fetch<any>(`*[_id == "pricingRules"][0]{ _id, bandA }`)
  if (doc?.bandA?.openEditionRatePerSqIn == null) {
    console.log('• cleanup aborted: bands not populated — run the migration first')
    return
  }
  console.log('• pricingRules: removing legacy top-level fields')
  if (!DRY_RUN) {
    await client
      .patch('pricingRules')
      .unset([
        'openEditionRatePerSqIn',
        'podPaperRatePerSqIn',
        'podCanvasRatePerSqIn',
        'openEditionMinPrice',
        'podPaperMinPrice',
        'podCanvasMinPrice',
      ])
      .commit()
    console.log('  ✓ legacy pricingRules fields removed')
  }

  // frames: drop legacy ratePerSqIn where the banded rates now exist.
  const frames = await client.fetch<any[]>(
    `*[_type == "frame" && defined(ratePerSqIn) && defined(ratePerSqInA)]{ _id, name }`,
  )
  for (const f of frames) {
    console.log(`• frame "${f.name}": removing legacy ratePerSqIn`)
    if (!DRY_RUN) {
      await client.patch(f._id).unset(['ratePerSqIn']).commit()
      console.log(`  ✓ ${f.name} cleaned`)
    }
  }
}

async function main() {
  if (!process.env.SANITY_API_TOKEN) {
    console.error('SANITY_API_TOKEN missing in .env')
    process.exit(1)
  }
  if (CLEANUP) {
    console.log(DRY_RUN ? '=== DRY RUN: cleanup ===' : '=== CLEANUP LEGACY FIELDS ===')
    await cleanupLegacy()
    console.log('Done.')
    return
  }
  if (DROP_OE_MIN) {
    console.log(DRY_RUN ? '=== DRY RUN: drop OE min ===' : '=== DROP OPEN-EDITION MIN ===')
    console.log('• pricingRules: unsetting openEditionMinPrice on bands A/B/C')
    if (!DRY_RUN) {
      await client
        .patch('pricingRules')
        .unset([
          'bandA.openEditionMinPrice',
          'bandB.openEditionMinPrice',
          'bandC.openEditionMinPrice',
        ])
        .commit()
      console.log('  ✓ removed')
    }
    console.log('Done.')
    return
  }
  console.log(DRY_RUN ? '=== DRY RUN (no writes) ===' : '=== MIGRATING ===')
  await migratePricingRules()
  await migrateFrames()
  console.log('Done.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
