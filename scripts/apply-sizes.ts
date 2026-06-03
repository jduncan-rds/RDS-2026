/**
 * Apply edited size-report.csv back into Sanity.
 *
 * Reads the CSV produced by scripts/size-report.ts (after Robert has typed in
 * new sizes), matches each row to its product by the "DO NOT EDIT (product id)"
 * column, and ADDS any size that is in the CSV but not yet in Sanity. It is:
 *   - additive only — never deletes, reorders, or edits existing variants
 *   - idempotent      — re-running adds nothing new
 *   - dry-run by default — prints exactly what it WOULD add; pass --apply to write
 *
 * New variants are created with formula pricing (no override) and inStock: true.
 * Fractions like "14 3/8" are auto-converted to exact decimals (14.375) and the
 * conversion is listed so you can verify. Unparseable sizes are reported, never
 * written.
 *
 *   npx tsx scripts/apply-sizes.ts                 # dry run, reads size-report.csv
 *   npx tsx scripts/apply-sizes.ts --csv foo.csv   # dry run, custom file
 *   npx tsx scripts/apply-sizes.ts --apply         # actually write to Sanity
 */
import { createClient } from '@sanity/client'
import * as dotenv from 'dotenv'
import { readFileSync } from 'node:fs'

dotenv.config()

function arg(name: string): string | null {
  const argv = process.argv.slice(2)
  const i = argv.indexOf(`--${name}`)
  if (i === -1) return null
  const next = argv[i + 1]
  return next && !next.startsWith('--') ? next : ''
}
const CSV_PATH = arg('csv') || 'size-report.csv'
const APPLY = process.argv.slice(2).includes('--apply')

const client = createClient({
  projectId: 'pwxocvdd',
  dataset: 'production',
  apiVersion: '2025-05-20',
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
})

// Header label -> mediaType value. Must match scripts/size-report.ts.
const LABEL_TO_MEDIA: Record<string, string> = {
  'Open Edition Print': 'open_edition',
  'Custom Print': 'pod_paper',
  'Custom Canvas': 'pod_canvas',
}

// ---------- CSV parser (handles quoted fields w/ embedded commas) ----------
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
        } else inQuotes = false
      } else field += c
    } else if (c === '"') inQuotes = true
    else if (c === ',') {
      row.push(field)
      field = ''
    } else if (c === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else if (c !== '\r') field += c
  }
  if (field || row.length) {
    row.push(field)
    rows.push(row)
  }
  return rows
}

// "18 1/2" -> 18.5 ; "14.375" -> 14.375 ; bad -> NaN
function parseDim(str: string): number {
  const s = str.trim()
  if (/^\d+(\.\d+)?$/.test(s)) return parseFloat(s)
  const mixed = s.match(/^(\d+)\s+(\d+)\/(\d+)$/)
  if (mixed)
    return (
      Math.round(
        (parseInt(mixed[1], 10) + parseInt(mixed[2], 10) / parseInt(mixed[3], 10)) * 1000,
      ) / 1000
    )
  const frac = s.match(/^(\d+)\/(\d+)$/)
  if (frac) return Math.round((parseInt(frac[1], 10) / parseInt(frac[2], 10)) * 1000) / 1000
  return NaN
}

