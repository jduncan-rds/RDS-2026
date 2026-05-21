import { defineField, defineType } from 'sanity'

export const pricingRules = defineType({
  name: 'pricingRules',
  title: 'Pricing Rules',
  type: 'document',
  fields: [
    defineField({
      name: 'openEditionRatePerSqIn',
      title: 'Open Edition — Rate per sq inch (USD)',
      type: 'number',
      validation: (r) => r.required().positive(),
    }),
    defineField({
      name: 'podPaperRatePerSqIn',
      title: 'Custom Print — Rate per sq inch (USD)',
      type: 'number',
      validation: (r) => r.required().positive(),
    }),
    defineField({
      name: 'podCanvasRatePerSqIn',
      title: 'Custom Canvas — Rate per sq inch (USD)',
      type: 'number',
      validation: (r) => r.required().positive(),
    }),
    defineField({
      name: 'openEditionMinPrice',
      title: 'Open Edition — Minimum price (USD)',
      type: 'number',
      initialValue: 0,
      validation: (r) => r.required().min(0),
    }),
    defineField({
      name: 'podPaperMinPrice',
      title: 'Custom Print — Minimum price (USD)',
      type: 'number',
      initialValue: 0,
      validation: (r) => r.required().min(0),
    }),
    defineField({
      name: 'podCanvasMinPrice',
      title: 'Custom Canvas — Minimum price (USD)',
      type: 'number',
      initialValue: 0,
      validation: (r) => r.required().min(0),
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
