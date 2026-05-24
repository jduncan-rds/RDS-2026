<script setup lang="ts">
import groq from 'groq'

definePageMeta({ layout: 'default' })

useSeoMeta({
  title: 'Orders — Robert Duncan Fine Art',
})

const supabase = useSupabaseClient()
const userId = useAuthedUserId()
const sanity = useSanity()

interface OrderItem {
  id: string
  sanity_product_id: string
  title_snapshot: string
  image_url_snapshot: string | null
  media_type: 'original' | 'open_edition' | 'pod_paper' | 'pod_canvas'
  size: string | null
  frame_id: string | null
  quantity: number
  unit_price: number
}

interface Order {
  id: string
  status: 'pending' | 'confirmed' | 'shipped' | 'complete'
  total: number
  created_at: string
  shipping_address: Record<string, any> | null
  order_items: OrderItem[]
}

const { data: orders, pending } = await useAsyncData<Order[]>(
  'account-orders',
  async () => {
    const id = userId.value
    if (!id) return []
    // RLS scopes this to the current user's orders + their items.
    // Pending orders are excluded — they represent abandoned/in-flight carts
    // and would confuse the customer.
    const { data, error } = await supabase
      .from('orders')
      .select(`
        id, status, total, created_at, shipping_address,
        order_items (
          id, sanity_product_id, title_snapshot, image_url_snapshot,
          media_type, size, frame_id, quantity, unit_price
        )
      `)
      .eq('user_id', id)
      .neq('status', 'pending')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[orders] fetch failed', error)
      return []
    }
    return (data as Order[]) ?? []
  },
  { watch: [userId] },
)

// Resolve frame names from Sanity for every distinct frame_id across the
// user's orders. order_items only stores frame_id (Sanity ref), so a single
// batched lookup is cheaper than per-row Sanity reads and survives even when
// the user has many historical orders.
const frameIds = computed(() => {
  const ids = new Set<string>()
  for (const order of orders.value ?? []) {
    for (const item of order.order_items) {
      if (item.frame_id) ids.add(item.frame_id)
    }
  }
  return Array.from(ids)
})

const { data: frameNameMap } = await useAsyncData(
  'orders-frame-names',
  async () => {
    if (!frameIds.value.length) return {} as Record<string, string>
    const frames = await sanity.client.fetch<Array<{ _id: string; name: string }>>(
      groq`*[_type == "frame" && _id in $ids] { _id, name }`,
      { ids: frameIds.value },
    )
    return Object.fromEntries(frames.map((f) => [f._id, f.name]))
  },
  { watch: [frameIds], default: () => ({}) as Record<string, string> },
)

function frameLabelFor(item: OrderItem): string {
  if (!item.frame_id) return 'Unframed'
  return frameNameMap.value?.[item.frame_id] ?? 'Frame'
}

const mediaTypeLabel: Record<string, string> = {
  original: 'Original Painting',
  open_edition: 'Open Edition Print',
  pod_paper: 'Custom Print',
  pod_canvas: 'Custom Canvas',
}

const statusLabel: Record<string, string> = {
  confirmed: 'Confirmed',
  shipped: 'Shipped',
  complete: 'Complete',
}

const statusClass: Record<string, string> = {
  confirmed: 'bg-sage/15 text-sage border-sage/30',
  shipped: 'bg-dustyblue/15 text-dustyblue border-dustyblue/30',
  complete: 'bg-brown/10 text-brown/60 border-brown/20',
}

