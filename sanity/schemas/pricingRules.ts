import { defineField, defineType } from 'sanity'

export const pricingRules = defineType({
  name: 'pricingRules',
  title: 'Pricing Rules',
  type: 'document',
  description:
    'Print prices are computed from area (square inches) × a per-sq-inch rate. ' +
    'Rates are split into three size bands so larger prints can carry a lower ' +
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
        'Anything larger than this uses Band C (Large). e.g. 500',
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
