# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Robert Duncan Fine Art — a custom portfolio + e-commerce site for a Western/wildlife/Americana artist. Sells original paintings (one-of-a-kind), fine-art prints (computed pricing by size), and "simple" goods (calendars / cards / gifts, fixed price). Live on Vercel at `rds-2026.vercel.app` (currently test-mode Stripe).

## Stack

Nuxt 3 (SSR, Vue 3 `<script setup>`) · Sanity CMS (content + catalog) · Supabase (auth + orders, Postgres + RLS) · Stripe Checkout (hosted) · Tailwind · Pinia · deployed on Vercel.

## Commands

```bash
npm run dev            # Nuxt dev server → localhost:3000
npm run studio         # Sanity Studio (local) → localhost:3333
npm run build          # production build (run before relying on a Vercel deploy)
npm run lint           # eslint .   (lint:fix to autofix)
npm run format         # prettier
npm run seed           # seed Sanity singletons + sample docs (sanity/seed.ts)
npm run import:products # bulk catalog importer (see scripts/README.md)
```

- **No test suite exists.** There is no typecheck script either (`vue-tsc` is not reliably installed); verify type-sensitive changes by reading carefully and/or `npm run build`. Rely on IDE diagnostics where available.
- `npm install` requires legacy peer deps — handled durably by `.npmrc` (`legacy-peer-deps=true`); don't remove it (Vercel builds depend on it).
- One-off data migrations are tsx scripts run directly, e.g. `npx tsx scripts/migrate-pricing-bands.ts --dry-run`. They use `SANITY_API_TOKEN` from `.env` for write access.

## Two separate deploys

1. **Frontend** auto-deploys to Vercel on push to `main` (GitHub-connected).
2. **Sanity Studio is a separate, manual deploy.** After ANY change to `sanity/schemas/**` or `sanity/components/**`, run `npx sanity deploy` to update the hosted Studio at `robert-duncan-fine-art.sanity.studio`. Pushing to git does NOT update it. Hostname + appId are pinned in `sanity.cli.ts` so the deploy is non-interactive.

## Architecture

Three systems own different data:

- **Sanity** = all content + the product catalog. Documents: `artwork` (the painting + images, the canonical slug), `product` (references one artwork; `productType` ∈ `original | print | calendar | card | gift`; print products hold sized `variants`), `frame`, `category`, plus singletons (`pricingRules`, `siteSettings`, `homepageSettings`, `announcementBanner`, `storeBanner`, `printTypeInfo`). Product pages are keyed by the **artwork** slug (`/shop/<artwork-slug>`), not the product id.
- **Supabase** = auth + orders/order_items + `favorites` + `processed_webhook_events` + `profiles`. Schema in `supabase/schema.sql`; incremental changes in `supabase/migrations/*.sql`. **Migrations are applied by hand in the Supabase SQL editor — they do not run automatically.** When adding a migration, say so and note it must be applied.
- **Stripe** = payment only (hosted Checkout, not Elements). Cards are never saved.

### Pricing engine (`utils/pricing.ts`) — the most important shared module

- All print prices are computed, never trusted from the client. `computeVariantPrice()` and `computeFrameModifier()` are used by **both** the product page (display) and `server/api/checkout.post.ts` (authoritative recompute before charging) so they can never drift.
- **Tiered size bands:** rates vary by total square inches. Three bands (A ≤ `bandAMaxSqIn`, B ≤ `bandBMaxSqIn`, C larger; thresholds + per-media rates live in the `pricingRules` singleton). `selectBandKey()` picks the band; each per-sq-in frame also has A/B/C rates.
- **Per-variant `price` override** wins over the formula for any media type (checked first; used as-is, not re-rounded).
- **No minimum-price floors** — price is purely `area × band rate`.
- `computePrintTotal(base, frameModifier)` adds the frame and rounds **up** to the next whole dollar (so framing never introduces odd cents). Server converts to cents with `Math.round(total * 100)`.
- `parseSize()` deliberately **rejects fractions** ("14 3/8"); sizes must be decimal inches ("14.375"). The Studio variant Size field validates the same regex. Don't loosen one without the other.

