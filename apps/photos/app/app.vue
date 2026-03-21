<script setup lang="ts">

const { siteName, siteDescription, baseURL } = useRuntimeConfig().public

useSeoMeta({
  titleTemplate: (chunk) => chunk ? `${chunk} | ${siteName}` : siteName,
  description: siteDescription,
  ogTitle: siteName,
  ogDescription: siteDescription,
  ogType: 'website',
  ogUrl: `${baseURL.replace(/\/$/, '')}/`,
  twitterCard: 'summary_large_image',
  twitterTitle: siteName,
  twitterDescription: siteDescription,
})

useHead({
  meta: [
    { name: 'theme-color', content: '#e9dccd' },
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
  background: linear-gradient(165deg, #efe3d5 0%, #e4d8c8 100%);
}

* {
  box-sizing: border-box;
}

a {
  color: inherit;
}
</style>
