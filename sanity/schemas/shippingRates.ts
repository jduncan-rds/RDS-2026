import { defineField, defineType } from 'sanity'

export const shippingRates = defineType({
  name: 'shippingRates',
  title: 'Shipping Rates',
  type: 'document',
  description:
    'Shipping is calculated from the item size (reusing the Pricing Rules size ' +
    'bands A/B/C) and the destination zone the customer selects at checkout. ' +
    'A per-product Shipping Override (on the product) takes precedence over this ' +
    'matrix. For multiple items, the order is charged the single highest item ' +
    "shipping plus the 'per additional item' fee for each extra unit.",
  fields: [
    defineField({
      name: 'bandA',
      title: 'Band A (Small) — shipping by zone',
      type: 'shippingZoneRow',
    }),
    defineField({
      name: 'bandB',
      title: 'Band B (Medium) — shipping by zone',
      type: 'shippingZoneRow',
    }),
    defineField({
      name: 'bandC',
      title: 'Band C (Large) — shipping by zone',
      type: 'shippingZoneRow',
    }),
    defineField({
      name: 'perAdditionalItem',
      title: 'Per Additional Item (USD)',
      type: 'number',
      description:
        'Added once for each extra unit beyond the highest-shipping item in the order.',
      initialValue: 0,
      validation: (r) => r.min(0),
    }),
    defineField({
      name: 'freeShippingThreshold',
      title: 'Free Shipping Over (USD)',
      type: 'number',
      description:
        'If the merchandise subtotal is at least this amount, shipping is free. Leave blank or 0 to disable.',
      validation: (r) => r.min(0),
    }),
    defineField({
      name: 'notes',
      title: 'Internal Notes',
      type: 'text',
      rows: 2,
    }),
  ],
  preview: {
    prepare: () => ({ title: 'Shipping Rates' }),
  },
})
