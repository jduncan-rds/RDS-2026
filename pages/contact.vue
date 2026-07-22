<script setup lang="ts">
useSeoMeta({
  title: 'Contact — Robert Duncan Fine Art',
  description: 'Get in touch with Robert Duncan Fine Art.',
})

const form = reactive({ name: '', email: '', message: '', _honeypot: '' })
const state = ref<'idle' | 'submitting' | 'success' | 'error'>('idle')
const errorMessage = ref('')

async function submit() {
  if (state.value === 'submitting') return
  state.value = 'submitting'
  errorMessage.value = ''

  try {
    await $fetch('/api/contact', { method: 'POST', body: form })
    state.value = 'success'
    form.name = ''
    form.email = ''
    form.message = ''
  } catch (err: any) {
    state.value = 'error'
    errorMessage.value = err?.data?.statusMessage ?? 'Something went wrong. Please try again.'
  }
}
</script>

<template>
  <div class="max-w-7xl mx-auto px-6 lg:px-10 py-20">
    <div class="max-w-2xl">
      <!-- Page header -->
      <div class="mb-16">
        <p class="font-ui text-xs tracking-widest uppercase text-brown/50 mb-3">Reach Out</p>
        <h1 class="font-heading text-5xl md:text-6xl text-brown">Get in Touch</h1>
      </div>

      <!-- Success state -->
      <div v-if="state === 'success'" class="border border-sage/40 bg-sage/5 px-8 py-10">
        <p class="font-heading text-2xl text-brown mb-2">Message sent.</p>
        <p class="font-body text-brown/70">Thank you for reaching out — we will be in touch soon.</p>
        <button class="mt-6 font-ui text-xs tracking-widest uppercase text-brown/50 hover:text-brown transition-colors underline underline-offset-4" @click="state = 'idle'">
          Send another message
        </button>
      </div>

      <!-- Form -->
      <form v-else class="space-y-8" @submit.prevent="submit">
        <!-- Honeypot (hidden from real users) -->
        <input v-model="form._honeypot" type="text" name="_honeypot" tabindex="-1" autocomplete="off" class="hidden" aria-hidden="true" />

        <div class="space-y-1">
          <label for="name" class="font-ui text-xs tracking-widest uppercase text-brown/60">Name</label>
          <input
            id="name"
            v-model="form.name"
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
          <label for="message" class="font-ui text-xs tracking-widest uppercase text-brown/60">Message</label>
          <textarea
            id="message"
            v-model="form.message"
            required
            rows="6"
            class="w-full border-b border-brown/30 bg-transparent py-3 font-body text-brown placeholder:text-brown/30 focus:outline-none focus:border-brown transition-colors resize-none"
            placeholder="How can we help?"
          />
        </div>

        <p v-if="state === 'error'" class="font-ui text-xs text-rust">
          {{ errorMessage }}
        </p>

        <AppButton type="submit" variant="primary" size="lg" :disabled="state === 'submitting'">
          {{ state === 'submitting' ? 'Sending…' : 'Send Message' }}
        </AppButton>
      </form>
    </div>
  </div>
</template>
