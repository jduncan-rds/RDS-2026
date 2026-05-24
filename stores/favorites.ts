import { defineStore } from 'pinia'

/**
 * Guest users keep favorites in localStorage (the `localIds` array, persisted).
 * Authed users have favorites mirrored to Supabase (the `serverIds` array,
 * loaded from the `favorites` table). On login we merge local → server, then
 * load from server and clear local. On logout we clear server-side state but
 * keep nothing locally either (they signed out — different person could be on
 * the device).
 *
 * `ids` is the union used by the UI for "is this artwork favorited?" checks.
 */
export const useFavoritesStore = defineStore('favorites', {
  state: () => ({
    localIds: [] as string[],
    serverIds: [] as string[],
    hydrated: false,
  }),

  getters: {
    ids(state): string[] {
      if (state.serverIds.length) {
        // Union (server is source of truth when signed in, but merge-in-flight
        // local additions should still show as favorited)
        const set = new Set(state.serverIds)
        for (const id of state.localIds) set.add(id)
        return Array.from(set)
      }
      return state.localIds
    },
    has() {
      const ids = this.ids
      return (artworkId: string) => ids.includes(artworkId)
    },
    count(): number {
      return this.ids.length
    },
  },

  actions: {
    async toggle(artworkId: string) {
      const supabase = useSupabaseClient()
      const user = useSupabaseUser()

      if (user.value) {
        if (this.serverIds.includes(artworkId)) {
          this.serverIds = this.serverIds.filter((id) => id !== artworkId)
          await supabase
            .from('favorites')
            .delete()
            .eq('user_id', user.value.id)
            .eq('sanity_artwork_id', artworkId)
        } else {
          this.serverIds = [...this.serverIds, artworkId]
          await supabase
            .from('favorites')
            .insert({ user_id: user.value.id, sanity_artwork_id: artworkId })
        }
        return
      }

      // Guest — local only
      if (this.localIds.includes(artworkId)) {
        this.localIds = this.localIds.filter((id) => id !== artworkId)
      } else {
        this.localIds = [...this.localIds, artworkId]
      }
    },

    async hydrateForUser() {
      const supabase = useSupabaseClient()
      const user = useSupabaseUser()
      if (!user.value) return

      // Merge any guest-collected favorites into the user's account
      if (this.localIds.length > 0) {
        const rows = this.localIds.map((id) => ({
          user_id: user.value!.id,
          sanity_artwork_id: id,
        }))
        // upsert avoids duplicate-key errors if the user already favorited
        // some of these on another device
        await supabase
          .from('favorites')
          .upsert(rows, { onConflict: 'user_id,sanity_artwork_id', ignoreDuplicates: true })
        this.localIds = []
      }

      const { data } = await supabase
        .from('favorites')
        .select('sanity_artwork_id')
        .eq('user_id', user.value.id)

      this.serverIds = (data || []).map((r) => r.sanity_artwork_id as string)
      this.hydrated = true
    },

    clearOnSignOut() {
      this.serverIds = []
      this.localIds = []
      this.hydrated = false
    },
  },

  persist: {
    pick: ['localIds'],
  },
})
