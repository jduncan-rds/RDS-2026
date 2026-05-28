import { createClient } from '@sanity/client'
import * as dotenv from 'dotenv'
import { readFileSync, readdirSync, createReadStream, writeFileSync } from 'node:fs'
import * as path from 'node:path'

dotenv.config()

// ---------- CLI args ----------
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
const CSV_PATH = (args.csv as string) || 'products_export.csv'
const IMAGES_DIR =
  (args.images as string) || '/Volumes/RDS External/rdfa-import/web'
const DRY_RUN = Boolean(args['dry-run'])
const LIMIT = args.limit ? parseInt(args.limit as string, 10) : null

const client = createClient({
  projectId: 'pwxocvdd',
  dataset: 'production',
  apiVersion: '2025-05-20',
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
})

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
  return rows
}

// ---------- Size parsing: "18 1/2 x 28" -> "18.5x28" ----------
function parseFraction(str: string): number {
  const s = str.trim()
  if (/^\d+(\.\d+)?$/.test(s)) return parseFloat(s)
  const mixed = s.match(/^(\d+)\s+(\d+)\/(\d+)$/)
  if (mixed) {
    return (
      Math.round(
        (parseInt(mixed[1], 10) +
          parseInt(mixed[2], 10) / parseInt(mixed[3], 10)) *
          1000,
      ) / 1000
    )
  }
  const frac = s.match(/^(\d+)\/(\d+)$/)
  if (frac) {
    return (
      Math.round((parseInt(frac[1], 10) / parseInt(frac[2], 10)) * 1000) / 1000
    )
  }
  return NaN
}

function normalizeSize(size: string): string | null {
  if (!size) return null
  const parts = size.split(/\s*[x×]\s*/i)
  if (parts.length !== 2) return null
  const w = parseFraction(parts[0])
  const h = parseFraction(parts[1])
  if (isNaN(w) || isNaN(h)) return null
  return `${w} x ${h}`
}

// ---------- Media type mapping ----------
function mapMediaType(media: string): string | null {
  if (media === 'Open Edition Print') return 'open_edition'
  if (media === 'Custom Printed Canvas') return 'pod_canvas'
  if (media === 'Custom Printed Paper') return 'pod_paper'
  return null
}

// ---------- Match keys ----------
const STOPWORDS = new Set(['a', 'an', 'the'])

// Tokenize a string into normalized comparable tokens:
// - lowercase
// - & -> and
// - strip possessive 's
// - split on non-alphanumeric
// - drop articles (a/an/the)
function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/(\w)'s\b/g, '$1')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter((t) => t.length > 0 && !STOPWORDS.has(t))
}

// "0001-curious-onlookers.jpg" -> ["curious", "onlookers"]
function imageTokens(filename: string): string[] {
  const stem = filename.replace(/\.[^.]+$/, '')
  const noPrefix = stem.replace(/^\d+-?/, '')
  return tokenize(noPrefix)
}

// "curious-onlookers-open-edition-print" -> ["curious", "onlookers"]
function handleTokens(handle: string): string[] {
  const noSuffix = handle.replace(/-open-edition-print$/, '')
  return tokenize(noSuffix)
}

// Match if token sets are equal OR one is a subset of the other.
// Subset matching lets "the pony cart" match "pony cart" etc.
function tokensMatch(a: string[], b: string[]): boolean {
  const aSet = new Set(a)
  const bSet = new Set(b)
  if (aSet.size === 0 || bSet.size === 0) return false
  const aSubB = [...aSet].every((t) => bSet.has(t))
  const bSubA = [...bSet].every((t) => aSet.has(t))
  return aSubB || bSubA
}

// "curious-onlookers-open-edition-print" -> "curious-onlookers"
function handleToSlug(handle: string): string {
  return handle.replace(/-open-edition-print$/, '')
}

// Load optional manual alias overrides: { "csv-handle-without-suffix": "image-stem-without-ext" }
function loadAliases(): Record<string, string> {
  try {
    const text = readFileSync('scripts/aliases.json', 'utf-8')
    return JSON.parse(text)
  } catch {
    return {}
  }
}

