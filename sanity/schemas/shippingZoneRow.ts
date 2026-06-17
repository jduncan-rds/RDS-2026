import { defineField, defineType } from 'sanity'

/**
 * One row of the shipping matrix: the cost to ship a single item of a given
 * size band to each of the three destination zones. Reused once per size band
 * (A/B/C) in shippingRates. Size bands reuse the Pricing Rules thresholds.
 */
export const shippingZoneRow = defineType({
  name: 'shippingZoneRow',
  title: 'Shipping by Zone',
  type: 'object',
  options: { columns: 3 },
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
  ],
})
