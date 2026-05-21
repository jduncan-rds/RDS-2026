import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Server-only Supabase client using the service-role key.
 *
 * The service role bypasses Row Level Security, which is exactly what the
 * checkout route (order pre-creation) and the Stripe webhook (order
 * confirmation + fulfillment) need — they write on behalf of the system, not
 * an authenticated user. NEVER expose this client or the key to the browser.
 */
export function createSupabaseAdmin(): SupabaseClient {
  const config = useRuntimeConfig()
  const url = config.public.supabaseUrl as string
  const serviceRoleKey = config.supabaseServiceRoleKey as string

  if (!url || !serviceRoleKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Supabase is not configured (missing URL or service role key).',
    })
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