function shortId(id: string) {
  return id.slice(-8).toUpperCase()
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function formatPrice(cents: number) {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatAddress(addr: Record<string, any> | null): string[] {
  if (!addr) return []
  // Stripe's shipping_address shape from the Checkout Session
  const a = addr.address ?? addr
  const name = addr.name ?? a.name
  const lines: string[] = []
  if (name) lines.push(name)
  if (a.line1) lines.push(a.line1)
  if (a.line2) lines.push(a.line2)
  const cityLine = [a.city, a.state, a.postal_code].filter(Boolean).join(', ')
  if (cityLine) lines.push(cityLine)
  if (a.country && a.country !== 'US') lines.push(a.country)
  return lines
}
</script>

<template>
  <div class="max-w-7xl mx-auto px-6 lg:px-10 py-20">
    <div class="max-w-4xl">
      <AccountNav />

      <h2 class="font-heading text-3xl text-brown mb-8">Orders</h2>

      <div v-if="pending" class="py-16 text-center">
        <p class="font-body text-brown/40 italic">Loading orders…</p>
      </div>

      <div v-else-if="!orders?.length" class="py-16 text-center border border-brown/10">
        <p class="font-body text-brown/50 text-lg italic mb-6">No orders yet.</p>
        <NuxtLink
          to="/shop"
          class="font-ui text-xs tracking-widest uppercase text-brown hover:text-rust transition-colors underline underline-offset-4"
        >
          Browse the shop
        </NuxtLink>
      </div>

      <div v-else class="space-y-10">
        <article
          v-for="order in orders"
          :key="order.id"
          class="border border-brown/15"
        >
          <!-- Order header -->
          <header class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-brown/10 px-6 py-4">
            <div class="flex items-center gap-4">
              <div>
                <p class="font-ui text-[10px] tracking-widest uppercase text-brown/40">Order</p>
                <p class="font-ui text-xs tracking-widest uppercase text-brown">#{{ shortId(order.id) }}</p>
              </div>
              <div class="w-px h-8 bg-brown/10" />
              <div>
                <p class="font-ui text-[10px] tracking-widest uppercase text-brown/40">Placed</p>
                <p class="font-body text-sm text-brown">{{ formatDate(order.created_at) }}</p>
              </div>
            </div>
            <div class="flex items-center gap-4">
              <span
                :class="[
                  'font-ui text-[10px] tracking-widest uppercase px-2.5 py-1 border',
                  statusClass[order.status] ?? 'bg-brown/10 text-brown/60 border-brown/20',
                ]"
              >
                {{ statusLabel[order.status] ?? order.status }}
              </span>
              <p class="font-heading text-xl text-brown">{{ formatPrice(order.total) }}</p>
            </div>
          </header>

          <!-- Items -->
          <div class="px-6 py-5 space-y-5">
            <div
              v-for="item in order.order_items"
              :key="item.id"
              class="flex gap-4"
            >
              <img
                v-if="item.image_url_snapshot"
                :src="item.image_url_snapshot"
                :alt="item.title_snapshot"
                class="w-16 h-16 object-cover shrink-0"
              />
              <div v-else class="w-16 h-16 bg-brown/10 shrink-0" />
              <div class="flex-1 min-w-0">
                <p class="font-heading text-base text-brown">{{ item.title_snapshot }}</p>
                <p class="font-ui text-xs tracking-widest uppercase text-brown/50 mt-1">
                  {{ mediaTypeLabel[item.media_type] ?? item.media_type }}
                  <template v-if="item.size"> · {{ item.size }}</template>
                  <template v-if="item.media_type !== 'original'">
                    · Frame: {{ frameLabelFor(item) }}
                  </template>
                </p>
              </div>
              <div class="text-right shrink-0">
                <p class="font-body text-brown">{{ formatPrice(item.unit_price) }}</p>
                <p v-if="item.quantity > 1" class="font-ui text-xs text-brown/40 mt-1">
                  Qty {{ item.quantity }}
                </p>
              </div>
            </div>
          </div>

          <!-- Shipping address -->
          <footer
            v-if="order.shipping_address"
            class="border-t border-brown/10 px-6 py-4 bg-brown/[0.02]"
          >
            <p class="font-ui text-[10px] tracking-widest uppercase text-brown/40 mb-2">Shipping To</p>
            <address class="font-body text-sm text-brown/80 not-italic leading-relaxed">
              <span
                v-for="(line, i) in formatAddress(order.shipping_address)"
                :key="i"
                class="block"
              >{{ line }}</span>
            </address>
          </footer>
        </article>
      </div>
    </div>
  </div>
</template>
