<script setup lang="ts">
definePageMeta({ layout: 'default' })

useSeoMeta({
  title: 'Profile — Robert Duncan Fine Art',
})

const supabase = useSupabaseClient()
const user = useSupabaseUser()
const userId = useAuthedUserId()

// ─── Name ────────────────────────────────────────────────────────────
// Stored in both `profiles.full_name` (Supabase row) and the auth user
// metadata. Keep them in sync so the AccountNav header (which reads from
// user_metadata.full_name) updates instantly.
const fullName = ref<string>(
  ((user.value?.user_metadata as Record<string, unknown> | undefined)?.full_name as string) || '',
)
const nameState = ref<'idle' | 'saving' | 'saved' | 'error'>('idle')
const nameError = ref('')

async function saveName() {
  if (!userId.value || nameState.value === 'saving') return
  nameState.value = 'saving'
  nameError.value = ''

  const trimmed = fullName.value.trim()
  const [{ error: metaErr }, { error: rowErr }] = await Promise.all([
    supabase.auth.updateUser({ data: { full_name: trimmed } }),
    supabase.from('profiles').update({ full_name: trimmed }).eq('id', userId.value),
  ])

  if (metaErr || rowErr) {
    nameState.value = 'error'
    nameError.value = (metaErr ?? rowErr)?.message ?? 'Could not save name.'
    return
  }
  nameState.value = 'saved'
  setTimeout(() => { if (nameState.value === 'saved') nameState.value = 'idle' }, 2000)
}

// ─── Email ───────────────────────────────────────────────────────────
// supabase.auth.updateUser({ email }) sends a confirmation link to the NEW
// address (and a notification to the OLD one). Email isn't actually changed
// until the user clicks the link in the new mailbox.
const emailFormOpen = ref(false)
const newEmail = ref('')
const emailState = ref<'idle' | 'saving' | 'sent' | 'error'>('idle')
const emailError = ref('')

async function changeEmail() {
  if (emailState.value === 'saving') return
  emailState.value = 'saving'
  emailError.value = ''

  const origin = window.location.origin
  const { error } = await supabase.auth.updateUser(
    { email: newEmail.value.trim() },
    { emailRedirectTo: `${origin}/confirm` },
  )

  if (error) {
    emailState.value = 'error'
    emailError.value = error.message
    return
  }
  emailState.value = 'sent'
}

// ─── Password ────────────────────────────────────────────────────────
// In-place change since they're already authed. No confirmation step.
const passwordFormOpen = ref(false)
const newPassword = ref('')
const passwordState = ref<'idle' | 'saving' | 'saved' | 'error'>('idle')
const passwordError = ref('')

async function changePassword() {
  if (passwordState.value === 'saving') return
  if (newPassword.value.length < 8) {
    passwordState.value = 'error'
    passwordError.value = 'Password must be at least 8 characters.'
    return
  }
  passwordState.value = 'saving'
  passwordError.value = ''

  const { error } = await supabase.auth.updateUser({ password: newPassword.value })

  if (error) {
    passwordState.value = 'error'
    passwordError.value = error.message
    return
  }
  passwordState.value = 'saved'
  newPassword.value = ''
  setTimeout(() => {
    if (passwordState.value === 'saved') {
      passwordState.value = 'idle'
      passwordFormOpen.value = false
    }
  }, 2000)
}
</script>

