<script setup lang="ts">
import type { AlbumWithPhotos, PhotoWithUrls } from '~/types/photos'

const route = useRoute()
const { siteName, siteDescription, baseURL, apiURL } = useRuntimeConfig().public
const apiBase = apiURL.replace(/\/$/, '')
const slug = String(route.params.slug || '').trim()

if (!slug) {
  throw createError({ statusCode: 404, statusMessage: 'Album not found' })
}

const { data: albumData, error: albumError } = await useFetch<AlbumWithPhotos>(
  `${apiBase}/api/albums/slug/${encodeURIComponent(slug)}`,
  { method: 'GET', key: `album-${slug}` }
)

if (albumError.value) {
  const err = albumError.value as {
    status?: number
    statusCode?: number
    response?: { status?: number }
  }
  const statusCode = Number(err.status || err.statusCode || err.response?.status || 500)
  throw createError({
    statusCode,
    statusMessage: statusCode === 404 ? 'Album not found' : 'Failed to load album',
  })
}

const album = albumData.value
if (!album?.id) {
  throw createError({ statusCode: 404, statusMessage: 'Album not found' })
}

const canonicalUrl = `${baseURL.replace(/\/$/, '')}/album/${slug}`
const pageDescription = album.description || siteDescription

useSeoMeta({
  title: album.title,
  description: pageDescription,
  ogTitle: `${siteName} | ${album.title}`,
  ogDescription: pageDescription,
  ogType: 'website',
  ogUrl: canonicalUrl,
  twitterCard: 'summary_large_image',
  twitterTitle: `${siteName} | ${album.title}`,
  twitterDescription: pageDescription,
})

useHead(() => ({
  link: [{ rel: 'canonical', href: canonicalUrl }],
}))

const sentinel = ref<HTMLElement | null>(null)
const grid = ref<HTMLElement | null>(null)

const { items, loadMore, pending, loadingMore, finished, total } = await useInfiniteList<PhotoWithUrls>(
  `${apiBase}/api/albums/${album.id}/photos`,
  { pageSize: 10 }
)

useInfiniteIntersection(sentinel, () => {
  void loadMore()
})

useMasonryFallbackGrid(grid, {
  waitForImages: false,
  observeSubtree: false,
})

const {
  isOpen: isViewerOpen,
  currentIndex: currentViewerIndex,
  currentPhoto: currentViewerPhoto,
  canGoPrev,
  canGoNext,
  isLoadingNext,
  open: openViewer,
  close: closeViewer,
  goPrev,
  goNext,
} = useDecorativePhotoViewer<PhotoWithUrls>({
  items,
  loadMore,
  loadingMore,
  finished,
  returnUrl: `/album/${slug}`,
})

const getPhotoSrc = (photo: PhotoWithUrls) => photo.webUrl || photo.thumbUrl || ''
const getPhotoAlt = (photo: PhotoWithUrls) => photo.title || `${album.title} photo`
const getPhotoRatio = (photo: PhotoWithUrls) => {
  if (photo.width && photo.height && photo.width > 0 && photo.height > 0) {
    return `${photo.width} / ${photo.height}`
  }
  return '4 / 3'
}

const totalPhotos = computed(() => {
  if (typeof total.value === 'number') {
    return total.value
  }
  return items.value.length
})

const photosLabel = computed(() => totalPhotos.value === 1 ? 'photo' : 'photos')
</script>

