import { defineField, defineType } from 'sanity'

export const homepageSettings = defineType({
  name: 'homepageSettings',
  title: 'Homepage Settings',
  type: 'document',
  __experimental_actions: ['update', 'publish'],
  fields: [
    defineField({
      name: 'heroImages',
      title: 'Hero Images',
      type: 'array',
      of: [{ type: 'image', options: { hotspot: true } }],
      description: 'Drag to reorder. These cycle in the homepage hero.',
    }),
    defineField({
      name: 'heroHeadline',
      title: 'Hero Headline',
      type: 'string',
      description: 'Optional text overlay on the hero image',
    }),
    defineField({
      name: 'featuredProducts',
      title: 'Featured Work',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'product' }] }],
      description:
        'Spotlight pieces shown in the homepage grid. Any product type — originals, prints, calendars, gifts. Drag to reorder.',
      validation: (r) => r.max(12),
    }),
  ],
  preview: {
    prepare() {
      return { title: 'Homepage Settings' }
    },
  },
})
