import { defineField, defineType } from 'sanity'

export const printTypeInfo = defineType({
  name: 'printTypeInfo',
  title: 'Print Type Descriptions',
  type: 'document',
  description:
    'Short blurbs shown on product pages under the Print Type buttons, explaining what each option is. The matching one appears when a customer selects that type.',
  fields: [
    defineField({
      name: 'openEditionDescription',
      title: 'Open Edition Print — description',
      type: 'text',
      rows: 3,
      description: 'Shown when "Open Edition Print" is selected.',
    }),
    defineField({
      name: 'podPaperDescription',
      title: 'Custom Print — description',
      type: 'text',
      rows: 3,
      description: 'Shown when "Custom Print" is selected.',
    }),
    defineField({
      name: 'podCanvasDescription',
      title: 'Custom Canvas — description',
      type: 'text',
      rows: 3,
      description: 'Shown when "Custom Canvas" is selected.',
    }),
  ],
  preview: {
    prepare: () => ({ title: 'Print Type Descriptions' }),
  },
})
