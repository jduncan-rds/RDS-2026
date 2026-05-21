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
      return {
        title: artworkTitle ?? 'Untitled',
        subtitle: productType === 'original' ? 'Original' : 'Print',
        media: artworkImage,
      }
    },
  },
})
