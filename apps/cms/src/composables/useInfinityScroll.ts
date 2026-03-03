import type { Ref } from 'vue'
import { onBeforeUnmount, ref, watchEffect } from 'vue'

export const useInfinityScroll = (
  isListLoading: Ref<boolean>,
  loaderElement: Ref<HTMLElement | null>,
  loadingExecutor: () => void,
) => {
  const intersectionObserver = ref(null) as Ref<null | IntersectionObserver>
  const destroyInfinityScroll = () => {
    intersectionObserver.value?.disconnect()
    intersectionObserver.value = null
  }
  const intersectionObserverInit = () => {
    if ('IntersectionObserver' in window) {
      intersectionObserver.value = new IntersectionObserver(async (entries) => {
        const [entry] = entries
        if (entry.isIntersecting && !isListLoading.value) {
          loadingExecutor()
        }
      })
      intersectionObserver.value.observe(loaderElement.value as HTMLElement)
    }
  }

  watchEffect(() => {
    if (loaderElement.value) {
      intersectionObserverInit()
    }
  })

  onBeforeUnmount(() => {
    destroyInfinityScroll()
  })
}
