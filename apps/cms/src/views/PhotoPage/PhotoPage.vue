<template>
  <div class="photo-page mt-4 flex flex-column gap-3">
    <div class="flex align-items-center justify-content-between gap-2 flex-column md:flex-row">
      <div class="flex flex-column gap-3 w-full">
        <h2 class="m-0">
          {{ photo?.title || 'Photo' }}
        </h2>
        <div v-if="photo" class="flex align-items-center gap-2 text-sm text-color-secondary">
          <span>{{ photo.isPublic ? 'Public' : 'Private' }}</span>
          <template v-if="photo.album?.title">
            <span>•</span>
            <span>Album: {{ photo.album.title }}</span>
          </template>
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
          Preview
        </div>
      </template>
      <template #content>
        <div v-if="isLoadingPhoto" class="text-color-secondary mb-2">
          Loading...
        </div>
        <template v-else-if="photoError">
          <Message severity="error" size="small" variant="simple">
            {{ Array.isArray(photoError.data.message) ? photoError.data.message.join(', ') : photoError.data.message }}
          </Message>
        </template>

        <template v-else>
          <img
            v-if="previewUrl"
            :src="previewUrl"
            :alt="photo?.title || 'Photo'"
            class="photo-page__image border-round"
          >
          <div
            v-else
            class="photo-page__image-mock border-round surface-100 flex align-items-center justify-content-center text-xs text-color-secondary"
          >
            Processing...
          </div>
        </template>
      </template>
    </Card>

    <Card>
      <template #title>
        <div class="mb-2">
          Photo details
        </div>
      </template>
      <template #content>
        <div v-if="isLoadingPhoto" class="text-color-secondary mb-2">
          Loading...
        </div>
        <template v-else-if="photoError">
          <Message severity="error" size="small" variant="simple">
            {{ Array.isArray(photoError.data.message) ? photoError.data.message.join(', ') : photoError.data.message }}
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
              <label for="title">Title</label>
              <InputText
                id="title"
                v-model="form.title"
                name="title"
                placeholder="Untitled"
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

            <div class="flex flex-column gap-2">
              <label for="locationName">Location</label>
              <InputText
                id="locationName"
                v-model="form.locationName"
                name="locationName"
                placeholder="e.g. Tashkent"
                :disabled="busy"
              />
              <template v-if="$form.locationName?.invalid">
                <Message
                  v-for="(error, index) of $form.locationName.errors"
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
                label="Delete photo"
                severity="danger"
                outlined
                type="button"
                class="cursor-pointer w-full md:w-auto"
                :disabled="busy"
                @click="onDeletePhoto"
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
  </div>
</template>

<script lang="ts" src="./PhotoPage.ts"></script>

<style lang="scss" src="./PhotoPage.scss"></style>
