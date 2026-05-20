import { defineField, defineType } from 'sanity'

export const storeBanner = defineType({
  name: 'storeBanner',
  title: 'Store Banner',
  type: 'document',
  __experimental_actions: ['update', 'publish'],
  fields: [
    defineField({
      name: 'displayStyle',
      title: 'Display Style',
      type: 'string',
      options: {
        list: [
          { title: 'Single banner', value: 'single' },
          { title: 'Rotating carousel', value: 'carousel' },
        ],
        layout: 'radio',
      },
      initialValue: 'single',
    }),
    defineField({
      name: 'bannerItems',
      title: 'Banner Items',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            defineField({
              name: 'image',
              title: 'Image',
              type: 'image',
              options: { hotspot: true },
              validation: (r) => r.required(),
            }),
            defineField({
              name: 'textOverlay',
              title: 'Text Overlay',
              type: 'string',
            }),
            defineField({
              name: 'linkUrl',
              title: 'Link URL',
              type: 'url',
            }),
            defineField({
              name: 'active',
              title: 'Active',
              type: 'boolean',
              initialValue: true,
            }),
          ],
          preview: {
            select: { title: 'textOverlay', media: 'image', active: 'active' },
            prepare({ title, media, active }) {
              return {
                title: title ?? 'Banner item',
                subtitle: active ? 'Active' : 'Hidden',
                media,
              }
            },
          },
        },
      ],
    }),
  ],
  preview: {
    prepare() {
      return { title: 'Store Banner' }
    },
  },
})
