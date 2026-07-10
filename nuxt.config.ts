export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  app: {
    head: {
      link: [
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=EB+Garamond:ital,wght@0,400;1,400&family=Raleway:wght@300;400;500&display=swap',
        },
      ],
    },
  },
  components: {
    dirs: [{ path: '~/components/ui', pathPrefix: false }],
  },
  modules: [
    '@nuxtjs/tailwindcss',
    '@nuxt/eslint',
    '@nuxtjs/sanity',
    '@nuxtjs/supabase',
    '@pinia/nuxt',
    '@pinia-plugin-persistedstate/nuxt',
  ],
  sanity: {
    projectId: process.env.NUXT_SANITY_PROJECT_ID,
    dataset: process.env.NUXT_SANITY_DATASET ?? 'production',
    apiVersion: '2025-05-20',
    useCdn: process.env.NODE_ENV === 'production',
  },
  supabase: {
    url: process.env.NUXT_PUBLIC_SUPABASE_URL,
    key: process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY,
    redirectOptions: {
      login: '/login',
      callback: '/confirm',
      include: ['/account(/.*)?'],
      exclude: [],
      saveRedirectToCookie: true,
    },
  },
  runtimeConfig: {
    sanityApiToken: process.env.SANITY_API_TOKEN,
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    stripeSecretKey: process.env.STRIPE_SECRET_KEY,
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    // Off by default — Stripe rejects session creation with automatic_tax
    // enabled unless Stripe Tax is turned on (and nexus registered) in the
    // Dashboard first. Flip to 'true' only after that's done.
    stripeAutomaticTax: process.env.STRIPE_AUTOMATIC_TAX,
    shipstationApiKey: process.env.SHIPSTATION_API_KEY,
    shipstationApiSecret: process.env.SHIPSTATION_API_SECRET,
    ordersNotifyEmail: process.env.ORDERS_NOTIFY_EMAIL,
    contactEmail: process.env.CONTACT_EMAIL,
    resendApiKey: process.env.RESEND_API_KEY,
    resendFromEmail: process.env.RESEND_FROM_EMAIL,
    resendFromEmailOrders: process.env.RESEND_FROM_EMAIL_ORDERS,
    public: {
      supabaseUrl: process.env.NUXT_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY,
      stripePublishableKey: process.env.NUXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
      baseUrl: process.env.NUXT_PUBLIC_BASE_URL,
    },
  },
})
