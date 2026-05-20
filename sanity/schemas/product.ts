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
                  { title: 'POD Paper', value: 'pod_paper' },
                  { title: 'POD Canvas', value: 'pod_canvas' },
                ],
              },
              validation: (r) => r.required(),
            }),
            defineField({
              name: 'size',
              title: 'Size',
              type: 'string',
              placeholder: 'e.g. 11x14',
              validation: (r) => r.required(),
            }),
            defineField({
              name: 'price',
              title: 'Price (USD)',
              type: 'number',
              validation: (r) => r.required().positive(),
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
                pod_paper: 'POD Paper',
                pod_canvas: 'POD Canvas',
              }
              return {
                title: `${labels[mediaType] ?? mediaType} — ${size}`,
                subtitle: price ? `$${price}` : '',
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
