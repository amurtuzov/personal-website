const baseURL = (process.env.NUXT_PUBLIC_BASE_URL || 'https://photos.amurtuzov.com').replace(/\/$/, '')

export default defineNuxtConfig({
  imports: {
    autoImport: true,
  },

  app: {
    head: {
      htmlAttrs: {
        lang: 'en',
      },
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,700&family=Manrope:wght@400;500;600&display=swap',
        },
      ],
    },
  },

  css: [],

  runtimeConfig: {
    public: {
      siteName: 'Anar Murtuzov - Photo Blog',
      siteDescription: 'A curated photo blog by Anar Murtuzov. Launching soon.',
      baseURL,
    },
  },

  vite: {
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: '@use "~/assets/styles/main" as *;',
        },
      },
    },
  },

  compatibilityDate: '2025-01-01',
})
