# Canada Shipping — Implementation Plan

Status: **ready to implement** — all design questions resolved (2026-08-29)

Driver: previous Canadian customers are asking to order online. Today the site is
US-only — `isValidState()` rejects non-US states, the cart offers a US-states
dropdown, and the Stripe session sets `allowed_countries: ['US']`.

---

## Decisions (locked)

| Question | Decision |
|---|---|
| Which products ship to Canada? | Calendars, **cards, and gifts** (all `simple`), plus **unframed** prints/canvas |
| Framed prints/canvas? | ❌ Excluded |
| Originals? | ❌ Excluded (high declared value, art-specific customs rules) |
| Mixed cart with an ineligible item? | **Block checkout** until the item is removed |
| Rate model | Flat per item class, implemented as a fourth shipping zone |

## Eligibility rule

```
canShipToCanada(mediaType, frameId):
  if mediaType == 'original'                    -> false
  if FRAMEABLE_MEDIA_TYPES.has(mediaType)
       and frameId != null                      -> false   // framed print/canvas
  return true                                             // unframed print, or simple
```

`FRAMEABLE_MEDIA_TYPES` already exists in `server/utils/shipping.ts`:
`open_edition`, `pod_paper`, `pod_canvas`.

Note this is *not* the same as the existing `ShippingClass`, which lumps
originals and simple goods together as `'other'`. Eligibility needs `mediaType`
directly.

---

## Design: Canada is Zone 4

Extend the existing size-band × zone matrix rather than building a parallel
flat-rate system.

- `ShippingZone` becomes `1 | 2 | 3 | 4`
- `shippingZoneRow` gains a `zone4` field, labelled "Canada"
- Canadian provinces map to zone 4

