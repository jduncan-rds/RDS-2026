import { defineField, defineType } from 'sanity'

/**
 * Per-size-band pricing rates. Reused three times in pricingRules (bands A/B/C).
 * Each band holds a per-square-inch rate for every print media type, so larger
 * prints can carry a lower per-sq-in rate than small ones. No minimum-price
 * floors — price is purely area × rate (then rounded up to the dollar).
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
      name: 'podPaperRatePerSqIn',
      title: 'Custom Print (paper) — Rate per sq inch (USD)',
      type: 'number',
      validation: (r) => r.min(0),
    }),
    defineField({
      name: 'podCanvasRatePerSqIn',
      title: 'Custom Canvas — Rate per sq inch (USD)',
      type: 'number',
      validation: (r) => r.min(0),
    }),
  ],
})
