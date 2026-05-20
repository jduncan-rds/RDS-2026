# Robert Duncan Fine Art — Website Project Plan

## Project Overview

A custom artist website and e-commerce store for Robert Duncan's artwork. The site will serve as both a portfolio/archive and a fully functional store selling original oil paintings and prints (open edition and print-on-demand). Robert will manage all content himself through a simple CMS interface. Fulfillment for prints routes automatically to Art City (drop shipper) — routing method to be confirmed via spike (see Phase 2). Originals are shipped by Robert directly.

---

## Tech Stack

| Layer | Tool | Purpose |
|---|---|---|
| Frontend | Nuxt.js 3 (Vue) | Full site — dev's existing Vue expertise |
| Styling | Tailwind CSS | Utility-first, fast to build clean layouts |
| CMS | Sanity | Robert's admin — artwork, products, banners |
| Auth + DB | Supabase | Customer accounts, favorites |
| Payments | Stripe Checkout (hosted) | Handles tax, address, receipts, SCA, PCI scope |
| Order Routing | TBD (spike in Phase 2) | Auto-route print orders to Art City — confirm ShipStation vs. Art City's own API |
| Hosting | Vercel | Best SSR + on-demand ISR support for Nuxt |

---

## Site Map

| Page | Route | Notes |
|---|---|---|
| Home | `/` | Hero banner, featured work, category nav |
| Original Artwork | `/originals` | Three sections: Available, Recently Sold, Archived |
| Shop | `/shop` | All prints, filterable, promo banner |
| Product Detail | `/shop/[slug]` | Full product page with frame picker |
| About | `/about` | Robert's bio, photo, artist statement |
| Contact | `/contact` | Contact form → email (with spam protection) |
| Customer Account | `/account` | Orders, favorites, profile |
| Login / Signup | `/login` | Supabase auth |
| Checkout | `/checkout` | Redirects to Stripe Checkout hosted session |
| Order Confirmation | `/order/[id]` | Post-purchase confirmation (order pre-created at PaymentIntent time) |

---

## Design Direction

**Aesthetic:** Warm, clean, professional. Art always takes center stage.

**Color Palette:**
- Background: warm off-white / cream (not stark white)
- Text: deep warm brown or charcoal
- Accents: muted rust, sage green, dusty blue — used sparingly
- Generous whitespace throughout

> **Accessibility note:** The warm low-contrast palette risks failing WCAG AA contrast ratios. Verify text/background combinations early in Phase 2.5 before the design system is locked.

**Typography:**
- Headings: Playfair Display or Cormorant Garamond (classic, slightly rustic serif)
- Body: EB Garamond or Libre Baskerville (warm, readable)
- UI / nav labels: Raleway (light weight sans — keeps it from feeling heavy)

---

## Rendering Strategy

**Decision: SSR (server-side rendering) with route-level caching + Sanity CDN image transforms.**

- All pages render server-side on Vercel functions; no full static build
- Sanity's CDN serves all images — use their transform API for responsive sizes (replaces most of Phase 10 image optimization work)
- For high-traffic routes (`/shop`, `/originals`), add route-level `Cache-Control` headers to cache at the CDN edge
- "Publish → site updates" works immediately with SSR; no webhook-triggered revalidation pipeline needed

This decision is locked here because it affects data fetching patterns, hosting configuration, and caching strategy in every subsequent phase.

---

## Content Model (Sanity Schemas)

### Artwork
The core entity — every piece Robert has ever created.

| Field | Type | Notes |
|---|---|---|
| title | string | |
| slug | slug | Auto-generated from title |
| images | array of images | Primary + additional views |
| medium | string | e.g. "Oil on canvas" |
| dimensions | string | Original dimensions |
| year | number | |
| categories | array → Category | Multi-select, any of the 8 |
| isNew | boolean | Toggles "New Work" badge/filter |
| status | select | `available` / `recently_sold` / `archived` (originals only) |
| description | rich text | Public-facing copy |
| artistNotes | text | Optional story behind the piece |

### Product
Links an artwork to purchasable options. One artwork can have one product record.

| Field | Type | Notes |
|---|---|---|
| artwork | reference → Artwork | |
| productType | select | `original` / `print` |
| originalPrice | number | If original |
| variants | array | Each: `{ mediaType: 'open_edition' \| 'pod_paper' \| 'pod_canvas', size, price, inStock (bool) }` |

> Consolidating the three separate size arrays (`openEditionSizes`, `podPaperSizes`, `podCanvasSizes`) into a single `variants` array with a `mediaType` discriminator. Cleaner schema, simpler reactive size selector in the UI, and maps directly to `order_items.media_type`.

### Frame
Each frame style available in the frame picker.

