<template>
  <div class="photos-page mt-4 flex flex-column gap-3">
    <Card>
      <template #title>
        Upload photos
      </template>
      <template #content>
        <PhotoUploader require-album :disabled="busy" @uploaded="onPhotosUploaded" />
      </template>
    </Card>

    <div class="flex align-items-center justify-content-between mb-3 gap-3 flex-column md:flex-row">
      <div class="flex align-items-center gap-2 w-full md:w-6">
        <span class="text-sm text-color-secondary whitespace-nowrap">
          Total: {{ totalPhotos }}
        </span>
        <InputText
          placeholder="Search title or description"
          class="w-full"
          @input="debouncedSearch"
        />
      </div>
    </div>

    <div class="photos-page__wrapper">
      <Card v-for="photo in photos" :key="photo.id" :pt="{ footer: { class: 'mt-auto' }, body: { class: 'flex-1' } }">
        <template #header>
          <img
            v-if="photo.thumbUrl || photo.webUrl"
            :alt="photo.title || 'Photo'"
            :title="photo.title || undefined"
            :src="photo.thumbUrl ?? photo.webUrl ?? undefined"
            class="photos-page__photo-cover"
          >
          <div v-else class="photos-page__photo-cover-mock" />
        </template>
        <template #title>
          <div class="flex align-items-center justify-content-between gap-2">
            <span style="overflow-wrap: anywhere;">{{ photo.title || 'Untitled' }}</span>
            <span class="text-xs text-color-secondary">{{ photo.isPublic ? 'Public' : 'Private' }}</span>
          </div>
        </template>
        <template #content>
          <p class="m-0 text-sm text-color-secondary">
            {{ photo.description || 'No description' }}
          </p>
          <p v-if="photo.locationName" class="m-0 mt-2 text-xs text-color-secondary">
            Location: {{ photo.locationName }}
          </p>
          <p v-if="photo.album?.title" class="m-0 mt-2 text-xs text-color-secondary">
            Album: {{ photo.album.title }}
          </p>
        </template>
        <template #footer>
          <div class="flex justify-content-between gap-2">
            <Button
              label="Edit"
              outlined
              size="small"
              :disabled="busy"
              class="cursor-pointer"
              @click="goToPhoto(photo.id)"
            />
            <Button
              label="Delete"
              severity="danger"
              size="small"
              :disabled="busy"
              class="cursor-pointer"
              @click="onDelete(photo.id)"
            />
          </div>
        </template>
      </Card>
    </div>
    <div
      ref="listLoader"
      class="photos-page__loader" :class="[{ active: isLoadingPhotos }]"
    />
  </div>
</template>

<script lang="ts" src="./PhotosPage.ts"></script>

<style lang="scss" src="./PhotosPage.scss"></style>
