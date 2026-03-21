<script setup lang="ts">
import type { PhotoWithUrls } from '~/types/photos'

definePageMeta({
  layout: 'viewer',
})

const route = useRoute()
const { siteName, siteDescription, baseURL, apiURL } = useRuntimeConfig().public
const apiBase = apiURL.replace(/\/$/, '')
const photoId = String(route.params.id || '').trim()

if (!photoId) {
  throw createError({ statusCode: 404, statusMessage: 'Photo not found' })
}

const { data: photoData, error: photoError } = await useFetch<PhotoWithUrls>(
  `${apiBase}/api/photos/${encodeURIComponent(photoId)}`,
  { method: 'GET', key: `photo-${photoId}` }
)

if (photoError.value) {
  const err = photoError.value as {
    status?: number
    statusCode?: number
    response?: { status?: number }
  }
  const statusCode = Number(err.status || err.statusCode || err.response?.status || 500)
  throw createError({
    statusCode,
    statusMessage: statusCode === 404 ? 'Photo not found' : 'Failed to load photo',
  })
}

const photo = photoData.value
if (!photo?.id) {
  throw createError({ statusCode: 404, statusMessage: 'Photo not found' })
}

const canonicalUrl = `${baseURL.replace(/\/$/, '')}/photo/${photo.id}`
const pageDescription = photo.description || siteDescription

useSeoMeta({
  title: photo.title || 'Photo',
  description: pageDescription,
  ogTitle: `${siteName} | ${photo.title || 'Photo'}`,
  ogDescription: pageDescription,
  ogType: 'website',
  ogUrl: canonicalUrl,
  twitterCard: 'summary_large_image',
  twitterTitle: `${siteName} | ${photo.title || 'Photo'}`,
  twitterDescription: pageDescription,
})

useHead(() => ({
  link: [{ rel: 'canonical', href: canonicalUrl }],
}))
</script>

<template>
  <PhotoViewer
    :photo="photo"
    :show-controls="false"
    :overlay="false"
  />
</template>
