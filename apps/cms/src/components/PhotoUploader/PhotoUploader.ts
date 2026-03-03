import type { Album, Photo } from '@packages/database'
import type { AlbumsQuery, Paginated } from '@/api/albums'
import type { CreateBulkPhotosBody, PresignFile } from '@/api/photos'
import type { DefaultError } from '@/types/httpError'
import AutoComplete from 'primevue/autocomplete'
import FileUpload from 'primevue/fileupload'
import Message from 'primevue/message'
import { computed, defineComponent, ref } from 'vue'
import { getAlbums } from '@/api/albums'
import { createBulkPhotos, signBulkUpload } from '@/api/photos'
import { useApiCall } from '@/composables/useApiCall'

type PresignedUploadResponse = {
  id: string
  key: string
  url: string
  expiresIn: number
  filename: string
}

type BulkCreateResponse = {
  success: boolean
  count: number
  photos: Photo[]
}

export default defineComponent({
  name: 'PhotoUploader',
  components: {
    AutoComplete,
    FileUpload,
    Message,
  },
  props: {
    albumId: {
      type: String,
      required: false,
      default: undefined,
    },
    requireAlbum: {
      type: Boolean,
      required: false,
      default: false,
    },
    disabled: {
      type: Boolean,
      required: false,
      default: false,
    },
    maxFileSize: {
      type: Number,
      required: false,
      default: 50_000_000,
    },
  },
  emits: {
    uploaded: (_payload: BulkCreateResponse) => true,
  },
  setup(props, { emit }) {
    const fileUploadRef = ref<InstanceType<typeof FileUpload> | null>(null)
    const selectedAlbum = ref<Album | null>(null)
    const albumSuggestions = ref<Album[]>([])
    const isUploading = ref(false)
    const uploadError = ref<string | null>(null)
    const uploadSuccess = ref<string | null>(null)

    const propAlbumId = computed(() => props.albumId?.trim() || null)

    const resolvedAlbumId = computed(() => {
      return propAlbumId.value || selectedAlbum.value?.id || null
    })

    const showAlbumSelector = computed(() => {
      return props.requireAlbum && !propAlbumId.value
    })

    const {
      data: albumsData,
      executeApiCall: searchAlbums,
    } = useApiCall<Paginated<Album>, DefaultError, AlbumsQuery>(
      getAlbums,
      true,
    )

    const onAlbumSearch = async (event: { query: string }) => {
      const query = event.query?.trim() || ''
      try {
        await searchAlbums({ page: 1, pageSize: 20, search: query })
        albumSuggestions.value = albumsData.value?.items || []
      }
      catch (e) {
        console.error(e)
      }
    }

    const onUpload = async (event: { files: File[] | File }) => {
      uploadError.value = null
      uploadSuccess.value = null

      const targetAlbumId = resolvedAlbumId.value
      if (props.requireAlbum && !targetAlbumId) {
        uploadError.value = 'Select an album first.'
        return
      }

      const files = (Array.isArray(event.files) ? event.files : [event.files]).filter(Boolean) as File[]
      if (files.length === 0)
        return
      if (files.length > 100) {
        uploadError.value = 'Maximum 100 files per upload.'
        return
      }

      isUploading.value = true
      try {
        const presignFiles: PresignFile[] = files.map(file => ({
          filename: file.name,
          contentType: file.type || 'application/octet-stream',
        }))

        const presigned = await signBulkUpload(
          new AbortController(),
          presignFiles,
        ) as unknown as PresignedUploadResponse[] | { error: string }

        if (!Array.isArray(presigned)) {
          uploadError.value = presigned.error || 'Failed to sign uploads.'
          return
        }

        await Promise.all(presigned.map(async (item, index) => {
          const file = files[index]
          const res = await fetch(item.url, {
            method: 'PUT',
            headers: {
              'Content-Type': file.type || 'application/octet-stream',
            },
            body: file,
          })
          if (!res.ok) {
            throw new Error(`Failed to upload "${file.name}" (status ${res.status})`)
          }
        }))

        const createBody: CreateBulkPhotosBody = {
          albumId: targetAlbumId || undefined,
          photos: presigned.map(item => ({ s3Key: item.key })),
        }

        const created = await createBulkPhotos(
          new AbortController(),
          createBody,
        ) as unknown as BulkCreateResponse

        uploadSuccess.value = `Uploaded ${created.count || files.length} photo(s).`
        emit('uploaded', created)

        ;(fileUploadRef.value as unknown as { clear?: () => void } | null)?.clear?.()
      }
      catch (e) {
        console.error(e)
        uploadError.value = e instanceof Error ? e.message : 'Upload failed.'
      }
      finally {
        isUploading.value = false
      }
    }

    return {
      fileUploadRef,
      selectedAlbum,
      albumSuggestions,
      showAlbumSelector,
      resolvedAlbumId,
      isUploading,
      uploadError,
      uploadSuccess,
      onAlbumSearch,
      onUpload,
    }
  },
})
