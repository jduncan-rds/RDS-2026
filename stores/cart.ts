import { defineStore } from 'pinia'

export interface CartItem {
  productId: string
  artworkSlug: string
  title: string
  imageUrl: string
  mediaType: 'original' | 'open_edition' | 'pod_paper' | 'pod_canvas'
  size: string | null
  frameId: string | null
  frameName: string | null
  quantity: number
  unitPrice: number
}

export const useCartStore = defineStore('cart', {
  state: () => ({
    items: [] as CartItem[],
  }),

  getters: {
    count: (state) => state.items.reduce((sum, i) => sum + i.quantity, 0),
    total: (state) => state.items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0),
  },

  actions: {
    add(item: CartItem) {
      const existing = this.items.find(
        (i) =>
          i.productId === item.productId &&
          i.mediaType === item.mediaType &&
          i.size === item.size &&
          i.frameId === item.frameId,
      )
      if (existing) {
        existing.quantity += item.quantity
      } else {
        this.items.push({ ...item })
      }
    },
    remove(index: number) {
      this.items.splice(index, 1)
    },
    clear() {
      this.items = []
    },
  },

  persist: true,
})
