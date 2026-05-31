import { defineField, defineType } from 'sanity'

export const frame = defineType({
  name: 'frame',
  title: 'Frame',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      placeholder: 'e.g. Black Wood',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'barImage',
      title: 'Bar Image',
      type: 'image',
      description: 'Single straight bar photo — used to render mitered frame preview',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'thumbnail',
      title: 'Thumbnail',
      type: 'image',
      description: 'Small swatch shown in the frame picker strip',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'mouldingInches',
      title: 'Moulding Width (inches)',
      type: 'number',
      description:
        'Real width of the frame moulding. Controls how thick this frame looks in the preview relative to other frames (e.g. a 3" frame renders thicker than a 2"). Defaults to 2.5.',
      initialValue: 2.5,
      validation: (r) => r.min(0.25).max(12),
    }),
    defineField({
      name: 'frameRateType',
      title: 'Frame Pricing Method',
      type: 'string',
      options: {
        list: [
          { title: 'Flat fee (same price regardless of print size)', value: 'flat' },
          { title: 'Per square inch (scales with print size)', value: 'per_sq_in' },
        ],
        layout: 'radio',
      },
      initialValue: 'flat',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'priceModifier',
      title: 'Flat Fee Upcharge (USD)',
      type: 'number',
      description: 'Used when pricing method is Flat fee. Set to 0 for no upcharge.',
      hidden: ({ document }) => document?.frameRateType === 'per_sq_in',
      validation: (r) => r.required().min(0),
      initialValue: 0,
    }),
    defineField({
      name: 'ratePerSqIn',
      title: 'Rate per sq inch (USD)',
      type: 'number',
      description: 'Used when pricing method is Per square inch. e.g. 0.20',
      hidden: ({ document }) => document?.frameRateType !== 'per_sq_in',
      validation: (r) =>
        r.custom((val, ctx) => {
          if (ctx.document?.frameRateType === 'per_sq_in' && (!val || val <= 0))
            return 'Required when using per-square-inch pricing'
          return true
        }),
    }),
    defineField({
      name: 'displayOrder',
      title: 'Display Order',
      type: 'number',
      description: 'Lower numbers appear first in the picker',
      initialValue: 99,
    }),
  ],
  orderings: [
    {
      title: 'Display Order',
      name: 'displayOrderAsc',
      by: [{ field: 'displayOrder', direction: 'asc' }],
    },
  ],
  preview: {
    select: {
      title: 'name',
      media: 'thumbnail',
      price: 'priceModifier',
    },
    prepare({ title, media, price }) {
      return {
        title,
        subtitle: price > 0 ? `+$${price}` : 'No upcharge',
        media,
      }
    },
  },
})
