import type { Ref } from 'vue'

export function useInfiniteIntersection(
  target: Ref<HTMLElement | null>,
  callback: () => void
) {
  let observer: IntersectionObserver | null = null

  onMounted(() => {
    if (!target.value) return

    observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return
        if (!entry.isIntersecting) return
        callback()
      },
      {
        rootMargin: '0px',
      }
    )

    observer.observe(target.value)
  })

  onBeforeUnmount(() => {
    observer?.disconnect()
  })
}
