import { defineField, defineType } from 'sanity'

export const product = defineType({
  name: 'product',
  title: 'Product',
  type: 'document',
  fields: [
    defineField({
      name: 'artwork',
      title: 'Artwork',
      type: 'reference',
      to: [{ type: 'artwork' }],
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'productType',
      title: 'Product Type',
      type: 'string',
      options: {
        list: [
          { title: 'Original Painting', value: 'original' },
          { title: 'Print', value: 'print' },
          { title: 'Calendar', value: 'calendar' },
          { title: 'Greeting Card', value: 'card' },
          { title: 'Gift / Other', value: 'gift' },
        ],
        layout: 'radio',
      },
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'originalPrice',
      title: 'Original Price (USD)',
      type: 'number',
      description: 'Required if Product Type is Original',
      hidden: ({ document }) => document?.productType !== 'original',
    }),
    defineField({
      name: 'simplePrice',
      title: 'Price (USD)',
      type: 'number',
      description: 'Fixed price for this product. No size or framing — one SKU.',
      hidden: ({ document }) =>
        !['calendar', 'card', 'gift'].includes((document?.productType as string) ?? ''),
      validation: (r) =>
        r.custom((value, ctx) => {
          const t = (ctx.document?.productType as string) ?? ''
          if (['calendar', 'card', 'gift'].includes(t)) {
            if (value == null) return 'Price is required for this product type.'
            if (typeof value !== 'number' || value <= 0) return 'Price must be greater than 0.'
          }
          return true
        }),
    }),
    defineField({
      name: 'simpleSku',
      title: 'SKU',
      type: 'string',
      description:
        'The SKU passed to ShipStation / Art City for fulfillment (e.g. CAL-2026, CARD-XMAS-6PK).',
      hidden: ({ document }) =>
        !['calendar', 'card', 'gift'].includes((document?.productType as string) ?? ''),
      validation: (r) =>
        r.custom((value, ctx) => {
          const t = (ctx.document?.productType as string) ?? ''
          if (['calendar', 'card', 'gift'].includes(t) && !value) return 'SKU is required.'
          return true
        }),
    }),
    defineField({
      name: 'simpleInStock',
      title: 'In Stock',
      type: 'boolean',
      initialValue: true,
      hidden: ({ document }) =>
        !['calendar', 'card', 'gift'].includes((document?.productType as string) ?? ''),
    }),
    defineField({
      name: 'simpleDescription',
      title: 'Product Description',
      type: 'text',
      rows: 4,
      description:
        'Short description shown on the product page. Use this for calendar contents (e.g. "12 paintings, 12 × 12 in.") or card pack details.',
      hidden: ({ document }) =>
        !['calendar', 'card', 'gift'].includes((document?.productType as string) ?? ''),
    }),
    defineField({
      name: 'productImages',
      title: 'Additional Product Images',
      type: 'array',
      description:
        'Optional extra photos shown alongside the artwork image. Useful for product shots — calendar laid open, packaging, framed-on-wall mockups, etc. Appear as thumbnails on the product page.',
      of: [{ type: 'image', options: { hotspot: true } }],
      options: { layout: 'grid' },
    }),
    defineField({
      name: 'variants',
      title: 'Print Variants',
      type: 'array',
      description: 'All available sizes across all print media types',
      hidden: ({ document }) => document?.productType !== 'print',
      of: [
        {
          type: 'object',
          fields: [
            defineField({
              name: 'mediaType',
              title: 'Media Type',
              type: 'string',
              options: {
                list: [
                  { title: 'Open Edition Print', value: 'open_edition' },
                  { title: 'Custom Print', value: 'pod_paper' },
                  { title: 'Custom Canvas', value: 'pod_canvas' },
                ],
              },
              validation: (r) => r.required(),
            }),
            defineField({
              name: 'size',
              title: 'Size (inches)',
              type: 'string',
              placeholder: 'e.g. 11x14 or 14.375x22',
              description:
                'Width × height in inches as decimals. Use 14.375, not 14 3/8 — fractions are not allowed and would mis-price the print.',
              validation: (r) =>
                r
                  .required()
                  .custom((val) => {
                    if (typeof val !== 'string') return 'Required'
                    // Mirror parseSize(): two bare decimals separated by x/×,
                    // optional spaces and inch marks. Rejects fractions and text.
                    if (!/^\s*\d+(\.\d+)?"?\s*[x×]\s*\d+(\.\d+)?"?\s*$/i.test(val)) {
                      return 'Use WIDTHxHEIGHT in decimal inches, e.g. "14.375 x 22". Fractions like "14 3/8" are not allowed.'
                    }
                    return true
                  }),
            }),
            defineField({
              name: 'price',
              title: 'Price Override (USD)',
              type: 'number',
              description: 'Leave blank to use the per-sq-inch formula from Pricing Rules. Set a value to override the formula for this specific variant.',
              validation: (r) => r.positive(),
            }),
            defineField({
              name: 'inStock',
              title: 'In Stock',
              type: 'boolean',
              initialValue: true,
            }),
          ],
          preview: {
            select: {
              mediaType: 'mediaType',
              size: 'size',
              price: 'price',
            },
            prepare({ mediaType, size, price }) {
              const labels: Record<string, string> = {
                open_edition: 'Open Edition',
                pod_paper: 'Custom Print',
                pod_canvas: 'Custom Canvas',
              }
              return {
                title: `${labels[mediaType] ?? mediaType} — ${size}`,
                subtitle: price ? `$${price} (override)` : 'Formula pricing',
              }
            },
          },
        },
      ],
    }),
  ],
  preview: {
    select: {
      artworkTitle: 'artwork.title',
      artworkImage: 'artwork.images.0',
      productType: 'productType',
    },
    prepare({ artworkTitle, artworkImage, productType }) {
      const labels: Record<string, string> = {
        original: 'Original',
        print: 'Print',
        calendar: 'Calendar',
        card: 'Greeting Card',
        gift: 'Gift',
      }
      return {
        title: artworkTitle ?? 'Untitled',
        subtitle: labels[productType as string] ?? productType,
        media: artworkImage,
      }
    },
  },
})
