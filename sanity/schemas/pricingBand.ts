import { defineField, defineType } from 'sanity'

/**
 * Per-size-band pricing rates. Reused three times in pricingRules (bands A/B/C).
 * Each band holds a per-square-inch rate and a minimum price for every print
 * media type, so larger prints can carry a lower per-sq-in rate than small ones.
 */
export const pricingBand = defineType({
  name: 'pricingBand',
  title: 'Band Rates',
  type: 'object',
  options: { collapsible: true, collapsed: false },
  fields: [
    defineField({
      name: 'openEditionRatePerSqIn',
      title: 'Open Edition — Rate per sq inch (USD)',
      type: 'number',
      validation: (r) => r.min(0),
    }),
    defineField({
      name: 'openEditionMinPrice',
      title: 'Open Edition — Minimum price (USD)',
      type: 'number',
      initialValue: 0,
      validation: (r) => r.min(0),
    }),
    defineField({
      name: 'podPaperRatePerSqIn',
      title: 'Custom Print (paper) — Rate per sq inch (USD)',
      type: 'number',
      validation: (r) => r.min(0),
    }),
    defineField({
      name: 'podPaperMinPrice',
      title: 'Custom Print (paper) — Minimum price (USD)',
      type: 'number',
      initialValue: 0,
      validation: (r) => r.min(0),
    }),
    defineField({
      name: 'podCanvasRatePerSqIn',
      title: 'Custom Canvas — Rate per sq inch (USD)',
      type: 'number',
      validation: (r) => r.min(0),
    }),
    defineField({
      name: 'podCanvasMinPrice',
      title: 'Custom Canvas — Minimum price (USD)',
      type: 'number',
      initialValue: 0,
      validation: (r) => r.min(0),
    }),
  ],
})
