import { defineField, defineType } from 'sanity'

/**
 * One row of the shipping matrix: the cost to ship a single item of a given
 * size band to each destination zone. Reused once per size band (A/B/C/D) in
 * shippingRates. Size bands reuse the Pricing Rules thresholds.
 *
 * Zones 1–3 are US distance bands from Utah. Zone 4 is all of Canada — a single
 * zone, so the province never changes the price.
 */
export const shippingZoneRow = defineType({
  name: 'shippingZoneRow',
  title: 'Shipping by Zone',
  type: 'object',
  options: { columns: 4 },
  fields: [
    defineField({
      name: 'zone1',
      title: 'Zone 1 — Mountain West (USD)',
      type: 'number',
      description: 'UT, ID, WY, NV, AZ, CO, NM',
      validation: (r) => r.min(0),
    }),
    defineField({
      name: 'zone2',
      title: 'Zone 2 — Central / West Coast (USD)',
      type: 'number',
      validation: (r) => r.min(0),
    }),
    defineField({
      name: 'zone3',
      title: 'Zone 3 — East / Far Corners (USD)',
      type: 'number',
      validation: (r) => r.min(0),
    }),
    defineField({
      name: 'zone4',
      title: 'Zone 4 — Canada (USD)',
      type: 'number',
      description:
        'Canada ships USPS only, and only for calendars/cards/gifts and UNFRAMED prints. ' +
        'LEAVE BLANK to withhold this size from Canada — blank means "not offered", ' +
        'never "free". Framed rows can stay blank entirely. ' +
        'IMPORTANT: Bands A and B (up to 16x20) fit one flat mailer WITH a calendar, so ' +
        'they share a package — enter the rate for the first item. Bands C and D ship ' +
        'rolled in their OWN tube and cannot combine, so every unit is charged in full — ' +
        'enter the full per-tube cost there.',
      validation: (r) => r.min(0),
    }),
  ],
})