| Field | Type | Notes |
|---|---|---|
| name | string | e.g. "Black Wood", "Natural Oak" |
| barImage | image | Single straight bar photo for CSS mitered frame |
| thumbnail | image | Small swatch shown in picker UI |
| priceModifier | number | Added to base product price |
| displayOrder | number | Controls order in picker |

> **Important:** Frame catalog must be constrained to frames Art City can actually produce. Confirm available options with Art City before seeding frame data.

### Category
| Field | Type |
|---|---|
| name | string |
| slug | slug |

**Default categories:** Country Life, Farm Life, Family, Western, Native American, Wildlife, Figurative, Landscape

### Homepage Settings (singleton)
| Field | Type | Notes |
|---|---|---|
| heroImages | array of images | Robert swaps / reorders these |
| featuredArtwork | array → Artwork | Spotlight pieces on homepage |
| heroHeadline | string | Optional text overlay on hero |

### Store Banner (singleton)
| Field | Type | Notes |
|---|---|---|
| bannerItems | array | Each: `{ image, linkUrl, textOverlay, active (bool) }` |
| displayStyle | select | `single` / `rotating carousel` |

### Site Settings (singleton)
| Field | Type |
|---|---|
| contactEmail | string |
| phoneNumber | string |
| socialLinks | array `{ platform, url }` |
| aboutPhoto | image |
| aboutText | rich text |

---

## Supabase Database

### Tables

**profiles**
| Column | Type | Notes |
|---|---|---|
| id | uuid | References auth.users |
| full_name | text | |
| created_at | timestamp | |

> Admin role removed for v1. Sanity Studio is the admin tool. No admin-only Nuxt routes planned until a concrete need exists.

**favorites**
| Column | Type |
|---|---|
| id | uuid |
| user_id | uuid → profiles |
| sanity_artwork_id | text |
| created_at | timestamp |

**orders**
| Column | Type | Notes |
|---|---|---|
| id | uuid | |
| stripe_payment_intent_id | text | |
| user_id | uuid → profiles | Null if guest |
| guest_email | text | Populated for guest orders |
| status | enum | `pending` / `confirmed` / `shipped` / `complete` |
| shipping_address | jsonb | |
| total | integer | Cents |
| created_at | timestamp | |

> Order record is created at PaymentIntent creation time (status `pending`) — not by the webhook. This ensures `/order/[id]` has data to show immediately after Stripe redirects back.

**order_items**
| Column | Type | Notes |
|---|---|---|
| id | uuid | |
| order_id | uuid → orders | |
| sanity_product_id | text | |
| title_snapshot | text | Artwork title at time of purchase — survives Sanity edits |
| image_url_snapshot | text | Artwork image URL at time of purchase |
| media_type | enum | `original` / `open_edition` / `pod_paper` / `pod_canvas` |
| size | text | e.g. "11x14" |
| frame_id | text | Sanity frame ID, null if no frame |
| quantity | integer | |
| unit_price | integer | Cents |

**processed_webhook_events**
| Column | Type | Notes |
|---|---|---|
| stripe_event_id | text (unique) | Used to deduplicate Stripe webhook retries |
| processed_at | timestamp | |

---

## Key Features

### Frame Picker
- Each frame stored in Sanity with a single straight bar image
- Vue component renders four positioned divs (top, bottom, left, right) around the artwork preview
- Corners are mitered at 45° using `clip-path: polygon()`
- Selecting a frame updates the live preview wrapping the actual artwork image
- No per-artwork frame images needed — one bar image works for all artwork at all sizes
- Frame price modifier added to total in real time

> **Budget note:** The CSS mitered corner approach is fiddly across arbitrary aspect ratios and retina scaling. Plan extra time, and show Robert an early prototype to confirm the visual quality meets his expectations — the frame picker is a core selling feature.

### Product Page Flow
1. Media selector — Open Edition Print / POD Paper / POD Canvas (/ Original if applicable)
2. Size selector — populates based on selected media type (from `variants` array)
3. Frame picker — thumbnail strip, live CSS preview around artwork
4. Quantity
5. Live price — updates instantly as any option changes (display only — server is authoritative)
6. Add to cart

### Price Calculation

**Client side (display only):**
```
displayPrice = variant.price + frame.priceModifier
```
Reactive, no server round-trip. Used to show the user a live price as they select options.

