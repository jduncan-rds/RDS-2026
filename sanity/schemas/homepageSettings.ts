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
      name: 'heroHeadlineSize',
      title: 'Hero Headline Size',
      type: 'string',
      description: 'How large the headline text appears over the hero image.',
      options: {
        list: [
          { title: 'Small', value: 'small' },
          { title: 'Medium (default)', value: 'medium' },
          { title: 'Large', value: 'large' },
          { title: 'Extra Large', value: 'xlarge' },
        ],
        layout: 'radio',
      },
      initialValue: 'medium',
    }),
    defineField({
      name: 'heroQuote',
      title: 'Inspiring Quote',
      type: 'text',
      rows: 3,
      description: 'Optional quote shown just below the hero image. Leave blank to hide this section.',
    }),
    defineField({
      name: 'heroQuoteAttribution',
      title: 'Quote Attribution',
      type: 'string',
      description: 'Optional — who the quote is from (e.g. "Robert Duncan"). Shown smaller, below the quote.',
    }),
    defineField({
      name: 'heroQuoteFont',
      title: 'Quote Font',
      type: 'string',
      description: 'Typeface for the quote.',
      options: {
        list: [
          { title: 'Elegant Serif (Cormorant)', value: 'heading' },
          { title: 'Classic Serif (EB Garamond)', value: 'body' },
          { title: 'Clean Sans (Raleway)', value: 'ui' },
        ],
        layout: 'radio',
      },
      initialValue: 'heading',
    }),
    defineField({
      name: 'heroQuoteSize',
      title: 'Quote Size',
      type: 'string',
      description: 'How large the quote text appears.',
      options: {
        list: [
          { title: 'Small', value: 'small' },
          { title: 'Medium (default)', value: 'medium' },
          { title: 'Large', value: 'large' },
          { title: 'Extra Large', value: 'xlarge' },
        ],
        layout: 'radio',
      },
      initialValue: 'medium',
    }),
    defineField({
      name: 'heroQuoteBackground',
      title: 'Quote Background Color',
      type: 'string',
      description: 'Background color behind the quote section.',
      options: {
        list: [
          { title: 'None (page background)', value: 'none' },
          { title: 'Soft Cream', value: 'soft' },
          { title: 'Sage', value: 'sage' },
          { title: 'Rust', value: 'rust' },
          { title: 'Dark', value: 'dark' },
        ],
        layout: 'radio',
      },
      initialValue: 'none',
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