// ---------- Types ----------
type Variant = { mediaType: string; size: string }
type Painting = {
  handle: string
  title: string
  imageUrl: string
  variants: Variant[]
  seen: Set<string>
}
type MatchedPainting = Omit<Painting, 'seen'> & { imagePath: string }

// ---------- Load paintings from CSV ----------
function loadPaintings(csvPath: string): Painting[] {
  const text = readFileSync(csvPath, 'utf-8')
  const rows = parseCSV(text)
  const header = rows[0]
  const col = (name: string) => header.indexOf(name)
  const COL_HANDLE = col('Handle')
  const COL_TITLE = col('Title')
  const COL_MEDIA = col('Option1 Value')
  const COL_SIZE = col('Option2 Value')
  const COL_IMG = col('Image Src')

  const paintings = new Map<string, Painting>()
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i]
    if (!r[COL_HANDLE]) continue
    const handle = r[COL_HANDLE]
    if (!paintings.has(handle)) {
      paintings.set(handle, {
        handle,
        title: '',
        imageUrl: '',
        variants: [],
        seen: new Set(),
      })
    }
    const p = paintings.get(handle)!
    if (r[COL_TITLE] && !p.title) p.title = r[COL_TITLE]
    if (r[COL_IMG] && !p.imageUrl) p.imageUrl = r[COL_IMG]

    const mediaType = mapMediaType(r[COL_MEDIA])
    if (!mediaType) continue
    const size = normalizeSize(r[COL_SIZE])
    if (!size) continue
    const key = `${mediaType}|${size}`
    if (p.seen.has(key)) continue
    p.seen.add(key)
    p.variants.push({ mediaType, size })
  }

  return Array.from(paintings.values()).filter(
    (p) => p.title && p.variants.length > 0,
  )
}

// ---------- Index images on disk ----------
type IndexedImage = { path: string; filename: string; tokens: string[] }

function loadImages(dir: string): IndexedImage[] {
  return readdirSync(dir)
    .filter((f) => /\.(jpe?g|png)$/i.test(f))
    .map((f) => ({
      path: path.join(dir, f),
      filename: f,
      tokens: imageTokens(f),
    }))
}

