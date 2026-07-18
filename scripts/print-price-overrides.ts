/**
 * Bulk export/import for print variant price overrides.
 *
 * Export writes one row per Open Edition variant across every print product
 * (currentPrice = the existing override, blank if none — formula pricing
 * applies). Fill in newPrice in a spreadsheet, save as CSV, then import.
 *
 * Import only touches rows where newPrice is non-blank — a blank newPrice
 * means "leave this variant alone," not "clear the override." Matches each
 * row back to its exact variant via variantKey (Sanity's array item _key),
 * so edits are precise even if two variants share the same size.
 *
 * Usage:
 *   npx tsx scripts/print-price-overrides.ts --export --out open-edition-prices.csv
 *   npx tsx scripts/print-price-overrides.ts --import open-edition-prices.csv --dry-run
 *   npx tsx scripts/print-price-overrides.ts --import open-edition-prices.csv
 */
import { createClient } from '@sanity/client'
import * as dotenv from 'dotenv'
import { readFileSync, writeFileSync } from 'node:fs'

dotenv.config()

function parseArgs(argv: string[]): Record<string, string | boolean> {
  const out: Record<string, string | boolean> = {}
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a.startsWith('--')) {
      const key = a.slice(2)
      const next = argv[i + 1]
      if (!next || next.startsWith('--')) {
        out[key] = true
      } else {
        out[key] = next
        i++
      }
    }
  }
  return out
}

const args = parseArgs(process.argv.slice(2))
const EXPORT = Boolean(args.export)
const IMPORT_PATH = args.import as string | undefined
const OUT_PATH = (args.out as string) || 'open-edition-prices.csv'
const DRY_RUN = Boolean(args['dry-run'])

if (!EXPORT && !IMPORT_PATH) {
  console.error('Usage: --export [--out <path>]  OR  --import <path> [--dry-run]')
  process.exit(1)
}

const client = createClient({
  projectId: 'pwxocvdd',
  dataset: 'production',
  apiVersion: '2025-05-20',
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
})

// ---------- CSV (same quoted-field handling as scripts/import-products.ts) ----------
function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += c
      }
    } else {
      if (c === '"') {
        inQuotes = true
      } else if (c === ',') {
        row.push(field)
        field = ''
      } else if (c === '\n') {
        row.push(field)
        rows.push(row)
        row = []
        field = ''
      } else if (c === '\r') {
        // ignore
      } else {
        field += c
      }
    }
  }
  if (field || row.length) {
    row.push(field)
    rows.push(row)
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ''))
}

function csvField(value: string): string {
  return `"${value.replace(/"/g, '""')}"`
}

const HEADER = ['productId', 'title', 'slug', 'variantKey', 'size', 'inStock', 'currentPrice', 'newPrice']

interface ProductDoc {
  _id: string
  title: string | null
  slug: string | null
  variants: { _key: string; size: string; price: number | null; inStock: boolean | null }[]
}

async function runExport() {
  const products = await client.fetch<ProductDoc[]>(`
    *[_type == "product" && productType == "print" && count(variants[mediaType == "open_edition"]) > 0]
      | order(artwork->title asc) {
      _id,
      "title": artwork->title,
      "slug": artwork->slug.current,
      "variants": variants[mediaType == "open_edition"]{ _key, size, price, inStock }
    }
  `)

  const lines = [HEADER.join(',')]
  let rowCount = 0
  for (const p of products) {
    for (const v of p.variants) {
      lines.push(
        [
          csvField(p._id),
          csvField(p.title ?? ''),
          csvField(p.slug ?? ''),
          csvField(v._key),
          csvField(v.size ?? ''),
          csvField(v.inStock === false ? 'false' : 'true'),
          csvField(v.price != null ? String(v.price) : ''),
          csvField(''), // newPrice — fill this in
        ].join(','),
      )
      rowCount++
    }
  }

  writeFileSync(OUT_PATH, lines.join('\n') + '\n', 'utf8')
  console.log(`Wrote ${rowCount} Open Edition variant rows across ${products.length} products to ${OUT_PATH}`)
  console.log(`Fill in the "newPrice" column, save, then run: npx tsx scripts/print-price-overrides.ts --import ${OUT_PATH}`)
}

async function runImport() {
  const text = readFileSync(IMPORT_PATH as string, 'utf8')
  const rows = parseCSV(text)
  const [header, ...body] = rows
  const col = (name: string) => header.indexOf(name)

  const idxProductId = col('productId')
  const idxTitle = col('title')
  const idxVariantKey = col('variantKey')
  const idxSize = col('size')
  const idxNewPrice = col('newPrice')

  if ([idxProductId, idxVariantKey, idxSize, idxNewPrice].some((i) => i === -1)) {
    console.error('CSV is missing one of the required columns:', HEADER.join(', '))
    process.exit(1)
  }

  let updated = 0
  let skipped = 0
  let failed = 0

  for (const row of body) {
    const productId = row[idxProductId]
    const title = row[idxTitle]
    const variantKey = row[idxVariantKey]
    const size = row[idxSize]
    const raw = row[idxNewPrice]?.trim()

    if (!raw) {
      skipped++
      continue
    }

    const price = Number(raw)
    if (!Number.isFinite(price) || price <= 0) {
      console.error(`✗ Skipping invalid newPrice "${raw}" for ${title} (${size})`)
      failed++
      continue
    }

    console.log(`${DRY_RUN ? '[dry-run] ' : ''}${title} — ${size}: → $${price}`)
    if (!DRY_RUN) {
      try {
        await client
          .patch(productId)
          .set({ [`variants[_key=="${variantKey}"].price`]: price })
          .commit()
      } catch (err) {
        console.error(`✗ Failed to update ${title} (${size}):`, err)
        failed++
        continue
      }
    }
    updated++
  }

  console.log(
    `\n${DRY_RUN ? 'Would update' : 'Updated'} ${updated}, skipped ${skipped} (blank newPrice), ${failed} failed.`,
  )
}

if (EXPORT) {
  runExport()
} else {
  runImport()
}
