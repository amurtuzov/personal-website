<template>
  <div class="album-page mt-4 flex flex-column gap-3">
    <div class="flex align-items-center justify-content-between gap-2 flex-column md:flex-row">
      <div class="flex flex-column gap-3 w-full">
        <h2 class="m-0">
          {{ album?.title || 'Album' }}
        </h2>
        <div v-if="album" class="flex align-items-center gap-2 text-sm text-color-secondary">
          <span>{{ album.isPublic ? 'Public' : 'Private' }}</span>
          <span>•</span>
          <span>Slug: {{ album.slug }}</span>
        </div>
      </div>
      <Button
        label="Back"
        icon="pi pi-arrow-left"
        outlined
        severity="secondary"
        class="cursor-pointer w-full md:w-auto"
        @click="goBack"
      />
    </div>

    <Card>
      <template #title>
        <div class="mb-2">
          Album details
        </div>
      </template>
      <template #content>
        <div v-if="isLoadingAlbum" class="text-color-secondary mb-2">
          Loading...
        </div>
        <template v-else-if="albumError">
          <Message severity="error" size="small" variant="simple">
            {{ Array.isArray(albumError.data.message) ? albumError.data.message.join(', ') : albumError.data.message }}
          </Message>
        </template>

        <template v-else>
          <Form
            v-slot="$form"
            :resolver="formResolver"
            :initialValues="form"
            class="flex flex-column gap-4"
            @submit="onSave"
          >
            <div class="flex flex-column gap-2">
              <label for="title">Title *</label>
              <InputText
                id="title"
                v-model="form.title"
                name="title"
                placeholder="My album"
                :disabled="busy"
              />
              <template v-if="$form.title?.invalid">
                <Message
                  v-for="(error, index) of $form.title.errors"
                  :key="index"
                  severity="error"
                  size="small"
                  variant="simple"
                >
                  {{ error.message }}
                </Message>
              </template>
            </div>

            <div class="flex flex-column gap-2">
              <label for="slug">Slug *</label>
              <InputText
                id="slug"
                v-model="form.slug"
                name="slug"
                placeholder="my-album"
                :disabled="busy"
              />
              <small class="text-color-secondary">3-64 chars, lowercase, dashes only</small>
              <template v-if="$form.slug?.invalid">
                <Message
                  v-for="(error, index) of $form.slug.errors"
                  :key="index"
                  severity="error"
                  size="small"
                  variant="simple"
                >
                  {{ error.message }}
                </Message>
              </template>
            </div>

            <div class="flex flex-column gap-2">
              <label for="description">Description</label>
              <Textarea
                id="description"
                v-model="form.description"
                name="description"
                auto-resize
                rows="5"
                :disabled="busy"
              />
              <template v-if="$form.description?.invalid">
                <Message
                  v-for="(error, index) of $form.description.errors"
                  :key="index"
                  severity="error"
                  size="small"
                  variant="simple"
                >
                  {{ error.message }}
                </Message>
              </template>
            </div>

            <div class="flex align-items-center gap-2">
              <Checkbox
                v-model="form.isPublic"
                input-id="isPublic"
                binary
                :disabled="busy"
              />
              <label for="isPublic" class="m-0">Public</label>
              <template v-if="$form.isPublic?.invalid">
                <Message
                  v-for="(error, index) of $form.isPublic.errors"
                  :key="index"
                  severity="error"
                  size="small"
                  variant="simple"
                >
                  {{ error.message }}
                </Message>
              </template>
            </div>

            <div class="flex flex-column gap-1">
              <Message v-if="saveSuccess" severity="success" size="small" variant="simple">
                Saved.
              </Message>
              <template v-if="saveError">
                <template v-if="Array.isArray(saveError.data.message)">
                  <Message
                    v-for="(errorMessage, index) of saveError.data.message"
                    :key="index"
                    severity="error"
                    size="small"
                    variant="simple"
                  >
                    {{ errorMessage }}
                  </Message>
                </template>
                <template v-else>
                  <Message severity="error" size="small" variant="simple">
                    {{ saveError.data.message }}
                  </Message>
                </template>
              </template>
            </div>

            <div class="flex justify-content-between gap-2 w-full flex-column md:flex-row">
              <Button
                label="Delete album"
                severity="danger"
                outlined
                type="button"
                class="cursor-pointer w-full md:w-auto"
                :disabled="busy"
                @click="onDeleteAlbum"
              />
              <Button
                label="Save changes"
                type="submit"
                class="cursor-pointer w-full md:w-auto"
                :disabled="busy || !$form.valid"
              />
            </div>
          </Form>
        </template>
      </template>
    </Card>

    <Card>
      <template #title>
        Photos
        <span v-if="album" class="text-sm text-color-secondary ml-2">
          ({{ album.photos?.length || 0 }})
        </span>
      </template>
      <template #content>
        <PhotoUploader
          :album-id="albumId"
          require-album
          :disabled="busy || isLoadingAlbum"
          @uploaded="onPhotosUploaded"
        />

        <div class="border-top-1 surface-border my-3" />

        <template v-if="album?.photos?.length">
          <div class="flex flex-column gap-2">
            <div
              v-for="photo in album.photos"
              :key="photo.id"
              class="flex flex-column md:flex-row align-items-start justify-content-between gap-2 border-1 surface-border border-round p-2"
            >
              <router-link
                :to="`/photo/${photo.id}`"
                class="flex-shrink-0 w-full md:w-auto"
                style="line-height: 0;"
                title="Edit photo"
              >
                <img
                  v-if="photo.thumbUrl || photo.webUrl"
                  :src="photo.thumbUrl ?? photo.webUrl ?? undefined"
                  :alt="photo.title || 'Photo'"
                  class="album-page__photo border-round albums-page__photo"
                >
                <div
                  v-else
                  class="album-page__photo border-round surface-100 flex align-items-center justify-content-center text-xs text-color-secondary"
                >
                  Processing...
                </div>
              </router-link>

              <div class="flex flex-column gap-3 flex-1" style="overflow-wrap: anywhere;">
                <div class="flex flex-column gap-2">
                  <span class="font-medium">{{ photo.title || 'Untitled' }}</span>
                  <span class="text-xs text-color-secondary">{{ photo.description || 'No description yet' }}</span>
                  <span class="text-xs text-color-secondary font-bold">{{ photo.isPublic ? 'Public' : 'Private' }}</span>
                </div>

                <div class="text-xs text-color-secondary flex flex-wrap gap-2">
                  <span v-if="photo.locationName">Location: {{ photo.locationName }}</span>
                  <span v-if="photo.takenAt">Taken: {{ formatDateTime(photo.takenAt) }}</span>
                  <span v-if="photo.width && photo.height">Size: {{ photo.width }}×{{ photo.height }}</span>
                  <span>Created: {{ formatDateTime(photo.createdAt) }}</span>
                </div>
              </div>

              <div class="flex flex-column gap-3 flex-shrink-0 w-full md:w-3 xl:w-2">
                <Button
                  v-if="album?.coverPhotoId === photo.id"
                  label="Cover"
                  icon="pi pi-star-fill"
                  severity="success"
                  size="small"
                  type="button"
                  class="cursor-pointer w-full"
                  disabled
                />
                <Button
                  v-else
                  label="Make cover"
                  icon="pi pi-star"
                  outlined
                  size="small"
                  type="button"
                  class="cursor-pointer w-full"
                  :disabled="busy"
                  @click="onSetCoverPhoto(photo.id)"
                />
                <Button
                  v-if="album?.coverPhotoId === photo.id"
                  label="Remove cover"
                  icon="pi pi-times"
                  outlined
                  size="small"
                  type="button"
                  class="cursor-pointer w-full"
                  :disabled="busy"
                  @click="onClearCoverPhoto"
                />
                <Button
                  label="Edit"
                  outlined
                  size="small"
                  type="button"
                  class="cursor-pointer w-full"
                  :disabled="busy"
                  @click="goToPhoto(photo.id)"
                />
                <Button
                  label="Delete"
                  severity="danger"
                  outlined
                  size="small"
                  type="button"
                  class="cursor-pointer w-full"
                  :disabled="busy"
                  @click="onDeletePhoto(photo.id)"
                />
              </div>
            </div>
          </div>
        </template>
        <div v-else class="text-sm text-color-secondary">
          No photos in this album yet.
        </div>

        <template v-if="deletePhotoError">
          <div class="mt-3">
            <Message severity="error" size="small" variant="simple">
              {{ Array.isArray(deletePhotoError.data.message) ? deletePhotoError.data.message.join(', ') : deletePhotoError.data.message }}
            </Message>
          </div>
        </template>
      </template>
    </Card>
  </div>
</template>

<script lang="ts" src="./AlbumPage.ts"></script>

<style lang="scss" src="./AlbumPage.scss"></style>