<template>
  <section class="album-page">
    <header class="album-header">
      <h1>{{ album.title }}</h1>
      <p v-if="album.description">{{ album.description }}</p>
      <p class="album-header__meta">{{ totalPhotos }} {{ photosLabel }}</p>
    </header>

    <section ref="grid" class="photo-grid" aria-label="Album photos feed">
      <article
        v-for="(photo, index) in items"
        :key="photo.id"
        class="photo-tile"
        :style="{ aspectRatio: getPhotoRatio(photo) }"
      >
        <a
          class="photo-tile__link"
          :href="`/photo/${photo.id}`"
          :aria-label="`Open ${getPhotoAlt(photo)}`"
          @click.left.prevent="openViewer(index)"
          @contextmenu.prevent
        >
          <NuxtImg
            v-if="getPhotoSrc(photo)"
            class="photo-tile__image"
            :src="getPhotoSrc(photo)"
            :alt="getPhotoAlt(photo)"
            :width="photo.width || undefined"
            :height="photo.height || undefined"
            loading="lazy"
            decoding="async"
            sizes="100vw two:50vw three:33vw four:25vw"
            densities="x1 x2"
            custom
            v-slot="{ src, isLoaded, imgAttrs }"
          >
            <img
              :class="{ 'photo-tile__image--loaded': isLoaded }"
              v-bind="imgAttrs"
              :src="src"
              draggable="false"
              @dragstart.prevent
              @contextmenu.prevent
            >
            <div
              v-if="!isLoaded"
              class="photo-skeleton"
              aria-hidden="true"
            />
          </NuxtImg>

          <div v-else class="photo-fallback">
            <span>Photo unavailable</span>
          </div>
        </a>
      </article>
    </section>

    <p v-if="pending && !items.length" class="state-line">
      Loading photos...
    </p>

    <p v-else-if="!items.length && finished" class="state-line">
      No photos in this album yet.
    </p>

    <div ref="sentinel" class="sentinel" aria-hidden="true" />

    <p v-if="loadingMore" class="state-line">
      Loading more photos...
    </p>

    <p v-if="items.length && finished" class="state-line">
      End of album list.
    </p>

    <PhotoViewer
      v-if="isViewerOpen && currentViewerPhoto"
      :photo="currentViewerPhoto"
      :current-shot="currentViewerIndex + 1"
      :total-shots="totalPhotos"
      :show-controls="true"
      back-label="Back to album"
      :can-go-prev="canGoPrev"
      :can-go-next="canGoNext"
      :is-loading-next="isLoadingNext"
      :overlay="true"
      @close="closeViewer()"
      @prev="goPrev()"
      @next="goNext()"
    />
  </section>
</template>

<style lang="scss" scoped>
.album-page {
  padding: 30px 44px 56px;
}

.album-header {
  margin-bottom: 24px;

  h1 {
    margin: 0;
    font-family: 'Lora', serif;
    font-size: 42px;
    font-weight: 400;
    letter-spacing: -0.02em;
    color: #161b21;
  }

  p {
    margin: 8px 0 0;
    color: #67727d;
    max-width: 760px;
    line-height: 1.5;
    font-size: 15px;
    @include body-text(400);
  }

  &__meta {
    margin-top: 10px;
    font-size: 13px;
    color: #67727d;
    @include body-text(500);
  }
}

.photo-grid {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  grid-auto-flow: dense;

  > * {
    align-self: start;
  }
}

@supports (display: grid-lanes) {
  .photo-grid {
    display: grid-lanes;
  }
}

.photo-tile {
  position: relative;
  overflow: hidden;
  background: linear-gradient(
    90deg,
    #dde3ea 20%,
    #cfd8e2 42%,
    #dde3ea 64%
  );

  &__image {
    width: 100%;
    height: 100%;
    display: block !important;
    object-fit: cover;
    opacity: 0;
    transition: opacity 0.5s ease, transform 0.24s ease;
    user-select: none;
    -webkit-user-select: none;
    -webkit-user-drag: none;
    -webkit-touch-callout: none;
  }

  &__image--loaded {
    opacity: 1;
  }

  &__link {
    display: block;
    width: 100%;
    height: 100%;
    color: inherit;
    text-decoration: none;
    cursor: pointer;

    &:hover .photo-tile__image,
    &:focus-visible .photo-tile__image {
      transform: scale(1.02);
      opacity: 0.94;
    }

    &:focus-visible {
      outline: 2px solid #161b21;
      outline-offset: -2px;
    }
  }
}

.photo-skeleton {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    #dde3ea 20%,
    #cfd8e2 42%,
    #dde3ea 64%
  );
  background-size: 300% 100%;
  animation: photo-shimmer 1.2s linear infinite;
}

.photo-fallback {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: #5f6b77;
  font-size: 13px;
  border: 1px solid #dbe1e7;
  background: linear-gradient(
    90deg,
    #dde3ea 20%,
    #cfd8e2 42%,
    #dde3ea 64%
  );
}

@keyframes photo-shimmer {
  to {
    background-position: -200% 0;
  }
}

.state-line {
  margin: 24px 0 0;
  color: #66707a;
  font-size: 13px;
  @include body-text(400);
}

.sentinel {
  width: 100%;
  height: 1px;
}

@media (max-width: 768px) {
  .photo-grid {
    grid-template-columns: 1fr;
  }
}

@media (min-width: 1441px) {
  .photo-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (min-width: 1922px) {
  .photo-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

@media (max-width: 1024px) {
  .album-page {
    padding: 16px 12px 24px;
  }

  .album-header {
    margin-bottom: 16px;

    h1 {
      font-size: 34px;
    }

    p {
      font-size: 14px;
    }
  }
}
</style>
