import type { Paginated, PhotosQuery, PhotoWithUrls } from '@/api/photos'
import type { DefaultError } from '@/types/httpError'
import Button from 'primevue/button'
import Card from 'primevue/card'
import InputText from 'primevue/inputtext'
import { computed, defineComponent, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { deletePhoto, getPhotos } from '@/api/photos'
import PhotoUploader from '@/components/PhotoUploader/PhotoUploader.vue'
import { useApiCall } from '@/composables/useApiCall'
import { useInfinityScroll } from '@/composables/useInfinityScroll'
import { debounce } from '@/helpers/debounce'

export default defineComponent({
  name: 'PhotosPage',
  components: {
    Button,
    Card,
    InputText,
    PhotoUploader,
  },
  setup() {
    const router = useRouter()
    const photos = ref<PhotoWithUrls[]>([])
    const totalPhotos = ref(0)
    const listLoader = ref<HTMLElement | null>(null)

    const photosQuery = reactive<PhotosQuery>({
      page: 1,
      pageSize: 20,
      search: '',
    })

    const {
      data: photosData,
      executeApiCall: fetchPhotos,
      isLoading: isLoadingPhotos,
    } = useApiCall<Paginated<PhotoWithUrls>, DefaultError, PhotosQuery>(
      getPhotos,
      false,
      photosQuery,
    )

    const {
      executeApiCall: deletePhotoAction,
      isLoading: isDeleting,
    } = useApiCall<unknown, DefaultError, string>(
      deletePhoto,
      true,
    )

    const busy = computed(() => isLoadingPhotos.value || isDeleting.value)

    const loadPhotos = async () => {
      if (photosData.value) {
        totalPhotos.value = photosData.value.total
        if (photos.value.length < totalPhotos.value) {
          photosQuery.page++
        }
      }
    }

    watch(
      () => photosData.value,
      () => {
        if (photosData.value) {
          const { items, total, page } = photosData.value
          totalPhotos.value = total
          if (page === 1) {
            photos.value = items
            return
          }
          photos.value = [...photos.value, ...items]
        }
      },
    )

    useInfinityScroll(isLoadingPhotos, listLoader, loadPhotos)

    const onDelete = async (id: string) => {
      await deletePhotoAction(id)
      photos.value = photos.value.filter(photo => photo.id !== id)
      totalPhotos.value = Math.max(0, totalPhotos.value - 1)
      if (photosQuery.page !== 1) {
        photosQuery.page = 1
      }
      else {
        await fetchPhotos()
      }
    }

    const onSearch = async (event: InputEvent) => {
      const value = (event.target as HTMLInputElement).value
      photosQuery.search = value
      photosQuery.page = 1
    }

    const debouncedSearch = debounce(onSearch, 600)

    const goToPhoto = (photoId: string) => {
      router.push(`/photo/${photoId}`)
    }

    const onPhotosUploaded = async () => {
      if (photosQuery.page !== 1) {
        photosQuery.page = 1
      }
      else {
        await fetchPhotos()
      }
    }

    return {
      photos,
      totalPhotos,
      busy,
      isLoadingPhotos,
      listLoader,
      photosQuery,
      onDelete,
      debouncedSearch,
      goToPhoto,
      onPhotosUploaded,
    }
  },
})
