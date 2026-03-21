import type { Ref } from 'vue'

type ViewerItem = {
  id: string
}

type UseDecorativePhotoViewerOptions<T extends ViewerItem> = {
  items: Ref<T[]>
  loadMore: () => Promise<void>
  loadingMore: Ref<boolean>
  finished: Ref<boolean>
  returnUrl: string
}

export function useDecorativePhotoViewer<T extends ViewerItem>({
  items,
  loadMore,
  loadingMore,
  finished,
  returnUrl,
}: UseDecorativePhotoViewerOptions<T>) {
  const isOpen = ref(false)
  const currentIndex = ref(-1)
  const isLoadingNext = ref(false)

  const normalizedReturnUrl = returnUrl || '/'

  const currentPhoto = computed<T | null>(() => {
    const index = currentIndex.value
    if (index < 0) return null
    return items.value[index] || null
  })

  const canGoPrev = computed(() => currentIndex.value > 0)
  const canGoNext = computed(() => {
    const index = currentIndex.value
    if (index < 0) return false
    return index < items.value.length - 1 || !finished.value
  })

  const getPhotoPath = (photoId: string) => `/photo/${encodeURIComponent(photoId)}`

  const extractPhotoIdFromPath = (pathname: string): string | null => {
    const match = /^\/photo\/([^/?#]+)/.exec(pathname)
    if (!match?.[1]) return null
    try {
      return decodeURIComponent(match[1])
    } catch {
      return match[1]
    }
  }

  const setViewerUrl = (photoId: string, mode: 'push' | 'replace') => {
    if (!import.meta.client) return

    const url = getPhotoPath(photoId)
    const state = {
      ...(window.history.state || {}),
      __photoViewerOverlay: true,
      returnUrl: normalizedReturnUrl,
      photoId,
    }

    if (mode === 'push') {
      window.history.pushState(state, '', url)
      return
    }

    window.history.replaceState(state, '', url)
  }

  const restoreListUrl = () => {
    if (!import.meta.client) return
    window.history.replaceState(window.history.state, '', normalizedReturnUrl)
  }

  const close = (restoreUrl = true) => {
    isOpen.value = false
    currentIndex.value = -1
    isLoadingNext.value = false
    if (restoreUrl) {
      restoreListUrl()
    }
  }

  const open = (index: number) => {
    if (index < 0 || index >= items.value.length) return

    currentIndex.value = index
    isOpen.value = true

    const photo = items.value[index]
    if (photo?.id) {
      setViewerUrl(photo.id, 'push')
    }
  }

  const goPrev = () => {
    if (!canGoPrev.value || isLoadingNext.value) return
    currentIndex.value -= 1
  }

  const goNext = async () => {
    if (isLoadingNext.value || currentIndex.value < 0) return

    if (currentIndex.value < items.value.length - 1) {
      currentIndex.value += 1
      return
    }

    if (finished.value) return

    isLoadingNext.value = true
    const before = items.value.length
    try {
      await loadMore()
      if (items.value.length > before) {
        currentIndex.value += 1
      }
    } finally {
      isLoadingNext.value = false
    }
  }

  const syncFromLocation = () => {
    if (!import.meta.client) return

    const photoId = extractPhotoIdFromPath(window.location.pathname)
    if (!photoId) {
      if (isOpen.value) {
        close(false)
      }
      return
    }

    const index = items.value.findIndex(item => item.id === photoId)
    if (index < 0) {
      return
    }

    currentIndex.value = index
    isOpen.value = true
  }

  const isEditableTarget = (target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) return false

    if (target.isContentEditable) return true

    const tagName = target.tagName
    return tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT'
  }

  const handleKeydown = (event: KeyboardEvent) => {
    if (!isOpen.value || isEditableTarget(event.target)) return

    if (event.key === 'Escape') {
      event.preventDefault()
      close()
      return
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      goPrev()
      return
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault()
      void goNext()
    }
  }

  watch(currentPhoto, (photo) => {
    if (!photo || !isOpen.value) return
    setViewerUrl(photo.id, 'replace')
  })

  watch(isOpen, (openState) => {
    if (!import.meta.client) return
    document.body.style.overflow = openState ? 'hidden' : ''
  })

  onMounted(() => {
    if (!import.meta.client) return
    window.addEventListener('popstate', syncFromLocation)
    window.addEventListener('keydown', handleKeydown)
  })

  onBeforeUnmount(() => {
    if (!import.meta.client) return
    window.removeEventListener('popstate', syncFromLocation)
    window.removeEventListener('keydown', handleKeydown)
    document.body.style.overflow = ''
  })

  return {
    isOpen,
    currentIndex,
    currentPhoto,
    canGoPrev,
    canGoNext,
    isLoadingNext,
    open,
    close,
    goPrev,
    goNext,
  }
}