**Server side (authoritative):**
Before creating the Stripe Checkout Session, the server fetches current prices from Sanity and recomputes every line item. The client-supplied price is never trusted. This is a non-negotiable security requirement — see [Commerce Trust Rules](#commerce-trust-rules).

### Fulfillment Routing (Stripe webhook → payment confirmed)

**Mixed cart handling:** A cart may contain both prints (Art City fulfills) and an original (Robert fulfills). The webhook handler must split fulfillment:
- **Print items** → route to Art City (via confirmed integration method)
- **Original items** → email notification to Robert

**Webhook security (non-negotiable):**
- Verify `stripe-signature` header on every incoming event using `stripe.webhooks.constructEvent()`
- Before processing, check `processed_webhook_events` for the event ID — skip if already processed
- Insert event ID into `processed_webhook_events` before doing any fulfillment work
- Update order status in Supabase from `pending` → `confirmed`

**Email notifications:**
- Robert receives an email for each original purchase with full order details
- Customer receives a receipt — handled automatically by Stripe Checkout (no custom email template needed)

### Inventory Lock for Originals

Originals are one-of-a-kind. The server must:
1. Verify `artwork.status === 'available'` at Stripe Checkout Session creation — return an error if not
2. On webhook confirmation, update Sanity artwork status to `recently_sold` via Sanity write API

There is a small race window between these two steps (two simultaneous checkouts). This is acceptable for a low-traffic artist site, but it must be a conscious design decision.

### Original Artwork Page
Three sections driven by artwork `status` field:
- **Available** — links to purchase page
- **Recently Sold** — "SOLD" badge, no purchase link
- **Archived** — historical record, no purchase link

Robert changes one field in Sanity to move a piece between sections.

### Filtering (Shop + Originals)
- Category filter pills (multi-select — any combination of the 8 categories)
- "New Work" toggle (filters by `isNew: true`)
- Filters stack — e.g. "Western" + "New" shows new western pieces only

### Customer Accounts (Supabase Auth)
- Signup / login
- Save favorites (heart icon on artwork cards)
  - Guest clicks heart → prompt to log in; local favorites merge on signup
- Order history with status
- Profile management
- Route middleware protects `/account` routes

### Sanity Studio for Robert
- Configured to show only what Robert needs
- Clean forms: add artwork, set status, manage products, update banners
- With SSR, published Sanity changes are reflected on the next page request — no rebuild required

---

## Commerce Trust Rules

These are non-negotiable design rules for the commerce layer:

1. **Server-authoritative pricing:** The server always fetches current prices from Sanity and recomputes line item totals before creating a Stripe Checkout Session. Client-supplied prices are display-only and never trusted.
2. **Webhook signature verification:** Every Stripe webhook event must be verified via `stripe.webhooks.constructEvent()` using the endpoint secret. Unverified events are rejected.
3. **Webhook idempotency:** Before processing any webhook event, check `processed_webhook_events` for the event ID. If found, skip. Insert before processing. Prevents double-fulfillment from Stripe retries.
4. **Order pre-creation:** Orders are written to Supabase at Stripe Checkout Session creation (status `pending`), not on webhook arrival. The webhook updates status to `confirmed` and triggers fulfillment.
5. **Inventory check at checkout:** Server verifies `artwork.status === 'available'` for originals before creating the Checkout Session.

---

## Implementation Phases

### Phase 1 — Foundation ✅
- Nuxt 3 project init, Tailwind CSS, ESLint/Prettier
- Git repository
- **Decisions locked:** SSR rendering strategy, Vercel hosting (add to environment setup)
- Vercel project, CI/CD pipeline
- Sanity project creation, Studio setup
- Supabase project creation, initial schema migration
- Environment variables configured

### Phase 2 — Content Schema + Fulfillment Spike
- All Sanity schemas defined (Artwork, Product with consolidated variants, Frame, Category, HomepageSettings, StoreBanner, SiteSettings)
- Sanity Studio scoped and configured for Robert
- Seed: 8 categories, a handful of test artworks, 3-4 frame styles
- Nuxt Sanity client configured
- **Fulfillment spike (throwaway):** Confirm how Art City actually receives orders. Does ShipStation route to them, or do they have their own API? Build a minimal proof-of-concept before any production code is written. Resolve this before Phase 7.
- **Art City frame catalog:** Confirm which frame styles Art City supports and constrain Sanity Frame documents accordingly

### Phase 2.5 — Design System Primitives
Define the shared UI foundation before any page-level work begins. All subsequent UI phases depend on this.

- Typography scale (heading sizes, body sizes, line heights using Playfair/EB Garamond/Raleway)
- Color tokens (CSS custom properties or Tailwind theme config)
- Verify WCAG AA contrast for all text/background combinations
- Core components: Button (primary/secondary/ghost), ArtworkCard, Badge, FilterPill
- Grid and spacing system
- Image component wrapper (uses Sanity CDN transforms for responsive srcset)

### Phase 3 — Layout + Static Pages
- Global layout: nav (with cart icon + account link), footer
- Homepage — hero banner (Sanity), featured artwork grid, category navigation
- About page — bio, photo, artist statement (from Sanity)
- Contact page — form with email delivery, honeypot/Turnstile spam protection, rate limiting

### Phase 4 — Original Artwork Page
- Three-section layout: Available, Recently Sold, Archived
- Category filter + New toggle
- Artwork grid (responsive, 3-4 columns)
- Infinite scroll or pagination
- Artwork card with hover state
- Available pieces link to product detail

### Phase 5 — Shop + Product Detail
- Shop page: grid, category filters, promo banner/carousel (from Sanity)
- Product detail page:
  - Large artwork image
  - Frame picker (CSS mitered bar component — build early and get Robert's approval on fidelity)
  - Media selector
  - Size selector (reactive to `variants` array filtered by `mediaType`)
  - Quantity
  - Live price display (client-side, display only)
  - Add to cart

### Phase 6 — Cart + Checkout
- Pinia store for cart state with localStorage persistence (survives page refresh)
- Cart drawer or cart page
- **Server route: create Stripe Checkout Session**
  - Fetch current prices from Sanity
  - Recompute all line item totals server-side (never trust client prices)
  - Verify original availability
  - Pre-create order in Supabase (status `pending`)
  - Return Stripe Checkout hosted URL — client redirects to it
- Shipping cost calculation (originals: size/weight-based; prints: flat rate or carrier-calculated)
- Stripe handles: address collection, tax (Stripe Tax), payment, receipt email to customer
- Order confirmation page (`/order/[id]`) — reads the pre-created Supabase order record
- Guest checkout flow: `guest_email` captured and stored on order

### Phase 7 — Fulfillment Routing
- Stripe webhook handler (Nuxt server route)
  - Signature verification (reject unverified events)
  - Idempotency check via `processed_webhook_events`
  - Update order status `pending` → `confirmed`
  - Split fulfillment: print items → Art City integration; original items → email Robert
- Implement confirmed Art City integration method (from Phase 2 spike)
- Handle edge cases: mixed carts (both prints and originals), failed payments, payment cancellation

### Phase 8 — Authentication
- Supabase Auth integrated in Nuxt
- Signup / login pages
- Guest favorites → local state; merge to account on signup/login
- Nuxt route middleware for protected `/account` routes
- Profile auto-created on first login

### Phase 9 — Customer Account
- `/account/orders` — order history, statuses (reads from Supabase `orders` + `order_items` snapshots)
- `/account/favorites` — saved artwork (merges local + server favorites)
- `/account/profile` — name, email, password

### Phase 10 — Polish + Launch
- SEO: `nuxt-og-image`, `@nuxtjs/sitemap`, per-page meta (most covered by Sanity image CDN already)
- Lighthouse audit — performance, accessibility, SEO passes
- Mobile responsiveness QA across all pages
- Cross-browser testing
- Failed payment UX — clear error states, retry path
- Refund handling — define process (manual via Stripe dashboard for v1)
- Domain configuration
- Final content load (Robert populates real artwork in Sanity)
- Launch

---

## Agent Team Strategy

This project is well-suited to agent teams because the phases have clear inputs/outputs and many can run in parallel.

**Dependency rule:** Gallery Agent and Shop Agent both need the design system from Phase 2.5 before building UI. Do not run them in parallel with or before the Layout Agent — they must share the same component primitives.

**Suggested agent breakdown:**

| Agent | Responsibility | Can start after |
|---|---|---|
| Schema Agent | All Sanity schemas + Studio config | Phase 1 |
| Layout Agent | Design system (Phase 2.5), global nav, footer, static pages | Phase 2 |
| Gallery Agent | Original Artwork page, filtering, grid | Phase 2.5 (Layout Agent done) |
| Shop Agent | Shop page, product detail, frame picker | Phase 2.5 (Layout Agent done) |
| Cart Agent | Pinia cart, Stripe Checkout Session server route, order confirmation | Phase 5 |
| Fulfillment Agent | Webhook handler, Art City integration, email notification | Phase 6 + fulfillment spike resolved |
| Auth Agent | Supabase Auth, login/signup pages, route middleware | Phase 7 |
| Account Agent | Customer account pages | Phase 8 |

Agents should be given:
- This plan document as context
- Their specific phase brief
- The Sanity schema definitions (from Phase 2 output)
- The Commerce Trust Rules section
- Environment variable names (not values)

---

## Open Items (Decide Later)
- **Fulfillment routing method** — ShipStation vs. Art City direct API (resolve in Phase 2 spike before any production code)
- **Tax configuration** — set up Stripe Tax before launch; confirm nexus states with Robert
- **Shipping cost calculation method** — flat rate vs. carrier-calculated; Robert to advise on typical shipping costs for originals
- **Refund policy and process** — manual via Stripe dashboard for v1; document the process for Robert
- Newsletter integration (Mailchimp or Resend) — deferred
- "Recently Sold" auto-archive after X days — optional enhancement
- Sales reporting / analytics — deferred
- Discount codes / promotions beyond banner — deferred
- Robert's exact domain name
