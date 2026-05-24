<script setup lang="ts">
definePageMeta({ layout: 'default' })

useSeoMeta({
  title: 'Set New Password — Robert Duncan Fine Art',
  description: 'Set a new password for your account.',
})

const supabase = useSupabaseClient()
const user = useSupabaseUser()

const form = reactive({ password: '' })
const state = ref<'idle' | 'submitting' | 'success' | 'error'>('idle')
const errorMessage = ref('')

// Supabase delivers the user here from the reset email with a recovery session
// already exchanged. If we land here without a session, the link expired or
// was already used.
const hasSession = computed(() => !!user.value)

async function submit() {
  if (state.value === 'submitting') return
  if (form.password.length < 8) {
    state.value = 'error'
    errorMessage.value = 'Password must be at least 8 characters.'
    return
  }

  state.value = 'submitting'
  errorMessage.value = ''

  const { error } = await supabase.auth.updateUser({ password: form.password })

  if (error) {
    state.value = 'error'
    errorMessage.value = error.message
    return
  }

  state.value = 'success'
  setTimeout(() => navigateTo('/account'), 1500)
}
</script>

<template>
  <div class="max-w-7xl mx-auto px-6 lg:px-10 py-20">
    <div class="max-w-md mx-auto">
      <div class="mb-12 text-center">
        <p class="font-ui text-xs tracking-widest uppercase text-brown/50 mb-3">Almost There</p>
        <h1 class="font-heading text-4xl md:text-5xl text-brown">New Password</h1>
      </div>

      <div v-if="!hasSession" class="border border-rust/40 bg-rust/5 px-8 py-10">
        <p class="font-heading text-2xl text-brown mb-2">Link expired.</p>
        <p class="font-body text-brown/70 mb-6">
          This password reset link is no longer valid. Request a new one to continue.
        </p>
        <NuxtLink to="/forgot-password" class="font-ui text-xs tracking-widest uppercase text-brown hover:text-rust transition-colors underline underline-offset-4">
          Request a new link
        </NuxtLink>
      </div>

      <div v-else-if="state === 'success'" class="border border-sage/40 bg-sage/5 px-8 py-10">
        <p class="font-heading text-2xl text-brown mb-2">Password updated.</p>
        <p class="font-body text-brown/70">Redirecting to your account…</p>
      </div>

      <form v-else class="space-y-8" @submit.prevent="submit">
        <div class="space-y-1">
          <label for="password" class="font-ui text-xs tracking-widest uppercase text-brown/60">New Password</label>
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
          {{ state === 'submitting' ? 'Saving…' : 'Update Password' }}
        </AppButton>
      </form>
    </div>
  </div>
</template>
