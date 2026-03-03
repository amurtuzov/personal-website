<template>
  <div class="photo-uploader flex flex-column gap-3">
    <div v-if="showAlbumSelector" class="flex flex-column gap-1">
      <label for="album">Album *</label>
      <AutoComplete
        v-model="selectedAlbum"
        input-id="album"
        option-label="title"
        :suggestions="albumSuggestions"
        placeholder="Search album..."
        :disabled="disabled || isUploading"
        @complete="onAlbumSearch"
      />
      <small v-if="selectedAlbum" class="text-color-secondary">
        Selected: {{ selectedAlbum.title }}
      </small>
    </div>

    <FileUpload
      ref="fileUploadRef"
      name="files[]"
      accept="image/*"
      :multiple="true"
      :custom-upload="true"
      :max-file-size="maxFileSize"
      :disabled="disabled || isUploading || (requireAlbum && !resolvedAlbumId)"
      @uploader="onUpload"
    >
      <template #empty>
        <p class="m-0 text-sm text-color-secondary">
          Drag and drop images here to upload.
        </p>
      </template>
    </FileUpload>

    <Message v-if="uploadError" severity="error" size="small" variant="simple">
      {{ uploadError }}
    </Message>
    <Message v-if="uploadSuccess" severity="success" size="small" variant="simple">
      {{ uploadSuccess }}
    </Message>
  </div>
</template>

<script lang="ts" src="./PhotoUploader.ts"></script>