<template>
  <div class="max-w-7xl mx-auto px-6 lg:px-10 py-20">
    <div class="max-w-2xl">
      <AccountNav />

      <h2 class="font-heading text-3xl text-brown mb-10">Profile</h2>

      <div class="space-y-10">
        <!-- Name -->
        <section class="border-b border-brown/10 pb-10">
          <label for="full_name" class="font-ui text-xs tracking-widest uppercase text-brown/60 block mb-2">Name</label>
          <div class="flex gap-3">
            <input
              id="full_name"
              v-model="fullName"
              type="text"
              autocomplete="name"
              class="flex-1 border-b border-brown/30 bg-transparent py-2 font-body text-brown placeholder:text-brown/30 focus:outline-none focus:border-brown transition-colors"
              placeholder="Your name"
            />
            <AppButton variant="secondary" size="sm" :disabled="nameState === 'saving'" @click="saveName">
              {{ nameState === 'saving' ? 'Saving…' : nameState === 'saved' ? 'Saved ✓' : 'Save' }}
            </AppButton>
          </div>
          <p v-if="nameState === 'error'" class="font-ui text-xs text-rust mt-2">{{ nameError }}</p>
        </section>

        <!-- Email -->
        <section class="border-b border-brown/10 pb-10">
          <p class="font-ui text-xs tracking-widest uppercase text-brown/60 mb-2">Email</p>
          <div v-if="!emailFormOpen" class="flex items-center justify-between gap-4">
            <p class="font-body text-brown">{{ user?.email }}</p>
            <button
              type="button"
              class="font-ui text-xs tracking-widest uppercase text-brown/60 hover:text-brown transition-colors underline underline-offset-4"
              @click="emailFormOpen = true; newEmail = ''; emailState = 'idle'"
            >
              Change Email
            </button>
          </div>

          <div v-else-if="emailState === 'sent'" class="border border-sage/40 bg-sage/5 px-5 py-4">
            <p class="font-body text-brown mb-1">Confirmation sent.</p>
            <p class="font-body text-brown/60 text-sm">
              Click the link sent to <span class="text-brown">{{ newEmail }}</span> to finish the email change. Until then, your sign-in email stays the same.
            </p>
            <button
              type="button"
              class="mt-3 font-ui text-xs tracking-widest uppercase text-brown/50 hover:text-brown transition-colors underline underline-offset-4"
              @click="emailFormOpen = false"
            >
              Done
            </button>
          </div>

          <form v-else class="space-y-3" @submit.prevent="changeEmail">
            <input
              v-model="newEmail"
              type="email"
              required
              autocomplete="email"
              class="w-full border-b border-brown/30 bg-transparent py-2 font-body text-brown placeholder:text-brown/30 focus:outline-none focus:border-brown transition-colors"
              placeholder="new@email.com"
            />
            <p v-if="emailState === 'error'" class="font-ui text-xs text-rust">{{ emailError }}</p>
            <div class="flex gap-3">
              <AppButton type="submit" variant="primary" size="sm" :disabled="emailState === 'saving'">
                {{ emailState === 'saving' ? 'Sending…' : 'Send Confirmation' }}
              </AppButton>
              <button
                type="button"
                class="font-ui text-xs tracking-widest uppercase text-brown/40 hover:text-brown transition-colors"
                @click="emailFormOpen = false"
              >
                Cancel
              </button>
            </div>
          </form>
        </section>

        <!-- Password -->
        <section class="border-b border-brown/10 pb-10">
          <p class="font-ui text-xs tracking-widest uppercase text-brown/60 mb-2">Password</p>
          <div v-if="!passwordFormOpen" class="flex items-center justify-between gap-4">
            <p class="font-body text-brown/50 text-sm">••••••••</p>
            <button
              type="button"
              class="font-ui text-xs tracking-widest uppercase text-brown/60 hover:text-brown transition-colors underline underline-offset-4"
              @click="passwordFormOpen = true; newPassword = ''; passwordState = 'idle'"
            >
              Change Password
            </button>
          </div>

          <form v-else class="space-y-3" @submit.prevent="changePassword">
            <input
              v-model="newPassword"
              type="password"
              required
              minlength="8"
              autocomplete="new-password"
              class="w-full border-b border-brown/30 bg-transparent py-2 font-body text-brown placeholder:text-brown/30 focus:outline-none focus:border-brown transition-colors"
              placeholder="At least 8 characters"
            />
            <p v-if="passwordState === 'error'" class="font-ui text-xs text-rust">{{ passwordError }}</p>
            <p v-if="passwordState === 'saved'" class="font-ui text-xs text-sage">Password updated.</p>
            <div class="flex gap-3">
              <AppButton type="submit" variant="primary" size="sm" :disabled="passwordState === 'saving'">
                {{ passwordState === 'saving' ? 'Saving…' : 'Update Password' }}
              </AppButton>
              <button
                type="button"
                class="font-ui text-xs tracking-widest uppercase text-brown/40 hover:text-brown transition-colors"
                @click="passwordFormOpen = false"
              >
                Cancel
              </button>
            </div>
          </form>
        </section>

        <!-- Shipping addresses note -->
        <section>
          <p class="font-ui text-xs tracking-widest uppercase text-brown/60 mb-2">Shipping Addresses</p>
          <p class="font-body text-brown/60 text-sm leading-relaxed">
            Shipping addresses are saved and managed at checkout. Your most recent address will prefill automatically on your next order.
          </p>
        </section>
      </div>
    </div>
  </div>
</template>
