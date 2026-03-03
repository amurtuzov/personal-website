<script setup lang="ts">
const { siteName, siteDescription, baseURL } = useRuntimeConfig().public
const canonicalUrl = `${baseURL.replace(/\/$/, '')}/`

useSeoMeta({
  title: siteName,
  description: siteDescription,
  ogTitle: siteName,
  ogDescription: siteDescription,
  ogType: 'website',
  ogUrl: canonicalUrl,
  twitterCard: 'summary_large_image',
  twitterTitle: siteName,
  twitterDescription: siteDescription,
})

useHead({
  link: [
    { rel: 'canonical', href: canonicalUrl },
  ],
  meta: [
    { name: 'theme-color', content: '#f2e8dc' },
    { name: 'robots', content: 'index, follow' },
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

body {
  margin: 0;
  color: $ink-900;
  @include body-text(400);
  background: $paper-200;
}

* {
  box-sizing: border-box;
}

a {
  color: inherit;
}
</style>
