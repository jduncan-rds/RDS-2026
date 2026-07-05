<script setup lang="ts">
import groq from 'groq'
import { PortableText } from '@portabletext/vue'

useSeoMeta({
  title: 'About Robert Duncan — Robert Duncan Fine Art',
  description: 'Learn about Western and wildlife artist Robert Duncan — his life, inspiration, and artistic journey.',
})

interface SiteSettings {
  aboutPhoto?: any
  aboutText?: any
  contactEmail?: string | null
  phoneNumber?: string | null
}

const { data: settings } = await useSanityQuery<SiteSettings>(groq`
  *[_type == "siteSettings"][0]{
    aboutPhoto,
    aboutText,
    contactEmail,
    phoneNumber
  }
`)
</script>

<template>
  <div class="max-w-7xl mx-auto px-6 lg:px-10 py-20">
    <!-- Page header -->
    <div class="mb-16">
      <p class="font-ui text-xs tracking-widest uppercase text-brown/50 mb-3">The Artist</p>
      <h1 class="font-heading text-5xl md:text-6xl text-brown">About Robert</h1>
    </div>

    <div class="grid lg:grid-cols-2 gap-16 lg:gap-24 items-start">
      <!-- Photo -->
      <div class="order-first lg:order-last">
        <div class="bg-brown/5 overflow-hidden">
          <SanityImage
            v-if="settings?.aboutPhoto"
            :image="settings.aboutPhoto"
            alt="Robert Duncan"
            :width="900"
            fit="crop"
            aspect-ratio="3/4"
            class="w-full"
          />
          <div v-else class="aspect-[3/4] w-full bg-brown/10 flex items-center justify-center">
            <span class="font-ui text-xs tracking-widest uppercase text-brown/30">Photo coming soon</span>
          </div>
        </div>
      </div>

      <!-- Bio text -->
      <div class="order-last lg:order-first">
        <div
          v-if="settings?.aboutText"
          class="prose prose-lg font-body text-brown/80 leading-relaxed space-y-5"
        >
          <PortableText :value="settings.aboutText" />
        </div>
        <div v-else class="font-body text-brown/50 italic">
          Artist statement coming soon.
        </div>

        <!-- Contact details -->
        <div v-if="settings?.contactEmail || settings?.phoneNumber" class="mt-12 pt-12 border-t border-brown/10 space-y-2">
          <p v-if="settings.contactEmail" class="font-ui text-sm text-brown/70">
            <span class="tracking-widest uppercase text-xs text-brown/40 block mb-1">Email</span>
            <a :href="`mailto:${settings.contactEmail}`" class="hover:text-rust transition-colors">
              {{ settings.contactEmail }}
            </a>
          </p>
          <p v-if="settings.phoneNumber" class="font-ui text-sm text-brown/70">
            <span class="tracking-widest uppercase text-xs text-brown/40 block mb-1">Phone</span>
            {{ settings.phoneNumber }}
          </p>
        </div>

        <div class="mt-10 flex gap-4 flex-wrap">
          <AppButton as="NuxtLink" to="/originals" variant="primary">View Originals</AppButton>
          <AppButton as="NuxtLink" to="/contact" variant="secondary">Get in Touch</AppButton>
        </div>
      </div>
    </div>
  </div>
</template>
