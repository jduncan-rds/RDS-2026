/**
 * Size availability report.
 *
 * Pulls every PRINT product from Sanity and writes a CSV with one row per
 * painting and one column per media type (Open Edition Print / Custom Print /
 * Custom Canvas), each cell listing the sizes currently set up for that type.
 * Out-of-stock variants are flagged. Meant for Robert to eyeball which sizes
 * exist where, so he can decide what to add.
 *
 *   npm run report:sizes                 -> writes size-report.csv
 *   npm run report:sizes -- --out foo.csv
 */
import { createClient } from '@sanity/client'
import * as dotenv from 'dotenv'
import { writeFileSync } from 'node:fs'

dotenv.config()

const OUT =
  process.argv.slice(2).reduce<string | null>((acc, a, i, arr) => {
    if (a === '--out') return arr[i + 1] ?? acc
    return acc
  }, null) || 'size-report.csv'

const client = createClient({
  projectId: 'pwxocvdd',
  dataset: 'production',
  apiVersion: '2025-05-20',
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
})

const MEDIA_LABELS: Record<string, string> = {
  open_edition: 'Open Edition Print',
  pod_paper: 'Custom Print',
  pod_canvas: 'Custom Canvas',
}
const MEDIA_ORDER = ['open_edition', 'pod_paper', 'pod_canvas']

type Variant = { mediaType?: string; size?: string; inStock?: boolean }
type ProductRow = { _id: string; title: string | null; variants: Variant[] | null }

// Parse "14.375 x 22" -> area in sq in, for sorting small -> large.
function area(size: string): number {
  const m = /^\s*(\d+(?:\.\d+)?)"?\s*[x×]\s*(\d+(?:\.\d+)?)"?\s*$/i.exec(size)
  if (!m) return Number.MAX_SAFE_INTEGER
  return parseFloat(m[1]) * parseFloat(m[2])
}

function csvCell(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

async function main() {
  const products = await client.fetch<ProductRow[]>(
    `*[_type == "product" && productType == "print"]{
      _id,
      "title": artwork->title,
      variants[]{ mediaType, size, inStock }
    }`,
  )

  // Sort rows by title (case-insensitive), untitled last.
  products.sort((a, b) =>
    (a.title ?? '￿').localeCompare(b.title ?? '￿', undefined, {
      sensitivity: 'base',
    }),
  )

  const header = [
    'Painting',
    ...MEDIA_ORDER.map((m) => MEDIA_LABELS[m]),
    'DO NOT EDIT (product id)',
  ]
  const lines = [header.map(csvCell).join(',')]

  for (const p of products) {
    const byType: Record<string, Variant[]> = {}
    for (const v of p.variants ?? []) {
      if (!v.mediaType || !v.size) continue
      ;(byType[v.mediaType] ??= []).push(v)
    }
    const cells = MEDIA_ORDER.map((m) => {
      const vs = (byType[m] ?? []).sort((a, b) => area(a.size!) - area(b.size!))
      return vs
        .map((v) => (v.inStock === false ? `${v.size} (out of stock)` : v.size))
        .join(' - ')
    })
    lines.push([p.title ?? 'Untitled', ...cells, p._id].map(csvCell).join(','))
  }

  writeFileSync(OUT, lines.join('\n') + '\n', 'utf8')

  // Quick console summary.
  const totals: Record<string, number> = {}
  for (const p of products)
    for (const v of p.variants ?? [])
      if (v.mediaType) totals[v.mediaType] = (totals[v.mediaType] ?? 0) + 1
  console.log(`Wrote ${OUT} — ${products.length} print products.`)
  for (const m of MEDIA_ORDER)
    console.log(`  ${MEDIA_LABELS[m]}: ${totals[m] ?? 0} size variants`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
