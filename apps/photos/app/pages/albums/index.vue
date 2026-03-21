<script setup lang="ts">
import type { AlbumWithPhotos } from '~/types/photos'

const { siteName, siteDescription, baseURL, apiURL } = useRuntimeConfig().public
const apiBase = apiURL.replace(/\/$/, '')
const canonicalUrl = `${baseURL.replace(/\/$/, '')}/albums`

useSeoMeta({
  title: 'Albums',
  description: siteDescription,
  ogTitle: `${siteName} | Albums`,
  ogDescription: siteDescription,
  ogType: 'website',
  ogUrl: canonicalUrl,
  twitterCard: 'summary_large_image',
  twitterTitle: `${siteName} | Albums`,
  twitterDescription: siteDescription,
})

useHead(() => ({
  link: [{ rel: 'canonical', href: canonicalUrl }],
}))

const sentinel = ref<HTMLElement | null>(null)

const { items, loadMore, pending, loadingMore, finished } = await useInfiniteList<AlbumWithPhotos>(
  `${apiBase}/api/albums`,
  { pageSize: 10 }
)

useInfiniteIntersection(sentinel, () => {
  void loadMore()
})

const getAlbumCoverPhoto = (album: AlbumWithPhotos) => album.coverPhoto || album.photos?.[0] || null

const getAlbumCover = (album: AlbumWithPhotos) => {
  const cover = getAlbumCoverPhoto(album)
  return cover?.webUrl || cover?.thumbUrl || ''
}

const getDimension = (value: number | null | undefined, fallback: number) =>
  typeof value === 'number' && value > 0 ? value : fallback

const getAlbumCoverWidth = (album: AlbumWithPhotos) =>
  getDimension(getAlbumCoverPhoto(album)?.width, 800)

const getAlbumCoverHeight = (album: AlbumWithPhotos) =>
  getDimension(getAlbumCoverPhoto(album)?.height, 800)

const getAlbumAlt = (album: AlbumWithPhotos) => album.title || 'Album cover'

const getPhotoCount = (album: AlbumWithPhotos) => {
  if (typeof album._count?.photos === 'number') {
    return album._count.photos
  }
  return album.photos?.length || 0
}

const getPhotosLabel = (count: number) => (count === 1 ? 'photo' : 'photos')
</script>

<template>
  <section class="albums-page">
    <section class="album-grid" aria-label="Albums feed">
      <NuxtLink
        v-for="album in items"
        :key="album.id"
        class="album-card"
        :to="`/album/${album.slug}`"
      >
        <div class="album-card__media">
          <NuxtImg
            v-if="getAlbumCover(album)"
            class="album-card__image"
            :src="getAlbumCover(album)"
            :alt="getAlbumAlt(album)"
            loading="lazy"
            decoding="async"
            sizes="100vw two:50vw three:33vw four:25vw"
            densities="x1 x2"
            :width="getAlbumCoverWidth(album)"
            :height="getAlbumCoverHeight(album)"
            custom
            v-slot="{ src, isLoaded, imgAttrs }"
          >
            <img
              :class="{ 'album-card__image--loaded': isLoaded }"
              v-bind="imgAttrs"
              :src="src"
            >
            <div
              v-if="!isLoaded"
              class="album-skeleton"
              aria-hidden="true"
            />
          </NuxtImg>

          <div v-else class="album-fallback">
            <span>Cover unavailable</span>
          </div>
        </div>

        <p class="album-card__title">{{ album.title }}</p>
        <span class="album-card__count">{{ getPhotoCount(album) }} {{ getPhotosLabel(getPhotoCount(album)) }}</span>
      </NuxtLink>
    </section>

    <p v-if="pending && !items.length" class="state-line">
      Loading albums...
    </p>

    <p v-else-if="!items.length && finished" class="state-line">
      No albums yet.
    </p>

    <div ref="sentinel" class="sentinel" aria-hidden="true" />

    <p v-if="loadingMore" class="state-line">
      Loading more albums...
    </p>

    <p v-if="items.length && finished" class="state-line">
      End of album list.
    </p>
  </section>
</template>

<style lang="scss" scoped>
.albums-page {
  padding: 30px 44px 56px;
}

.album-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.album-card {
  display: block;
  text-decoration: none;

  &__media {
    position: relative;
    aspect-ratio: 1 / 1;
    background: linear-gradient(
      90deg,
      #dde3ea 20%,
      #cfd8e2 42%,
      #dde3ea 64%
    );
    overflow: hidden;
  }

  &__image {
    width: 100%;
    height: 100%;
    display: block !important;
    object-fit: cover;
    opacity: 0;
    transition: opacity 0.4s ease, transform 0.3s ease;
  }

  &__image--loaded {
    opacity: 1;
  }

  &__title {
    margin: 8px 0 0;
    color: #161b21;
    font-size: 14px;
    @include body-text(500);
  }

  &__count {
    margin-top: 2px;
    display: inline-block;
    color: #67727d;
    font-size: 12px;
    @include body-text(400);
  }

  &:hover &__image--loaded {
    transform: scale(1.02);
  }
}

.album-skeleton {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    #dde3ea 20%,
    #cfd8e2 42%,
    #dde3ea 64%
  );
  background-size: 300% 100%;
  animation: album-shimmer 1.2s linear infinite;
}

.album-fallback {
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

@keyframes album-shimmer {
  to {
    background-position: -200% 0;
  }
}

.state-line {
  margin: 24px 0 0;
  color: #67727d;
  font-size: 13px;
  @include body-text(400);
}

.sentinel {
  width: 100%;
  height: 1px;
}

@media (max-width: 768px) {
  .album-grid {
    grid-template-columns: 1fr;
  }
}

@media (min-width: 1441px) {
  .album-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (min-width: 1922px) {
  .album-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

@media (max-width: 1024px) {
  .albums-page {
    padding: 16px 12px 24px;
  }
}
</style>
