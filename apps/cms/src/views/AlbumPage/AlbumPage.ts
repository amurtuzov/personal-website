import type { Photo } from '@packages/database'
import type { AlbumWithPhotos, UpdateAlbumBody } from '@/api/albums'
import type { DefaultError } from '@/types/httpError'
import { Form } from '@primevue/forms'
import { zodResolver } from '@primevue/forms/resolvers/zod'
import Button from 'primevue/button'
import Card from 'primevue/card'
import Checkbox from 'primevue/checkbox'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import Textarea from 'primevue/textarea'
import { useConfirm } from 'primevue/useconfirm'
import { computed, defineComponent, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { z } from 'zod'
import { deleteAlbum, getAlbumById, updateAlbum } from '@/api/albums'
import { deletePhoto } from '@/api/photos'
import PhotoUploader from '@/components/PhotoUploader/PhotoUploader.vue'
import { useApiCall } from '@/composables/useApiCall'

type AlbumFormState = {
  title: string
  slug: string
  description: string
  isPublic: boolean
}

type UpdateAlbumParams = UpdateAlbumBody & { id: string }

export default defineComponent({
  name: 'AlbumPage',
  components: {
    Form,
    Button,
    Card,
    Checkbox,
    InputText,
    Message,
    Textarea,
    PhotoUploader,
  },
  setup() {
    const route = useRoute()
    const router = useRouter()
    const albumId = computed(() => String(route.params.id || ''))
    const confirm = useConfirm()

    const form = reactive<AlbumFormState>({
      title: '',
      slug: '',
      description: '',
      isPublic: true,
    })

    const formResolver = ref(zodResolver(
      z.object({
        title: z.string().min(1, { message: 'Title is required' }).max(120, { message: 'Max 120 characters' }),
        slug: z.string()
          .min(3, { message: 'Min 3 characters' })
          .max(64, { message: 'Max 64 characters' })
          .regex(/^[a-z0-9-]+$/, { message: 'Use lowercase, numbers, dashes' }),
        description: z.string().max(500, { message: 'Max 500 characters' }).optional().or(z.literal('')),
        isPublic: z.boolean(),
      }),
    ))

    const {
      data: album,
      error: albumError,
      isLoading: isLoadingAlbum,
      executeApiCall: fetchAlbum,
    } = useApiCall<AlbumWithPhotos, DefaultError, string>(
      getAlbumById,
      true,
    )

    const {
      isLoading: isSaving,
      error: saveError,
      executeApiCall: updateAlbumAction,
    } = useApiCall<AlbumWithPhotos, DefaultError, UpdateAlbumParams>(
      updateAlbum,
      true,
    )

    const {
      isLoading: isDeleting,
      executeApiCall: deleteAlbumAction,
    } = useApiCall<AlbumWithPhotos, DefaultError, string>(
      deleteAlbum,
      true,
    )

    const {
      isLoading: isDeletingPhoto,
      error: deletePhotoError,
      executeApiCall: deletePhotoAction,
    } = useApiCall<Photo, DefaultError, string>(
      deletePhoto,
      true,
    )

    const saveSuccess = ref(false)

    const busy = computed(() => isLoadingAlbum.value || isSaving.value || isDeleting.value || isDeletingPhoto.value)

    const loadAlbum = async () => {
      if (!albumId.value) {
        return
      }

      try {
        await fetchAlbum(albumId.value)
      }
      catch (e) {
        console.error(e)
      }
    }

    watch(albumId, async () => await loadAlbum(), { immediate: true })

    watch(
      () => album.value,
      () => {
        if (!album.value)
          return
        form.title = album.value.title
        form.slug = album.value.slug
        form.description = album.value.description || ''
        form.isPublic = album.value.isPublic
      },
    )

    watch(form, () => {
      saveSuccess.value = false
    }, { deep: true })

    const goBack = () => {
      router.push('/albums')
    }

    const goToPhoto = (photoId: string) => {
      router.push(`/photo/${photoId}`)
    }

    const formatDateTime = (value?: string | Date | null) => {
      if (!value)
        return ''
      const date = typeof value === 'string' ? new Date(value) : value
      if (Number.isNaN(date.getTime()))
        return String(value)
      return date.toLocaleString()
    }

    const onSave = async () => {
      if (!albumId.value)
        return
      try {
        await updateAlbumAction({
          id: albumId.value,
          title: form.title,
          slug: form.slug,
          description: form.description,
          isPublic: form.isPublic,
        })
        if (!saveError.value) {
          saveSuccess.value = true
          await loadAlbum()
        }
      }
      catch (e) {
        console.error(e)
      }
    }

    const onSetCoverPhoto = async (photoId: string) => {
      if (!albumId.value)
        return

      try {
        await updateAlbumAction({ id: albumId.value, coverPhotoId: photoId })
        await loadAlbum()
      }
      catch (e) {
        console.error(e)
      }
    }

    const onClearCoverPhoto = async () => {
      if (!albumId.value)
        return

      try {
        await updateAlbumAction({ id: albumId.value, coverPhotoId: null })
        await loadAlbum()
      }
      catch (e) {
        console.error(e)
      }
    }

    const onDeleteAlbum = async () => {
      if (!albumId.value)
        return
      confirm.require({
        header: 'Delete album',
        message: 'Delete this album? This will also delete all related photos.',
        icon: 'pi pi-exclamation-triangle',
        rejectLabel: 'Cancel',
        acceptLabel: 'Delete',
        acceptProps: {
          severity: 'danger',
        },
        accept: async () => {
          try {
            await deleteAlbumAction(albumId.value)
            router.push('/albums')
          }
          catch (e) {
            console.error(e)
          }
        },
      })
    }

    const onPhotosUploaded = async () => {
      await loadAlbum()
    }

    const onDeletePhoto = async (photoId: string) => {
      confirm.require({
        header: 'Delete photo',
        message: 'Delete this photo?',
        icon: 'pi pi-exclamation-triangle',
        rejectLabel: 'Cancel',
        acceptLabel: 'Delete',
        acceptProps: {
          severity: 'danger',
        },
        accept: async () => {
          try {
            await deletePhotoAction(photoId)
            await loadAlbum()
          }
          catch (e) {
            console.error(e)
          }
        },
      })
    }

    return {
      album,
      albumError,
      isLoadingAlbum,
      busy,
      albumId,
      form,
      formResolver,
      goBack,
      onSave,
      onDeleteAlbum,
      saveError,
      saveSuccess,
      onPhotosUploaded,
      onDeletePhoto,
      deletePhotoError,
      goToPhoto,
      formatDateTime,
      onSetCoverPhoto,
      onClearCoverPhoto,
    }
  },
})
