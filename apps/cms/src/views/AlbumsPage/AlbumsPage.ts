import type { AlbumsQuery, AlbumWithPhotos, CreateAlbumBody, Paginated } from '@/api/albums'
import type { DefaultError } from '@/types/httpError'
import { Form } from '@primevue/forms'
import { zodResolver } from '@primevue/forms/resolvers/zod'
import Button from 'primevue/button'
import Card from 'primevue/card'
import Checkbox from 'primevue/checkbox'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import Textarea from 'primevue/textarea'
import { computed, defineComponent, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { z } from 'zod'
import { createAlbum, deleteAlbum, getAlbums } from '@/api/albums'
import { useApiCall } from '@/composables/useApiCall'
import { useInfinityScroll } from '@/composables/useInfinityScroll'
import { debounce } from '@/helpers/debounce'

type AlbumFormState = CreateAlbumBody

export default defineComponent({
  name: 'AlbumsPage',
  components: {
    Form,
    Button,
    Card,
    Checkbox,
    Dialog,
    InputText,
    Message,
    Textarea,
  },
  setup() {
    const router = useRouter()
    const albums = ref<AlbumWithPhotos[]>([])
    const totalAlbums = ref(0)
    const isDialogOpen = ref(false)
    const listLoader = ref<HTMLElement | null>(null)
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

    const albumsQuery = reactive<AlbumsQuery>({
      page: 1,
      pageSize: 20,
      search: '',
    })

    const {
      data: albumsData,
      executeApiCall: fetchAlbums,
      isLoading: isLoadingAlbums,
    } = useApiCall<Paginated<AlbumWithPhotos>, DefaultError, AlbumsQuery>(
      getAlbums,
      false,
      albumsQuery,
    )
    const {
      executeApiCall: createAlbumAction,
      isLoading: isCreating,
      error: createError,
    } = useApiCall<AlbumWithPhotos, DefaultError, CreateAlbumBody>(
      createAlbum,
      true,
    )
    const {
      executeApiCall: deleteAlbumAction,
      isLoading: isDeleting,
    } = useApiCall<AlbumWithPhotos, DefaultError, string>(
      deleteAlbum,
      true,
    )

    const busy = computed(() => isLoadingAlbums.value || isCreating.value || isDeleting.value)

    const resetForm = () => {
      form.title = ''
      form.slug = ''
      form.description = ''
      form.isPublic = true
    }

    const loadAlbums = async () => {
      if (albumsData.value) {
        totalAlbums.value = albumsData.value.total
        if (albums.value.length < totalAlbums.value) {
          albumsQuery.page++
        }
      }
    }

    watch(
      () => albumsData.value,
      () => {
        if (albumsData.value) {
          const { items, total, page } = albumsData.value
          totalAlbums.value = total
          if (page === 1) {
            albums.value = items
            return
          }
          albums.value = [...albums.value, ...items]
        }
      },
    )

    useInfinityScroll(isLoadingAlbums, listLoader, loadAlbums)

    const openDialog = () => {
      resetForm()
      isDialogOpen.value = true
    }

    const onCreate = async () => {
      await createAlbumAction(form)
      if (createError.value) {
        return
      }
      if (albumsQuery.page !== 1) {
        albumsQuery.page = 1
      }
      else {
        await fetchAlbums()
      }
      isDialogOpen.value = false
    }

    const onDelete = async (id: string) => {
      await deleteAlbumAction(id)
      if (albumsQuery.page !== 1) {
        albumsQuery.page = 1
      }
      else {
        await fetchAlbums()
      }
    }

    const onSearch = async (event: InputEvent) => {
      const value = (event.target as HTMLInputElement).value
      albumsQuery.page = 1
      albumsQuery.search = value
    }

    const debouncedSearch = debounce(onSearch, 600)

    const goToAlbum = (albumId: string) => {
      router.push(`/album/${albumId}`)
    }

    return {
      albums,
      totalAlbums,
      isDialogOpen,
      form,
      busy,
      isLoadingAlbums,
      openDialog,
      onCreate,
      onDelete,
      goToAlbum,
      formResolver,
      resetForm,
      createError,
      albumsQuery,
      listLoader,
      debouncedSearch,
    }
  },
})
