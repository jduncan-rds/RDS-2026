# scripts/import-products.ts

Imports paintings from the Shopify product export CSV into Sanity, matching each painting to a local image file and creating linked `artwork` + `product` documents.

## Usage

```
npm run import:products -- --csv products_export.csv --dry-run
```

### Flags

| Flag | Default | Notes |
|---|---|---|
| `--csv <path>` | `products_export.csv` | Shopify product export CSV |
| `--images <path>` | `/Volumes/RDS External/rdfa-import/web` | Folder of resized JPEGs |
| `--dry-run` | off | Print match report, don't write to Sanity |
| `--limit <N>` | off | Only process first N paintings (useful for testing) |

## How it works

1. **Parses CSV**, groups rows by `Handle`, collects unique `(mediaType, size)` pairs per painting. Frame variants are ignored.
2. **Indexes images** from `--images` folder by a normalized match key (e.g., `0001-curious-onlookers.jpg` → `curiousonlookers`).
3. **Matches** each painting handle to an image filename via the same key.
4. **Writes** `import-report.txt` listing matched/unmatched paintings and images.
5. **Imports** each matched painting:
   - Uploads image to Sanity (`client.assets.upload` — content-deduped, safe to re-run)
   - `createOrReplace` artwork doc with deterministic `_id` (`artwork-<slug>`)
   - `createOrReplace` product doc with `productType: 'print'` and all variants

## Variant prices

All variants are imported with no explicit `price`. The site computes pricing via the per-sq-inch formula in the `pricingRules` singleton.

## Re-running

Safe to re-run any time:
- Same image upload → Sanity returns same asset (content hash dedup)
- Same artwork/product `_id` → `createOrReplace` updates in place
