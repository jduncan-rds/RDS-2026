<script setup lang="ts">
definePageMeta({ layout: 'default' })

useSeoMeta({
  title: 'Create Account — Robert Duncan Fine Art',
  description: 'Create an account to save favorites and track your orders.',
})

const supabase = useSupabaseClient()
const user = useSupabaseUser()
const route = useRoute()

// Already signed in → bounce to account
watchEffect(() => {
  if (user.value) navigateTo((route.query.next as string) || '/account')
})

const form = reactive({ fullName: '', email: '', password: '' })
const state = ref<'idle' | 'submitting' | 'success' | 'error'>('idle')
const errorMessage = ref('')

async function submit() {
  if (state.value === 'submitting') return
  if (form.password.length < 8) {
    state.value = 'error'
    errorMessage.value = 'Password must be at least 8 characters.'
    return
  }

  state.value = 'submitting'
  errorMessage.value = ''

  const origin = window.location.origin
  const { error } = await supabase.auth.signUp({
    email: form.email,
    password: form.password,
    options: {
      data: { full_name: form.fullName },
      emailRedirectTo: `${origin}/confirm`,
    },
  })

  if (error) {
    state.value = 'error'
    errorMessage.value = error.message
    return
  }

  state.value = 'success'
}
</script>

<template>
  <div class="max-w-7xl mx-auto px-6 lg:px-10 py-20">
    <div class="max-w-md mx-auto">
      <div class="mb-12 text-center">
        <p class="font-ui text-xs tracking-widest uppercase text-brown/50 mb-3">Welcome</p>
        <h1 class="font-heading text-4xl md:text-5xl text-brown">Create Account</h1>
      </div>

      <div v-if="state === 'success'" class="border border-sage/40 bg-sage/5 px-8 py-10">
        <p class="font-heading text-2xl text-brown mb-2">Check your email.</p>
        <p class="font-body text-brown/70">
          We sent a confirmation link to <span class="text-brown">{{ form.email }}</span>. Click it to finish creating your account.
        </p>
      </div>

      <form v-else class="space-y-8" @submit.prevent="submit">
        <div class="space-y-1">
          <label for="full_name" class="font-ui text-xs tracking-widest uppercase text-brown/60">Name</label>
          <input
            id="full_name"
            v-model="form.fullName"
            type="text"
            required
            autocomplete="name"
            class="w-full border-b border-brown/30 bg-transparent py-3 font-body text-brown placeholder:text-brown/30 focus:outline-none focus:border-brown transition-colors"
            placeholder="Your name"
          />
        </div>

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
          <label for="password" class="font-ui text-xs tracking-widest uppercase text-brown/60">Password</label>
          <input
            id="password"
            v-model="form.password"
            type="password"
            required
            minlength="8"
            autocomplete="new-password"
            class="w-full border-b border-brown/30 bg-transparent py-3 font-body text-brown placeholder:text-brown/30 focus:outline-none focus:border-brown transition-colors"
            placeholder="At least 8 characters"
          />
        </div>

        <p v-if="state === 'error'" class="font-ui text-xs text-rust">
          {{ errorMessage }}
        </p>

        <AppButton type="submit" variant="primary" size="lg" :disabled="state === 'submitting'">
          {{ state === 'submitting' ? 'Creating…' : 'Create Account' }}
        </AppButton>

        <p class="font-ui text-xs text-brown/60 text-center">
          Already have an account?
          <NuxtLink to="/login" class="text-brown hover:text-rust transition-colors underline underline-offset-4 ml-1">
            Log in
          </NuxtLink>
        </p>
      </form>
    </div>
  </div>
</template>
