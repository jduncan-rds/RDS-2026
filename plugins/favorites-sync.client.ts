/**
 * Keep the favorites Pinia store in sync with auth state.
 * - On login: merge guest favorites into the user's account, then load server state.
 * - On logout: clear loaded server state.
 *
 * Client-only because it depends on localStorage-persisted store hydration.
 */
export default defineNuxtPlugin(() => {
  const userId = useAuthedUserId()
  const favorites = useFavoritesStore()

  // Hydrate immediately if user already present (page reload while signed in)
  if (userId.value) {
    favorites.hydrateForUser()
  }

  watch(userId, (newId, oldId) => {
    if (newId && newId !== oldId) {
      favorites.hydrateForUser()
    } else if (!newId && oldId) {
      favorites.clearOnSignOut()
    }
  })
})
