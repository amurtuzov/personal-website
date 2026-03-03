<template>
  <div class="albums-page mt-4">
    <div class="flex align-items-center justify-content-between mb-3 gap-3 flex-column md:flex-row">
      <div class="flex align-items-center gap-2 w-full md:w-6">
        <span class="text-sm text-color-secondary whitespace-nowrap">
          Total: {{ totalAlbums }}
        </span>
        <InputText
          placeholder="Search title or description"
          class="w-full"
          @input="debouncedSearch"
        />
      </div>
      <Button
        label="Create album"
        icon="pi pi-plus"
        class="cursor-pointer ml-auto"
        @click="openDialog"
      />
    </div>

    <div class="albums-page__wrapper">
      <Card v-for="album in albums" :key="album.id" :pt="{ footer: { class: 'mt-auto' }, body: { class: 'flex-1' } }">
        <template #header>
          <img
            v-if="album.coverPhoto?.webUrl"
            :alt="album.title"
            :title="album.title"
            :src="album.coverPhoto?.webUrl ?? undefined"
            class="albums-page__album-cover"
          >
          <div v-else class="albums-page__album-cover-mock" />
        </template>
        <template #title>
          <div class="flex align-items-center justify-content-between gap-2">
            <span style="overflow-wrap: anywhere;">{{ album.title }}</span>
            <span class="text-xs text-color-secondary">{{ album.isPublic ? 'Public' : 'Private' }}</span>
          </div>
        </template>
        <template #content>
          <p class="m-0 text-sm text-color-secondary">
            {{ album.description || 'No description' }}
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
              @click="goToAlbum(album.id)"
            />
            <Button
              label="Delete"
              severity="danger"
              size="small"
              :disabled="busy"
              class="cursor-pointer"
              @click="onDelete(album.id)"
            />
          </div>
        </template>
      </Card>
    </div>
    <div
      ref="listLoader"
      class="albums-page__loader" :class="[{ active: isLoadingAlbums }]"
    />
    <Dialog
      v-model:visible="isDialogOpen"
      modal
      header="Create album"
      :style="{ width: '90vw', maxWidth: '500px' }"
    >
      <Form
        v-slot="$form"
        :resolver="formResolver"
        :initialValues="form"
        class="flex flex-column gap-3"
        @submit="onCreate"
      >
        <div class="flex flex-column gap-1">
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

        <div class="flex flex-column gap-1">
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

        <div class="flex flex-column gap-1">
          <label for="description">Description</label>
          <Textarea
            id="description"
            v-model="form.description"
            name="description"
            auto-resize
            rows="3"
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
          <template v-if="createError">
            <template v-if="Array.isArray(createError.data.message)">
              <Message
                v-for="(errorMessage, index) of createError.data.message"
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
                {{ createError.data.message }}
              </Message>
            </template>
          </template>
        </div>

        <div class="flex justify-content-end gap-2 w-full">
          <Button
            label="Cancel"
            severity="secondary"
            :disabled="busy"
            type="button"
            @click="() => { isDialogOpen = false; resetForm() }"
          />
          <Button
            label="Create"
            type="submit"
            :disabled="busy"
          />
        </div>
      </Form>
    </Dialog>
  </div>
</template>

<script lang="ts" src="./AlbumsPage.ts"></script>

<style lang="scss" src="./AlbumsPage.scss"></style>