### Checkout & fulfillment flow

`server/api/checkout.post.ts`: validates cart, recomputes every line authoritatively, **pre-creates a `pending` order** with item snapshots, puts the `orderId` in Stripe session metadata, creates the hosted Checkout session. Originals are blocked (409) if the artwork isn't `available`.

`server/api/webhooks/stripe.post.ts` is the source of truth for "paid": verifies the `stripe-signature`, is **idempotent** via `processed_webhook_events` (claims the event id first), flips the order `pending → confirmed`, then **splits fulfillment** (`server/utils/fulfillment.ts`): originals → notify Robert (email) + mark the Sanity artwork `recently_sold`; prints + simple goods → ShipStation. Email (`server/utils/email.ts`, Resend) and ShipStation both **degrade to logging** when their env keys are unset.

### Cart

`stores/cart.ts` (Pinia, persisted to localStorage). `mediaType` (`CartItemKind`) is the discriminator across product kinds — `'simple'` covers calendar/card/gift (fixed price, no size/frame). Line identity for de-dupe = productId + mediaType + size + frameId.

## Project-specific gotchas (these have bitten before)

- **Supabase user id:** `@nuxtjs/supabase` v2 returns the JWT payload, where the id is `.sub`, NOT `.id` (TypeScript lies about this). Always use `composables/useAuthedUserId.ts`.
- **Custom Sanity Studio React components** (`.tsx` under `sanity/`) MUST start with `/** @jsxImportSource react */`. This is a Vue/Nuxt project, so without it the file compiles to Vue vnodes and the Studio throws "Objects are not valid as a React child". Example: `sanity/components/CategoryCheckboxInput.tsx`.
- **`<component :is>` with NuxtLink:** passing the string `"NuxtLink"` renders a dead `<nuxtlink>` element. Use `resolveComponent('NuxtLink')` (see `AppButton`).
- **Sanity CDN staleness:** `useCdn` is true in production (`nuxt.config.ts`), so the live site can serve a stale catalog/price for a short time after publishing. Local dev uses fresh data. Don't chase "it's not updating" bugs without checking this.
- **Sanity CORS:** client-side navigation queries require the origin to be in the Sanity project's CORS allowlist (`npx sanity cors add ... --no-credentials`); SSR/reload works without it. Add new deploy origins or Shop/Originals appear empty on client nav.
- **`@portabletext/vue` `<PortableText>`** is the working path for Sanity rich text here — `<SanityContent>` rendered empty.
- **Rich-text / portable-text image uploads** can get stuck (an `_upload` placeholder with no `asset._ref`); the field looks "defined" but renders nothing. The fix is re-upload + publish, not code.

## Config & secrets

Server secrets and public keys are wired through `runtimeConfig` in `nuxt.config.ts` (Stripe, Sanity token, Supabase service role, Resend, ShipStation, `NUXT_PUBLIC_BASE_URL` used for Stripe success/cancel URLs). Sanity project id `pwxocvdd`, dataset `production`. Components auto-import from `components/ui` with no path prefix.

## Conventions

End commit messages with the Co-Authored-By trailer. Money is always handled in dollars in the pricing module and converted to integer cents at the Stripe boundary.

## When to ask before acting

Don't ask for permission on local, reversible work in this repo — just do it: editing/writing files, running the dev server or local scripts, installing npm packages, running migration/import scripts against test-mode Stripe or dev data, reading files/env vars.

Do ask first (or at least flag it and pause) for anything that either (a) touches a live deployed surface, (b) sends data outside this machine, or (c) is a git commit/push — concretely, for this project:
- `git add`/`git commit` and `git push` to `main` — always ask first, even though a commit alone is local (the user wants a chance to review before it's part of history)
- `npx sanity deploy` (updates the live hosted Studio at `robert-duncan-fine-art.sanity.studio`)
- Sending real email (Resend), calling ShipStation, or anything using live-mode (non-test) Stripe credentials
- Any other action that publishes, uploads, or transmits data to a third-party service, or otherwise affects something outside this local checkout
