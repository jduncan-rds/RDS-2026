import { defineField, defineType } from 'sanity'

export const announcementBanner = defineType({
  name: 'announcementBanner',
  title: 'Announcement Banner',
  type: 'document',
  __experimental_actions: ['update', 'publish'],
  fields: [
    defineField({
      name: 'enabled',
      title: 'Show banner',
      type: 'boolean',
      description: 'Turn this off to hide the banner across the site without deleting the text.',
      initialValue: false,
    }),
    defineField({
      name: 'text',
      title: 'Announcement Text',
      type: 'array',
      description:
        'Shows under the navigation bar on every page. Highlight text and use the toolbar for Bold, Italic, or a link.',
      of: [
        {
          type: 'block',
          // Keep it to a single inline line — no headings or lists.
          styles: [{ title: 'Normal', value: 'normal' }],
          lists: [],
          marks: {
            decorators: [
              { title: 'Bold', value: 'strong' },
              { title: 'Italic', value: 'em' },
            ],
            annotations: [
              {
                name: 'link',
                type: 'object',
                title: 'Link',
                fields: [
                  defineField({
                    name: 'href',
                    title: 'URL',
                    type: 'url',
                    validation: (r) =>
                      r.uri({ scheme: ['http', 'https', 'mailto', 'tel'], allowRelative: true }),
                  }),
                ],
              },
            ],
          },
        },
      ],
    }),
    defineField({
      name: 'tone',
      title: 'Color',
      type: 'string',
      description: 'Background color of the banner.',
      options: {
        list: [
          { title: 'Dark (default)', value: 'dark' },
          { title: 'Rust', value: 'rust' },
          { title: 'Sage', value: 'sage' },
          { title: 'Cream', value: 'cream' },
        ],
        layout: 'radio',
      },
      initialValue: 'dark',
    }),
  ],
  preview: {
    select: { enabled: 'enabled' },
    prepare({ enabled }) {
      return {
        title: 'Announcement Banner',
        subtitle: enabled ? 'Showing' : 'Hidden',
      }
    },
  },
})
