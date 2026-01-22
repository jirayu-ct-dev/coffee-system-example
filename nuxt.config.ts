// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  // Nuxt UI v4 includes Tailwind CSS, no need for @nuxtjs/tailwindcss
  modules: ['@nuxt/ui'],

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    public: {
      liffId: process.env.NUXT_PUBLIC_LIFF_ID || '',
    },
  },

  // Allow ngrok and other external hosts for LIFF development
  vite: {
    server: {
      allowedHosts: ['localhost', '.ngrok-free.app', '.ngrok.io'],
    },
  },
})