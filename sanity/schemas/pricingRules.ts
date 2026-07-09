import { defineField, defineType } from 'sanity'

export const pricingRules = defineType({
  name: 'pricingRules',
  title: 'Pricing Rules',
  type: 'document',
  description:
    'Print prices are computed from area (square inches) × a per-sq-inch rate. ' +
    'Rates are split into four size bands so larger prints can carry a lower ' +
    'per-inch rate. A print falls into a band by its total square inches.',
  fields: [
    defineField({
      name: 'bandAMaxSqIn',
      title: 'Band A (Small) — upper limit, sq inches',
      type: 'number',
      description: 'Prints with area up to this value use Band A rates. e.g. 250',
      initialValue: 250,
      validation: (r) => r.required().positive(),
    }),
    defineField({
      name: 'bandBMaxSqIn',
      title: 'Band B (Medium) — upper limit, sq inches',
      type: 'number',
      description:
        'Prints larger than Band A and up to this value use Band B rates. ' +
        'Anything larger than this uses Band C (Large) or Band D (Extra Large). e.g. 500',
      initialValue: 500,
      validation: (r) =>
        r.required().positive().custom((val, ctx) => {
          const a = (ctx.document?.bandAMaxSqIn as number) ?? 0
          if (typeof val === 'number' && val <= a)
            return 'Band B limit must be greater than Band A limit'
          return true
        }),
    }),
    defineField({
      name: 'bandCMaxSqIn',
      title: 'Band C (Large) — upper limit, sq inches',
      type: 'number',
      description:
        'Prints larger than Band B and up to this value use Band C rates. ' +
        'Anything larger than this uses Band D (Extra Large). Leave blank to keep ' +
        'everything above Band B in Band C (Band D stays inactive). e.g. 850',
      validation: (r) =>
        r.positive().custom((val, ctx) => {
          if (val == null) return true
          const b = (ctx.document?.bandBMaxSqIn as number) ?? 0
          if (typeof val === 'number' && val <= b)
            return 'Band C limit must be greater than Band B limit'
          return true
        }),
    }),
    defineField({
      name: 'bandA',
      title: 'Band A (Small) rates',
      type: 'pricingBand',
    }),
    defineField({
      name: 'bandB',
      title: 'Band B (Medium) rates',
      type: 'pricingBand',
    }),
    defineField({
      name: 'bandC',
      title: 'Band C (Large) rates',
      type: 'pricingBand',
    }),
    defineField({
      name: 'bandD',
      title: 'Band D (Extra Large) rates',
      type: 'pricingBand',
      description:
        'Only used once Band C\'s upper limit (above) is also set. Leave both blank to ' +
        'keep the site on three bands.',
    }),
    defineField({
      name: 'roundTo',
      title: 'Round computed price to nearest (USD)',
      type: 'number',
      description: 'e.g. 1 = whole dollars, 5 = nearest $5, 0.01 = exact cents',
      initialValue: 1,
      validation: (r) => r.required().positive(),
    }),
    defineField({
      name: 'notes',
      title: 'Internal Notes',
      type: 'text',
      rows: 2,
      description: 'For your own reference — not shown to customers',
    }),
  ],
  preview: {
    prepare: () => ({ title: 'Pricing Rules' }),
  },
})
