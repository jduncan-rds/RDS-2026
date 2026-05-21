# Dynamic Pricing Architecture — RDS-2026

*Analysis by Claude Sonnet + Opus, 2026-05-20. No code changes made.*

---

## The Proposal

Replace manual per-variant prices with a formula: base rate per square inch × print area, with frame modifiers on top. This means a rate change in one place updates every size automatically.

---

## Decisions & Recommendations

### 1. Where do rates live?

**Recommendation: Sanity `pricingRules` singleton document.**

The site is built so that publishing a change in Sanity shows up on the next page load — no rebuild. Rates in Sanity inherit that for free. Environment variables still require a Vercel redeploy. Hardcoded values require a code deploy. Sanity is the right fit.

Robert (or you) edits rates in Studio → published → live immediately.

**Important guardrail:** if rates are missing or zero, the server must *block checkout* with an error rather than silently compute a $0 price. Never let a bad rate produce a sellable item.

---

### 2. Which products use formula pricing?

**All three print types use the sq-inch formula, each with their own rate. Originals keep a fixed price per piece.**

| Product Type | Pricing Method |
|---|---|
| Original Painting | Fixed `originalPrice` set per piece — no formula |
| Open Edition Print (`open_edition`) | Formula: sq inches × open edition rate (lowest rate) |
| POD Paper (`pod_paper`) | Formula: sq inches × paper rate |
| POD Canvas (`pod_canvas`) | Formula: sq inches × canvas rate (highest rate) |

**Example — 12×16 print (192 sq in):**
| Type | Rate | Price |
|---|---|---|
| Open Edition | $0.40/sq in | ~$77 |
| POD Paper | $0.55/sq in | ~$106 |
| POD Canvas | $0.75/sq in | $144 |

*(Rates above are illustrative — set to whatever matches your margins.)*

Originals are priced individually because each piece is unique — a formula doesn't make sense for one-of-a-kind work.

---

### 3. Frame pricing — flat fee or per sq inch?

**Recommendation: per square inch, with a flat minimum floor.**

Real custom framing is priced by how much moulding is used, which scales with the print size. A flat fee would overcharge small prints and undercharge large ones. Per-sq-inch is how the framing industry actually works, so customers familiar with custom framing will find it fair.

The frame schema gets two new fields:
- `frameRateType`: `flat` or `per_sq_in`
- `ratePerSqIn`: dollar amount

The existing `priceModifier` field stays as the fallback for flat-priced frames — no breaking change to existing frame data.

**Open question before building:** For per-sq-inch frames, do we charge on the print's square inches or united inches (width + height)? This should match how Art City bills framing. Worth confirming.

---

### 4. Parsing size strings

Sizes are stored as free text like `"11x14"`. The parser needs to handle:
- Standard: `"11x14"`, `"16x20"`
- Decimals: `"8.5x11"`
- Spacing variants: `"16 x 20"`, `"16X20"`
- Unicode multiply sign: `"24×36"` (Robert may copy/paste this)
- Inch marks: `'11"x14"'`

A shared `parseSize()` utility will be used by **both** the product page (display) and the server checkout route. Same code, same result — prevents display/charge drift.

**Also:** Add a validation regex to the `size` field in the Sanity product schema so malformed sizes can't be saved in the first place.

---

### 5. Minimum price floor

**Recommendation: yes — per media type, stored in `pricingRules`.**

This protects against:
- A small size + low rate producing a price that doesn't cover Art City's minimums + Stripe fees
- A fat-fingered rate edit (e.g. `0.05` instead of `0.5`) producing absurdly low prices

Final price = `max(computed, floorForMediaType)`. Canvas floor > paper floor.

---

### 6. Backward compatibility

**Recommendation: keep `price` on POD variants as an optional manual override.**

The existing seeded POD variants have prices set. Those keep working as overrides until deliberately cleared — nothing breaks on launch day. If a variant has a manual price set, it wins. If empty, the formula runs.

Open editions: `price` stays required. POD: `price` becomes optional.

---

### 7. Production risks to know about

- **Stripe requires integer cents.** All math is done in dollars, then converted to cents at the very end with `Math.round(dollars * 100)`. Never sum floating point values and hope.
- **Display vs. server price must match.** If the client shows $95 and the server charges $96, trust is damaged. The shared compute module solves this — client and server use identical logic.
- **Missing rates block checkout.** A null rate throws an error and stops the transaction. This is intentional.
- **Price changes between cart add and checkout.** Server is always authoritative. If rates change, the customer gets charged the new price at checkout — the checkout page will show the correct price before they confirm payment.

---

## What the `pricingRules` Singleton Would Contain

| Field | Description |
|---|---|
| `openEditionRatePerSqIn` | Dollar rate per sq inch for open edition prints |
| `podPaperRatePerSqIn` | Dollar rate per sq inch for POD paper prints |
| `podCanvasRatePerSqIn` | Dollar rate per sq inch for POD canvas prints |
| `openEditionMinPrice` | Minimum charge for any open edition print |
| `podPaperMinPrice` | Minimum charge for any paper print |
| `podCanvasMinPrice` | Minimum charge for any canvas print |
| `roundTo` | Round computed price to nearest amount (e.g. `1` = whole dollars, `5` = nearest $5) |
| `notes` | Internal notes about why rates are set the way they are |

---

## Files That Would Change When We Build This

| File | Change |
|---|---|
| `sanity/schemas/pricingRules.ts` | New singleton schema |
| `sanity/schemas/product.ts` | `price` field becomes optional for POD variants; add size validation regex |
| `sanity/schemas/frame.ts` | Add `frameRateType` and `ratePerSqIn` fields |
| `sanity/schemas/index.ts` | Register `pricingRules` |
| `sanity.config.ts` | Add `pricingRules` to singleton list + Studio structure |
| `sanity/seed.ts` | Seed initial `pricingRules` doc; relax POD variant price requirement |
| `utils/pricing.ts` | New shared module: `parseSize()`, `computeVariantPrice()`, `computeFrameModifier()` |
| `server/api/checkout.post.ts` | Use `utils/pricing.ts` for server-authoritative price computation |
| `pages/shop/[slug].vue` | Use `utils/pricing.ts` for display price |

---

## Summary

The cleanest approach: rates live in Sanity (editable without deploys), POD prints compute price from sq inches, open editions and originals stay manual, frames scale per sq inch, and one shared utility module ensures client display and server charge are always identical. The `price` field on POD variants becomes an optional override rather than required, so existing data keeps working.

Ready to build when you give the go-ahead.