// "16 x 21.5" -> { size: "16 x 21.5", isFraction } ; null if unparseable
function normalizeSize(raw: string): { size: string; isFraction: boolean } | null {
  const cleaned = raw.replace(/\(out of stock\)/i, '').replace(/"/g, '').trim()
  if (!cleaned) return null
  const parts = cleaned.split(/\s*[x×]\s*/i)
  if (parts.length !== 2) return null
  const w = parseDim(parts[0])
  const h = parseDim(parts[1])
  if (isNaN(w) || isNaN(h)) return null
  const isFraction = /\//.test(cleaned)
  return { size: `${w} x ${h}`, isFraction }
}

type Variant = { _key?: string; mediaType?: string; size?: string }

async function main() {
  const rows = parseCSV(readFileSync(CSV_PATH, 'utf8'))
  if (rows.length < 2) {
    console.error(`No data rows in ${CSV_PATH}`)
    process.exit(1)
  }
  const header = rows[0]
  const idCol = header.length - 1 // last column is the product id
  // media columns: header cells (excluding first "Painting" and last id) that map to a mediaType
  const mediaCols: { col: number; mediaType: string; label: string }[] = []
  for (let c = 1; c < idCol; c++) {
    const media = LABEL_TO_MEDIA[header[c].trim()]
    if (media) mediaCols.push({ col: c, mediaType: media, label: header[c].trim() })
  }

  // Current state: every print product's variants, keyed by _id.
  const products = await client.fetch<{ _id: string; variants: Variant[] | null }[]>(
    `*[_type == "product" && productType == "print"]{ _id, variants[]{ _key, mediaType, size } }`,
  )
  const byId = new Map(products.map((p) => [p._id, p]))

  const errors: string[] = []
  const conversions: string[] = []
  // Per product: list of variants to append.
  const additions: { id: string; title: string; adds: Variant[] }[] = []

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r]
    if (row.every((cell) => cell.trim() === '')) continue
    const id = (row[idCol] ?? '').trim()
    const title = (row[0] ?? '').trim() || '(untitled)'
    if (!id) {
      errors.push(`Row ${r + 1} ("${title}"): missing product id — skipped`)
      continue
    }
    const product = byId.get(id)
    if (!product) {
      errors.push(`Row ${r + 1} ("${title}"): product id "${id}" not found in Sanity — skipped`)
      continue
    }

    const existing = product.variants ?? []
    const usedKeys = new Set(existing.map((v) => v._key).filter(Boolean) as string[])
    const adds: Variant[] = []

    for (const { col, mediaType, label } of mediaCols) {
      const cell = (row[col] ?? '').trim()
      if (!cell) continue
      const existingSizes = new Set(
        existing.filter((v) => v.mediaType === mediaType).map((v) => v.size),
      )
      const seenThisCell = new Set<string>()
      for (const part of cell.split(/\s+-\s+/)) {
        const piece = part.trim()
        if (!piece) continue
        const norm = normalizeSize(piece)
        if (!norm) {
          errors.push(`"${title}" / ${label}: cannot parse size "${piece}" — skipped`)
          continue
        }
        if (norm.isFraction)
          conversions.push(`"${title}" / ${label}: "${piece}" -> ${norm.size}`)
        if (existingSizes.has(norm.size) || seenThisCell.has(norm.size)) continue
        seenThisCell.add(norm.size)
        // deterministic key so re-running can't duplicate
        let key = `add-${mediaType}-${norm.size.replace(/[^a-z0-9]/gi, '')}`
        let n = 2
        while (usedKeys.has(key)) key = `add-${mediaType}-${norm.size.replace(/[^a-z0-9]/gi, '')}-${n++}`
        usedKeys.add(key)
        adds.push({ _key: key, mediaType, size: norm.size })
      }
    }

    if (adds.length) additions.push({ id, title, adds })
  }

  // ---------- Report ----------
  console.log(`\nReading ${CSV_PATH} — ${rows.length - 1} rows, ${products.length} print products in Sanity.\n`)

  if (conversions.length) {
    console.log(`Fraction conversions (verify these):`)
    conversions.forEach((c) => console.log(`  ${c}`))
    console.log('')
  }
  if (errors.length) {
    console.log(`Problems (NOT written):`)
    errors.forEach((e) => console.log(`  ${e}`))
    console.log('')
  }

  const totalAdds = additions.reduce((s, a) => s + a.adds.length, 0)
  if (!totalAdds) {
    console.log('No new sizes to add. Nothing to do.')
    return
  }
  console.log(`${totalAdds} new size variant(s) across ${additions.length} product(s):`)
  for (const a of additions) {
    console.log(`  ${a.title}`)
    for (const v of a.adds) console.log(`    + ${LABEL_OF(v.mediaType!)} — ${v.size}`)
  }

  if (!APPLY) {
    console.log(`\nDRY RUN. Re-run with --apply to write these to Sanity.`)
    return
  }

  console.log(`\nApplying...`)
  for (const a of additions) {
    await client
      .patch(a.id)
      .setIfMissing({ variants: [] })
      .append(
        'variants',
        a.adds.map((v) => ({ _key: v._key, mediaType: v.mediaType, size: v.size, inStock: true })),
      )
      .commit()
    console.log(`  ✓ ${a.title} (+${a.adds.length})`)
  }
  console.log(`\nDone. Added ${totalAdds} variant(s).`)
}

function LABEL_OF(mediaType: string): string {
  return (
    Object.entries(LABEL_TO_MEDIA).find(([, v]) => v === mediaType)?.[0] ?? mediaType
  )
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
