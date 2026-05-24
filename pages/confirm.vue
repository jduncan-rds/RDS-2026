<script setup lang="ts">
definePageMeta({ layout: 'default' })

useSeoMeta({
  title: 'Email Confirmed — Robert Duncan Fine Art',
})

const user = useSupabaseUser()
const route = useRoute()

// The @nuxtjs/supabase callback exchanges the code from the email link for a
// session, then lands us here. If a session is present, send the user wherever
// they were headed; otherwise show an "open the link on this device" message.
watchEffect(() => {
  if (user.value) {
    const next = (route.query.next as string) || '/account'
    navigateTo(next)
  }
})
</script>

<template>
  <div class="max-w-7xl mx-auto px-6 lg:px-10 py-20">
    <div class="max-w-md mx-auto text-center">
      <p class="font-ui text-xs tracking-widest uppercase text-brown/50 mb-3">One Moment</p>
      <h1 class="font-heading text-4xl md:text-5xl text-brown mb-6">Confirming…</h1>
      <p class="font-body text-brown/70">
        If you aren't redirected automatically, please open the confirmation link on the same device where you signed up.
      </p>
      <NuxtLink to="/login" class="inline-block mt-8 font-ui text-xs tracking-widest uppercase text-brown hover:text-rust transition-colors underline underline-offset-4">
        Go to log in
      </NuxtLink>
    </div>
  </div>
</template>
