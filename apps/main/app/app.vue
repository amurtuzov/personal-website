<script setup lang="ts">
const { siteName, siteDescription, baseURL } = useRuntimeConfig().public
const siteUrl = baseURL.replace(/\/$/, '')
const canonicalUrl = `${siteUrl}/`
const ogImageUrl = `${siteUrl}/icon.svg`
const cvUrl = `${siteUrl}/docs/Anar-Murtuzov-CV-v4-airy.pdf`

const personSchema = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  name: 'Anar Murtuzov',
  url: canonicalUrl,
  email: 'an.murtuzov@gmail.com',
  jobTitle: 'Software Developer',
  description: siteDescription,
  image: ogImageUrl,
  sameAs: [
    'https://linkedin.com/in/amurtuzov',
    'https://github.com/amurtuzov',
    'https://t.me/amurtuzov',
    'https://www.upwork.com/freelancers/~017dc24d1bda0aba9a',
  ],
  knowsLanguage: ['English', 'Russian'],
  knowsAbout: [
    'Frontend development',
    'Full-stack web development',
    'Vue.js',
    'Nuxt.js',
    'TypeScript',
    'React',
    'Node.js',
    'Docker',
    'CI/CD',
    'AI coding agents',
  ],
}

const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: siteName,
  url: canonicalUrl,
  description: siteDescription,
  inLanguage: 'en',
  publisher: {
    '@type': 'Person',
    name: 'Anar Murtuzov',
    url: canonicalUrl,
  },
}

useSeoMeta({
  title: siteName,
  description: siteDescription,
  applicationName: siteName,
  author: 'Anar Murtuzov',
  keywords: 'Anar Murtuzov, software developer, frontend engineer, full stack developer, Vue.js, Nuxt.js, TypeScript, React, Node.js, Docker, CI/CD, AI coding agents',
  ogTitle: siteName,
  ogDescription: siteDescription,
  ogType: 'website',
  ogUrl: canonicalUrl,
  ogSiteName: siteName,
  ogImage: ogImageUrl,
  ogImageAlt: 'Anar Murtuzov Portfolio',
  twitterCard: 'summary_large_image',
  twitterTitle: siteName,
  twitterDescription: siteDescription,
  twitterImage: ogImageUrl,
})

useHead({
  link: [
    {
      rel: 'canonical',
      href: canonicalUrl,
    },
    {
      rel: 'me',
      href: 'https://linkedin.com/in/amurtuzov',
    },
    {
      rel: 'me',
      href: 'https://github.com/amurtuzov',
    },
    {
      rel: 'alternate',
      type: 'application/pdf',
      href: cvUrl,
      title: 'Anar Murtuzov CV',
    },
  ],
  meta: [
    {
      'http-equiv': 'content-language',
      'content': 'en',
    },
    {
      'http-equiv': 'content-type',
      'content': 'text/html; charset=UTF-8',
    },
    {
      name: 'format-detection',
      content: 'telephone=no',
    },
    {
      name: 'theme-color',
      content: '#050505',
    },
    {
      name: 'robots',
      content: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
    },
    {
      name: 'googlebot',
      content: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
    },
  ],
  script: [
    {
      key: 'portfolio-schema',
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [personSchema, websiteSchema],
      }),
    },
  ],
})
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<style lang="scss">
html,
body,
#__nuxt {
  min-height: 100%;
}

html {
  scroll-behavior: smooth;
}

body {
  margin: 0;
  background: radial-gradient(circle at 12% 10%, #151515 0%, #080808 36%, #050505 100%);
  color: $textBody;
  @include body(400);
}

@media only screen and (min-width: 1024px) {
  html,
  body,
  #__nuxt {
    height: 100%;
    overflow: hidden;
  }
}

@media only screen and (max-width: 1023px) {
  html,
  body,
  #__nuxt {
    overflow-x: hidden;
  }
}

* {
  box-sizing: border-box;
}

a {
  color: inherit;
}

.section-anchor {
  scroll-margin-top: 28px;
}
</style>
