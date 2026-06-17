import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { visionTool } from '@sanity/vision'
import { schemaTypes } from './sanity/schemas'

const singletons = [
  'homepageSettings',
  'announcementBanner',
  'storeBanner',
  'siteSettings',
  'pricingRules',
  'printTypeInfo',
  'shippingRates',
]

export default defineConfig({
  name: 'robert-duncan-fine-art',
  title: 'Robert Duncan Fine Art',

  projectId: 'pwxocvdd',
  dataset: 'production',

  plugins: [
    structureTool({
      structure: (S) =>
        S.list()
          .title('Content')
          .items([
            S.listItem()
              .title('Artwork')
              .schemaType('artwork')
              .child(S.documentTypeList('artwork')),
            S.listItem()
              .title('Products')
              .schemaType('product')
              .child(S.documentTypeList('product')),
            S.listItem()
              .title('Frames')
              .schemaType('frame')
              .child(S.documentTypeList('frame')),
            S.listItem()
              .title('Categories')
              .schemaType('category')
              .child(S.documentTypeList('category')),
            S.divider(),
            S.listItem()
              .title('Homepage Settings')
              .id('homepageSettings')
              .child(
                S.document()
                  .schemaType('homepageSettings')
                  .documentId('homepageSettings'),
              ),
            S.listItem()
              .title('Announcement Banner')
              .id('announcementBanner')
              .child(
                S.document()
                  .schemaType('announcementBanner')
                  .documentId('announcementBanner'),
              ),
            S.listItem()
              .title('Store Banner')
              .id('storeBanner')
              .child(
                S.document()
                  .schemaType('storeBanner')
                  .documentId('storeBanner'),
              ),
            S.listItem()
              .title('Site Settings')
              .id('siteSettings')
              .child(
                S.document()
                  .schemaType('siteSettings')
                  .documentId('siteSettings'),
              ),
            S.listItem()
              .title('Pricing Rules')
              .id('pricingRules')
              .child(
                S.document()
                  .schemaType('pricingRules')
                  .documentId('pricingRules'),
              ),
            S.listItem()
              .title('Print Type Descriptions')
              .id('printTypeInfo')
              .child(
                S.document()
                  .schemaType('printTypeInfo')
                  .documentId('printTypeInfo'),
              ),
            S.listItem()
              .title('Shipping Rates')
              .id('shippingRates')
              .child(
                S.document()
                  .schemaType('shippingRates')
                  .documentId('shippingRates'),
              ),
          ]),
    }),
    visionTool(),
  ],

  schema: {
    types: schemaTypes,
    templates: (templates) =>
      templates.filter(({ schemaType }) => !singletons.includes(schemaType)),
  },
})