**Why this over a standalone flat rate:** flat is still achievable (enter the
same number in every band's zone4), but Robert *can* differentiate if a large
unframed canvas costs materially more than a calendar — which it will. And
everything downstream keeps working untouched: per-product `shippingOverride`,
the free-shipping threshold, the two-group aggregation, and the cart preview.

Because Canada is a single zone, the province chosen never changes the price.
That conveniently removes a class of price-mismatch bugs.

### Rates Robert must fill in Sanity

Only **five** values, because framed items aren't eligible:

| Row | Applies to |
|---|---|
| `bandA.zone4` | calendars / cards / gifts (no size → Band A, and `'other'` class uses the default row) |
| `bandAUnframed.zone4` | small unframed prints |
| `bandBUnframed.zone4` | medium unframed prints |
| `bandCUnframed.zone4` | large unframed prints |
| `bandDUnframed.zone4` | extra-large unframed prints |

Leave `zone4` empty on the framed rows (`bandA/B/C/D`) other than `bandA` — those
items can't reach checkout with a Canadian destination.

⚠️ `perUnitShipping()` returns `zoneCost(row, zone)` which falls back to `0` for a
missing value. **An unfilled zone4 would silently mean free shipping to Canada.**

**Rule: a blank/zero `zone4` on an otherwise-eligible band means that band is NOT
available to Canada** — treat it exactly like a framed item (blocked in the cart,
409 at checkout). Never treat it as free.

This one rule does double duty: it removes the free-shipping footgun, *and* it
gives Robert per-band control with no extra fields. If USPS can't economically
carry a Band D tube to Canada, he leaves `bandDUnframed.zone4` blank and that
size simply isn't offered.

---

## Cart behaviour

The customer chooses a destination on the cart page *before* Stripe, so the
block happens there.

1. Add a **country selector** (United States / Canada) above the region dropdown.
2. Region dropdown switches between `US_STATES` and a new `CA_PROVINCES` list
   (AB, BC, MB, NB, NL, NS, NT, NU, ON, PE, QC, SK, YT).
3. On selecting Canada, call `/api/shipping-quote` with `country`. The endpoint
   returns any ineligible lines.
4. If ineligible items exist: show a clear message naming them, disable the
   checkout button, and offer to remove each. Copy should say *why* — framed
   pieces and original paintings ship within the US only.
5. Quote and proceed normally once the cart is all-eligible.

---

## File-by-file changes

### `utils/shipping.ts`
- `export type ShippingZone = 1 | 2 | 3 | 4`
- `ZoneRow` gains `zone4?: number`
- `export const CA_PROVINCES: { code, name }[]`
- `destinationToZone(country: string, region: string): ShippingZone` — replaces
  `stateToZone`; returns 4 for any `country === 'CA'`
- `isValidDestination(country, region): boolean` — replaces `isValidState`
- `canShipToCanada(mediaType, frameId): boolean`
- Keep `stateToZone`/`isValidState` as thin wrappers if anything else imports
  them, or update all callers.

### `sanity/schemas/shippingZoneRow.ts`
- Add `zone4` number field, title "Zone 4 — Canada", with a description noting
  it applies only to eligible items.
- **Requires `npx sanity deploy`** — schema changes do not reach the hosted
  Studio via git.

### `server/utils/shipping.ts`
- `computeShippingCents(sanity, lines, state)` →
  `computeShippingCents(sanity, lines, country, region)`
- Pass country through to `destinationToZone`.

### `server/api/shipping-quote.post.ts`
- Accept `country` (default `'US'`), validate with `isValidDestination`
- When `country === 'CA'`, compute ineligible lines and return them:
  `{ shippingCents, ineligible: [{ productId, title, reason }] }`

### `server/api/checkout.post.ts`
- Accept and validate `country`
- **Authoritative eligibility gate:** if `country === 'CA'` and any line fails
  `canShipToCanada`, throw 409 with the offending items (mirrors the existing
  originals-unavailable 409 pattern)
- **`allowed_countries` must match the chosen country exactly:**
  `['CA']` when Canada was selected, `['US']` otherwise.
  Do *not* send `['US','CA']` — see Safety.

### `pages/cart.vue`
- Country selector, conditional region list, ineligible-item messaging, disabled
  checkout button
- Pass `country` to the quote call and into the `/checkout` query alongside `state`

### `server/utils/fulfillment.ts` — **required, not optional**
Currently the ShipStation `createorder` payload passes `country` through but
sends **no customs data at all**. ShipStation cannot produce an international
label without it, so a Canadian order would reach ShipStation and stall.

Add, when `shipTo.country !== 'US'`:

```
internationalOptions: {
  contents: 'merchandise',
  nonDelivery: 'return_to_sender',
  customsItems: [
    {
      description: <item title, plain and specific — "2027 wall calendar">,
      quantity: <qty>,
      value: <unit price USD>,
      harmonizedTariffCode: <see below>,
      countryOfOrigin: 'US',
    },
    …
  ],
}
```

HS codes to **confirm before first shipment** (these are best-guess):
- printed calendars ≈ `4910.00`
- art prints / lithographs ≈ `4911.91`

**Routing is already correct.** The webhook splits fulfillment by type: originals
go to Robert by email, everything else to `sendFulfillableOrderToShipStation`.
Because originals and framed prints are both excluded from Canada, *every*
Canada-eligible item is already ShipStation-bound. No special-casing needed.

**Carrier is not set in code** — the payload specifies no `carrierCode`,
`serviceCode`, or `requestedShippingService`, so Art City chooses at ship time.
Their USPS-only policy for Canada is therefore an operational choice that needs
no code change. If it ever needs forcing, `requestedShippingService` is the field.

**Weight and dimensions are not sent, and don't need to be.** ✅ Confirmed
2026-08-29: Art City adds the customs weight themselves at ship time. So no
weight field in Sanity, no payload change, and no data-entry pass over 224
products. The payload stays as-is apart from `internationalOptions`.

`countryOfOrigin: 'US'` matters: under CUSMA, US-origin goods enter Canada
duty-free. Combined with Canada's courier de minimis (duty waived under
CAD $150, tax under CAD $40), a $19.99 calendar should arrive with **no charges
to the customer** — provided the declaration is right.

---

## Ship dark: a `canadaEnabled` toggle

Rates are being entered **after** the code ships, which means there is a window
where the feature exists but every zone4 rate is `0` — i.e. free shipping to
Canada. Do not rely on remembering to fill them in first.

