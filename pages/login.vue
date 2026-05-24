<script setup lang="ts">
definePageMeta({ layout: 'default' })

useSeoMeta({
  title: 'Log In — Robert Duncan Fine Art',
  description: 'Log in to your account.',
})

const supabase = useSupabaseClient()
const user = useSupabaseUser()
const route = useRoute()

const nextPath = computed(() => (route.query.next as string) || '/account')

// Already signed in → bounce to next
watchEffect(() => {
  if (user.value) navigateTo(nextPath.value)
})

const form = reactive({ email: '', password: '' })
const state = ref<'idle' | 'submitting' | 'error'>('idle')
const errorMessage = ref('')

async function submit() {
  if (state.value === 'submitting') return
  state.value = 'submitting'
  errorMessage.value = ''

  const { error } = await supabase.auth.signInWithPassword({
    email: form.email,
    password: form.password,
  })

  if (error) {
    state.value = 'error'
    errorMessage.value = error.message
    return
  }

  // The watchEffect above will redirect once user populates.
  state.value = 'idle'
}
</script>

<template>
  <div class="max-w-7xl mx-auto px-6 lg:px-10 py-20">
    <div class="max-w-md mx-auto">
      <div class="mb-12 text-center">
        <p class="font-ui text-xs tracking-widest uppercase text-brown/50 mb-3">Welcome Back</p>
        <h1 class="font-heading text-4xl md:text-5xl text-brown">Log In</h1>
      </div>

      <form class="space-y-8" @submit.prevent="submit">
        <div class="space-y-1">
          <label for="email" class="font-ui text-xs tracking-widest uppercase text-brown/60">Email</label>
          <input
            id="email"
            v-model="form.email"
            type="email"
            required
            autocomplete="email"
            class="w-full border-b border-brown/30 bg-transparent py-3 font-body text-brown placeholder:text-brown/30 focus:outline-none focus:border-brown transition-colors"
            placeholder="your@email.com"
          />
        </div>

        <div class="space-y-1">
          <div class="flex items-baseline justify-between">
            <label for="password" class="font-ui text-xs tracking-widest uppercase text-brown/60">Password</label>
            <NuxtLink to="/forgot-password" class="font-ui text-[10px] tracking-widest uppercase text-brown/50 hover:text-brown transition-colors">
              Forgot?
            </NuxtLink>
          </div>
          <input
            id="password"
            v-model="form.password"
            type="password"
            required
            autocomplete="current-password"
            class="w-full border-b border-brown/30 bg-transparent py-3 font-body text-brown placeholder:text-brown/30 focus:outline-none focus:border-brown transition-colors"
          />
        </div>

        <p v-if="state === 'error'" class="font-ui text-xs text-rust">
          {{ errorMessage }}
        </p>

        <AppButton type="submit" variant="primary" size="lg" :disabled="state === 'submitting'">
          {{ state === 'submitting' ? 'Logging in…' : 'Log In' }}
        </AppButton>

        <p class="font-ui text-xs text-brown/60 text-center">
          Don't have an account?
          <NuxtLink :to="`/signup${route.query.next ? `?next=${route.query.next}` : ''}`" class="text-brown hover:text-rust transition-colors underline underline-offset-4 ml-1">
            Sign up
          </NuxtLink>
        </p>
      </form>
    </div>
  </div>
</template>
