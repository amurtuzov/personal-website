const baseURL = (process.env.NUXT_PUBLIC_BASE_URL || 'https://photos.amurtuzov.com').replace(/\/$/, '')
const apiURL = (process.env.NUXT_PUBLIC_API_URL || 'http://localhost:4000').replace(/\/$/, '')

export default defineNuxtConfig({
  ssr: true,

  modules: ['@nuxt/image'],

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
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'shortcut icon', href: '/favicon.svg' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Lora:wght@400;500&family=Sora:wght@400;500;600&display=swap',
        },
      ],
    },
  },

  css: [],

  runtimeConfig: {
    public: {
      siteName: 'Anar Murtuzov - Photo Blog',
      siteDescription: 'A curated photo journal by Anar Murtuzov with travel, city, and everyday albums.',
      baseURL,
      apiURL,
    },
  },

  image: {
    provider: 'none',
    format: ['webp'],
    screens: {
      two: 769,
      three: 1441,
      four: 1922,
    },
    domains: [
      'localhost',
      '127.0.0.1',
      'amurtuzov-photos.ams3.digitaloceanspaces.com',
      'amurtuzov-photos.ams3.cdn.digitaloceanspaces.com',
    ],
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
