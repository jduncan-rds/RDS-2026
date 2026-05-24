<script setup lang="ts">
definePageMeta({ layout: 'default' })

useSeoMeta({
  title: 'Reset Password — Robert Duncan Fine Art',
  description: 'Request a password reset link.',
})

const supabase = useSupabaseClient()
const form = reactive({ email: '' })
const state = ref<'idle' | 'submitting' | 'success' | 'error'>('idle')
const errorMessage = ref('')

async function submit() {
  if (state.value === 'submitting') return
  state.value = 'submitting'
  errorMessage.value = ''

  const origin = window.location.origin
  const { error } = await supabase.auth.resetPasswordForEmail(form.email, {
    redirectTo: `${origin}/reset-password`,
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
        <p class="font-ui text-xs tracking-widest uppercase text-brown/50 mb-3">Account Recovery</p>
        <h1 class="font-heading text-4xl md:text-5xl text-brown">Reset Password</h1>
      </div>

      <div v-if="state === 'success'" class="border border-sage/40 bg-sage/5 px-8 py-10">
        <p class="font-heading text-2xl text-brown mb-2">Check your email.</p>
        <p class="font-body text-brown/70">
          If an account exists for <span class="text-brown">{{ form.email }}</span>, we sent a password reset link.
        </p>
      </div>

      <form v-else class="space-y-8" @submit.prevent="submit">
        <p class="font-body text-brown/70 text-sm">
          Enter your email and we'll send you a link to reset your password.
        </p>

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

        <p v-if="state === 'error'" class="font-ui text-xs text-rust">
          {{ errorMessage }}
        </p>

        <AppButton type="submit" variant="primary" size="lg" :disabled="state === 'submitting'">
          {{ state === 'submitting' ? 'Sending…' : 'Send Reset Link' }}
        </AppButton>

        <p class="font-ui text-xs text-brown/60 text-center">
          <NuxtLink to="/login" class="text-brown hover:text-rust transition-colors underline underline-offset-4">
            Back to log in
          </NuxtLink>
        </p>
      </form>
    </div>
  </div>
</template>