Add a boolean `canadaEnabled` to the `shippingRates` singleton, **default off**:

- Off → the cart country selector hides Canada entirely; `/api/shipping-quote`
  and `/api/checkout` reject `country: 'CA'` the same way an invalid state is
  rejected today.
- On → the full flow described above.

Robert enters the five rates, flips the toggle, done. No deploy needed to launch
or to roll back, and no window where the site quietly ships to Canada for free.

Pair this with the missing-rate guard below — the toggle prevents the expected
case, the guard catches the mistake of enabling it with rates still blank.

## Safety

**Unfilled zone4 = free shipping.** `zoneCost()` falls back to `0`. Before
enabling Canada, either (a) add a guard that refuses a Canadian quote when the
relevant zone4 rate is missing/zero, or (b) treat a missing zone4 as "not
available to Canada" and block. Option (a) with a loud server-side error is
preferable to silently shipping at a loss.

**Country mismatch between cart and Stripe.** Shipping is priced from the
cart-page destination but the real address is entered in Stripe. Today
`allowed_countries: ['US']` makes divergence impossible. Once Canada is allowed,
pinning `allowed_countries` to the single chosen country preserves that
guarantee. This is a small change that closes an otherwise real undercharge path.

**Brokerage fees are the customer-experience risk.** UPS/FedEx charge Canadian
recipients significant brokerage on international parcels — the top source of
"never again" complaints from Canada. USPS → Canada Post carries a much smaller
handling fee. Specify a postal service for these shipments and confirm what Art
City can actually offer.

---

## Not changing

- **Stripe Tax.** Registered in Utah only, so Stripe computes $0 for Canadian
  destinations — correct. Canada requires non-resident GST/HST registration only
  above **CAD $30,000** in annual sales into Canada. Monitor; don't register yet.
- **Currency.** Stays USD; the customer's card issuer converts. Worth a small
  note near the cart total so the amount isn't a surprise.

---

## Testing

1. Unit-level: `destinationToZone('CA', 'ON') === 4`; `canShipToCanada` across all
   four product shapes.
2. Cart: US flow unchanged; Canada + eligible cart quotes correctly; Canada +
   framed print blocks with a clear message; removing the item unblocks.
3. Checkout 409 fires when an ineligible cart is posted directly with
   `country: 'CA'` (bypassing the UI).
4. Confirm `allowed_countries` on the created session matches the selection.
5. **One real low-value order to a Canadian address**, end to end, verifying the
   ShipStation order carries customs data and a label can actually be produced,
   before announcing availability.

Step 5 is the one that matters most — the customs payload is the piece with no
existing coverage.

---

## Open items

Resolved 2026-08-29:
- ✅ **Art City ships to Canada, USPS only.** This is the good outcome: parcels
  hand off to Canada Post, which charges one modest flat handling fee and only
  when duty/tax is actually assessed — unlike UPS/FedEx brokerage, which
  routinely exceeds the shipping cost. Combined with US-origin CUSMA treatment
  and de minimis, most orders should arrive with nothing owed.
- ✅ **HS codes accepted** (`4910.00` calendars, `4911.91` art prints). Still
  worth confirming against the actual label on the first real shipment.

Still open:
- **USPS international size limits vs. large prints** — a *pricing* question, not
  a build blocker. USPS caps vary sharply by service: the cheap tiers are roughly
  4 lb / 24 in max length, while Priority Mail International allows up to 79 in
  and 70 lb at much higher cost. A rolled Band C/D canvas may only qualify for
  the expensive tier. Ask Art City which USPS service they use for tubes, then
  price Band C/D accordingly — or leave those `zone4` cells blank to withhold
  those sizes entirely.
- **Delivery expectations.** USPS international to Canada typically runs 1–3
  weeks, versus days for a courier, and the cheaper services have limited
  tracking. Say so at checkout and in the confirmation email; "where is my order"
  is the predictable support load otherwise.
- **zone4 dollar amounts** — will be entered *after* the build (see "Ship dark"
  below). Needs real quotes for a calendar and a large unframed canvas to, say,
  Ontario and BC.
