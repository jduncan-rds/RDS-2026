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
      name: 'priceModifier',
      title: 'Price Modifier (USD)',
      type: 'number',
      description: 'Amount added to the base print price. Use 0 for no upcharge.',
      validation: (r) => r.required().min(0),
      initialValue: 0,
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
