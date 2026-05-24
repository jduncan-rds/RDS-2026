/**
 * Returns the current authenticated user's UUID (or null if not signed in).
 *
 * `@nuxtjs/supabase` v2's `useSupabaseUser()` ref holds the JWT payload, where
 * the user id lives in the `sub` claim — NOT `.id`. The library's TypeScript
 * type still claims it's a supabase-js `User` (with `.id`), so reaching for
 * `user.value.id` silently returns undefined at runtime and breaks any RLS
 * query that filters by `user_id`. Read both fields so we're robust to either
 * shape if the upstream type ever flips.
 *
 * Same convention applies on the server via `serverSupabaseUser(event).sub`.
 */
export function useAuthedUserId() {
  const user = useSupabaseUser()
  return computed<string | null>(() => {
    const u = user.value as unknown as { id?: string; sub?: string } | null
    return u?.id ?? u?.sub ?? null
  })
}
