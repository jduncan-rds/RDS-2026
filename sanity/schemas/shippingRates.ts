import { defineField, defineType } from 'sanity'

export const shippingRates = defineType({
  name: 'shippingRates',
  title: 'Shipping Rates',
  type: 'document',
  description:
    'Shipping is calculated from the item size (reusing the Pricing Rules size ' +
    'bands A/B/C/D) and the destination zone the customer selects at checkout. ' +
    'A per-product Shipping Override (on the product) takes precedence over this ' +
    'matrix. Each band also has an optional Unframed rate, used for prints/canvas ' +
    'added to the cart without a frame — the same rate applies to unframed paper ' +
    'and unframed canvas. Multi-item orders are charged in two groups: framed ' +
    'prints/canvas have every unit\'s shipping cost summed; everything else ' +
    '(unframed prints/canvas, originals, and calendars/cards/gifts) is charged the ' +
    "single highest-shipping item in that group plus the 'Per Additional Item' fee " +
    'for each other unit in that group.',
  fields: [
    defineField({
      name: 'bandA',
      title: 'Band A (Small) — shipping by zone',
      type: 'shippingZoneRow',
    }),
    defineField({
      name: 'bandAUnframed',
      title: 'Band A (Small) — Unframed shipping by zone',
      type: 'shippingZoneRow',
      description: 'Leave blank to use the Band A rate above for unframed items too.',
    }),
    defineField({
      name: 'bandB',
      title: 'Band B (Medium) — shipping by zone',
      type: 'shippingZoneRow',
    }),
    defineField({
      name: 'bandBUnframed',
      title: 'Band B (Medium) — Unframed shipping by zone',
      type: 'shippingZoneRow',
      description: 'Leave blank to use the Band B rate above for unframed items too.',
    }),
    defineField({
      name: 'bandC',
      title: 'Band C (Large) — shipping by zone',
      type: 'shippingZoneRow',
    }),
    defineField({
      name: 'bandCUnframed',
      title: 'Band C (Large) — Unframed shipping by zone',
      type: 'shippingZoneRow',
      description: 'Leave blank to use the Band C rate above for unframed items too.',
    }),
    defineField({
      name: 'bandD',
      title: 'Band D (Extra Large) — shipping by zone',
      type: 'shippingZoneRow',
      description:
        'Only used once Band D is enabled in Pricing Rules (both its upper limit and ' +
        'rates set). Until then, and if left blank here, Band D items ship at the Band C rate.',
    }),
    defineField({
      name: 'bandDUnframed',
      title: 'Band D (Extra Large) — Unframed shipping by zone',
      type: 'shippingZoneRow',
      description: 'Leave blank to use the Band D (or Band C) rate above for unframed items too.',
    }),
    defineField({
      name: 'perAdditionalItem',
      title: 'Per Additional Item (USD)',
      type: 'number',
      description:
        'Added once for each extra unit beyond the highest-shipping item, within the ' +
        '"everything else" group (unframed prints/canvas, originals, calendars/cards/gifts). ' +
        "Framed prints/canvas don't use this — each one is charged its own shipping cost.",
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
      name: 'canadaEnabled',
      title: 'Ship to Canada',
      type: 'boolean',
      description:
        'Master switch for Canadian orders. While OFF, Canada is hidden from the cart ' +
        'and refused at checkout. Turn ON only after the Zone 4 rates above are filled ' +
        'in — any size left blank stays unavailable to Canada. Canada is limited to ' +
        'calendars/cards/gifts and UNFRAMED prints; originals and framed pieces are ' +
        'US-only and will block a Canadian order until removed from the cart.',
      initialValue: false,
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
