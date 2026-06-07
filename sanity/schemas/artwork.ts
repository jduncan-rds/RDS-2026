import { defineField, defineType } from 'sanity'
import { CategoryCheckboxInput } from '../components/CategoryCheckboxInput'

export const artwork = defineType({
  name: 'artwork',
  title: 'Artwork',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'title', maxLength: 96 },
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'images',
      title: 'Images',
      type: 'array',
      of: [{ type: 'image', options: { hotspot: true } }],
      validation: (r) => r.min(1),
    }),
    defineField({
      name: 'medium',
      title: 'Medium',
      type: 'string',
      placeholder: 'e.g. Oil on canvas',
    }),
    defineField({
      name: 'dimensions',
      title: 'Dimensions',
      type: 'string',
      placeholder: 'e.g. 24" × 36"',
    }),
    defineField({
      name: 'year',
      title: 'Year',
      type: 'number',
    }),
    defineField({
      name: 'categories',
      title: 'Categories',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'category' }] }],
      components: { input: CategoryCheckboxInput },
    }),
    defineField({
      name: 'isNew',
      title: 'New Work',
      type: 'boolean',
      description: 'Show "New Work" badge on this piece',
      initialValue: false,
    }),
    defineField({
      name: 'status',
      title: 'Status',
      type: 'string',
      options: {
        list: [
          { title: 'Available', value: 'available' },
          { title: 'Recently Sold', value: 'recently_sold' },
          { title: 'Archived', value: 'archived' },
        ],
        layout: 'radio',
      },
      description: 'Only applies to original paintings',
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'array',
      of: [{ type: 'block' }],
    }),
    defineField({
      name: 'artistNotes',
      title: 'Artist Notes',
      type: 'text',
      rows: 4,
      description: 'Optional — the story behind this piece',
    }),
  ],
  preview: {
    select: {
      title: 'title',
      media: 'images.0',
      status: 'status',
    },
    prepare({ title, media, status }) {
      return {
        title,
        subtitle: status ?? 'print',
        media,
      }
    },
  },
})