// ---------- Main ----------
async function main() {
  console.log(`Loading CSV from ${CSV_PATH}...`)
  const paintings = loadPaintings(CSV_PATH)
  console.log(`  Found ${paintings.length} unique paintings`)

  console.log(`Indexing images from ${IMAGES_DIR}...`)
  const allImages = loadImages(IMAGES_DIR)
  console.log(`  Found ${allImages.length} image files`)

  const aliases = loadAliases()
  if (Object.keys(aliases).length > 0) {
    console.log(`  Loaded ${Object.keys(aliases).length} manual aliases`)
  }

  // Match paintings to images. Strategy per painting:
  //   1. Check aliases.json — explicit override wins
  //   2. Token-set equality / subset match
  // First image to match a painting wins; subsequent paintings can't reuse it.
  const used = new Set<string>() // image filenames already claimed
  const aliasByFilename = new Map<string, IndexedImage>()
  for (const img of allImages) {
    const stem = img.filename.replace(/\.[^.]+$/, '')
    aliasByFilename.set(stem, img)
  }

  const matched: MatchedPainting[] = []
  const unmatchedCSV: Painting[] = []

  for (const p of paintings) {
    const csvSlug = handleToSlug(p.handle)
    let hit: IndexedImage | undefined

    // 1. Alias override
    if (aliases[csvSlug]) {
      hit = aliasByFilename.get(aliases[csvSlug])
    }

    // 2. Token match
    if (!hit) {
      const pTokens = handleTokens(p.handle)
      hit = allImages.find(
        (img) => !used.has(img.filename) && tokensMatch(pTokens, img.tokens),
      )
    }

    if (hit) {
      used.add(hit.filename)
      const { seen: _seen, ...rest } = p
      matched.push({ ...rest, imagePath: hit.path })
    } else {
      unmatchedCSV.push(p)
    }
  }
  const unmatchedImages = allImages
    .filter((img) => !used.has(img.filename))
    .map((img) => img.path)

  // Match report
  console.log(`\n=== Match Report ===`)
  console.log(`✓ Matched: ${matched.length}`)
  console.log(`⚠ Paintings with no image: ${unmatchedCSV.length}`)
  console.log(`⚠ Images with no CSV entry: ${unmatchedImages.length}`)

  // Write full reports to disk
  const reportLines: string[] = []
  reportLines.push(`=== Import Match Report ===\n`)
  reportLines.push(`Matched: ${matched.length}`)
  reportLines.push(`Paintings without images: ${unmatchedCSV.length}`)
  reportLines.push(`Images without CSV entries: ${unmatchedImages.length}\n`)
  if (unmatchedCSV.length > 0) {
    reportLines.push(`\n--- Paintings without images ---`)
    for (const p of unmatchedCSV) {
      reportLines.push(`  ${p.title}  (handle: ${p.handle})`)
    }
  }
  if (unmatchedImages.length > 0) {
    reportLines.push(`\n--- Images without CSV entries ---`)
    for (const f of unmatchedImages) {
      reportLines.push(`  ${path.basename(f)}`)
    }
  }
  writeFileSync('import-report.txt', reportLines.join('\n'))
  console.log(`\nFull report written to import-report.txt`)

  if (DRY_RUN) {
    console.log('\n[DRY RUN] No changes will be made.')
    console.log('\nSample of what would be imported:')
    for (const p of matched.slice(0, 3)) {
      console.log(`\n  ${p.title}`)
      console.log(`    Image: ${path.basename(p.imagePath)}`)
      console.log(`    Variants:`)
      for (const v of p.variants) {
        console.log(`      ${v.mediaType} — ${v.size}`)
      }
    }
    return
  }

  // Import to Sanity
  if (!process.env.SANITY_API_TOKEN) {
    console.error('\n✗ SANITY_API_TOKEN not set in .env — cannot write to Sanity.')
    process.exit(1)
  }

  console.log('\n=== Importing to Sanity ===')
  const toProcess = LIMIT ? matched.slice(0, LIMIT) : matched
  let success = 0
  let failed = 0
  const failures: string[] = []

  for (let i = 0; i < toProcess.length; i++) {
    const p = toProcess[i]
    const slug = handleToSlug(p.handle)
    const artworkId = `artwork-${slug}`
    const productId = `product-${slug}`
    process.stdout.write(
      `  [${i + 1}/${toProcess.length}] ${p.title}... `,
    )
    try {
      // Upload image (Sanity content-dedupes; safe to re-run)
      const stream = createReadStream(p.imagePath)
      const asset = await client.assets.upload('image', stream, {
        filename: path.basename(p.imagePath),
      })

      // Artwork document
      await client.createOrReplace({
        _id: artworkId,
        _type: 'artwork',
        title: p.title,
        slug: { _type: 'slug', current: slug },
        images: [
          {
            _key: 'img-0',
            _type: 'image',
            asset: { _type: 'reference', _ref: asset._id },
          },
        ],
      })

      // Product document
      await client.createOrReplace({
        _id: productId,
        _type: 'product',
        artwork: { _type: 'reference', _ref: artworkId },
        productType: 'print',
        variants: p.variants.map((v, idx) => ({
          _key: `v${idx}-${v.mediaType}-${v.size.replace(/[^a-z0-9]/gi, '')}`,
          mediaType: v.mediaType,
          size: v.size,
          inStock: true,
        })),
      })
      console.log('✓')
      success++
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.log('✗ ' + msg)
      failures.push(`${p.title}: ${msg}`)
      failed++
    }
  }

  console.log(`\n=== Done ===`)
  console.log(`✓ Success: ${success}`)
  console.log(`✗ Failed:  ${failed}`)
  if (failures.length > 0) {
    console.log('\nFailures:')
    for (const f of failures) console.log(`  ${f}`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
