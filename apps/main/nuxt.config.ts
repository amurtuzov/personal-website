const publicApiUrl = (process.env.NUXT_PUBLIC_API_URL || 'http://localhost:4000').replace(/\/$/, '')
const contactEndpoint = `${publicApiUrl}/api/contact`

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
        { rel: 'icon', type: 'image/svg+xml', href: '/icon.svg' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500&family=Space+Grotesk:wght@500;700&display=swap' },
      ],
    },
  },

  css: [],

  modules: [
    '@nuxt/icon',
    '@pinia/nuxt',
  ],

  icon: {
    customCollections: [
      {
        prefix: 'my-icon',
        dir: './app/assets/icons',
      },
    ],
  },

  runtimeConfig: {
    public: {
      siteName: 'Anar Murtuzov - Software Developer (Web / Full Stack, Frontend)',
      siteDescription: 'Portfolio of Anar Murtuzov, software developer with 8+ years of experience in frontend and full-stack web development: Vue.js, Nuxt.js, TypeScript, React, Node.js, Docker, CI/CD, and AI-assisted delivery workflows.',
      baseURL: 'https://amurtuzov.com',
      apiURL: publicApiUrl,
      contactEndpoint,
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
