import type { PhotoWithUrls, UpdatePhotoBody } from '@/api/photos'
import type { DefaultError } from '@/types/httpError'
import { Form } from '@primevue/forms'
import { zodResolver } from '@primevue/forms/resolvers/zod'
import Button from 'primevue/button'
import Card from 'primevue/card'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import Textarea from 'primevue/textarea'
import { useConfirm } from 'primevue/useconfirm'
import { computed, defineComponent, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { z } from 'zod'
import { deletePhoto, getAdminPhotoById, updatePhoto } from '@/api/photos'
import { useApiCall } from '@/composables/useApiCall'

type PhotoFormState = {
  title: string
  description: string
  locationName: string
}

type UpdatePhotoParams = UpdatePhotoBody & { id: string }

export default defineComponent({
  name: 'PhotoPage',
  components: {
    Form,
    Button,
    Card,
    InputText,
    Message,
    Textarea,
  },
  setup() {
    const route = useRoute()
    const router = useRouter()
    const confirm = useConfirm()

    const photoId = computed(() => String(route.params.id || ''))

    const form = reactive<PhotoFormState>({
      title: '',
      description: '',
      locationName: '',
    })

    const formResolver = ref(zodResolver(
      z.object({
        title: z.string().max(120, { message: 'Max 120 characters' }).optional().or(z.literal('')),
        description: z.string().max(500, { message: 'Max 500 characters' }).optional().or(z.literal('')),
        locationName: z.string().max(120, { message: 'Max 120 characters' }).optional().or(z.literal('')),
      }),
    ))

    const {
      data: photo,
      error: photoError,
      isLoading: isLoadingPhoto,
      executeApiCall: fetchPhoto,
    } = useApiCall<PhotoWithUrls, DefaultError, string>(
      getAdminPhotoById,
      true,
    )

    const {
      isLoading: isSaving,
      error: saveError,
      executeApiCall: updatePhotoAction,
    } = useApiCall<unknown, DefaultError, UpdatePhotoParams>(
      updatePhoto,
      true,
    )

    const {
      isLoading: isDeleting,
      executeApiCall: deletePhotoAction,
    } = useApiCall<unknown, DefaultError, string>(
      deletePhoto,
      true,
    )

    const saveSuccess = ref(false)

    const busy = computed(() => isLoadingPhoto.value || isSaving.value || isDeleting.value)

    const previewUrl = computed(() => {
      return photo.value?.webUrl || photo.value?.thumbUrl || null
    })

    const loadPhoto = async () => {
      if (!photoId.value) {
        return
      }
      try {
        await fetchPhoto(photoId.value)
      }
      catch (e) {
        console.error(e)
      }
    }

    watch(photoId, async () => await loadPhoto(), { immediate: true })

    watch(
      () => photo.value,
      () => {
        if (!photo.value)
          return
        form.title = photo.value.title || ''
        form.description = photo.value.description || ''
        form.locationName = photo.value.locationName || ''
      },
    )

    watch(form, () => {
      saveSuccess.value = false
    }, { deep: true })

    const goBack = () => {
      router.push('/photos')
    }

    const onSave = async () => {
      if (!photoId.value)
        return
      try {
        await updatePhotoAction({
          id: photoId.value,
          title: form.title,
          description: form.description,
          locationName: form.locationName,
        })
        if (!saveError.value) {
          saveSuccess.value = true
          await loadPhoto()
        }
      }
      catch (e) {
        console.error(e)
      }
    }

    const onDeletePhoto = async () => {
      if (!photoId.value)
        return
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
            await deletePhotoAction(photoId.value)
            router.push('/photos')
          }
          catch (e) {
            console.error(e)
          }
        },
      })
    }

    return {
      photo,
      photoError,
      isLoadingPhoto,
      previewUrl,
      busy,
      form,
      formResolver,
      goBack,
      onSave,
      onDeletePhoto,
      saveError,
      saveSuccess,
    }
  },
})
