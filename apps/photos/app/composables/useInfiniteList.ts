import type { Ref } from 'vue'

type PaginatedItems<T> = {
  items?: T[]
  total?: number
}

export async function useInfiniteList<T>(
  url: string,
  baseBody: Record<string, any> = {}
) {
  const page = ref(1)
  const items = ref<T[]>([]) as Ref<T[]>
  const finished = ref(false)
  const total = ref<number | null>(null)
  const loadingMore = ref(false)

  let controller: AbortController | null = null

  // SSR first page
  const { data, pending } = await useFetch<PaginatedItems<T>>(url, {
    method: 'GET',
    query: { ...baseBody, page: 1 },
  })

  total.value = typeof data.value?.total === 'number' ? data.value.total : null
  items.value = data.value?.items || []

  if (!items.value.length) {
    finished.value = true
  }

  if (total.value !== null && items.value.length >= total.value) {
    finished.value = true
  }

  async function loadMore() {
    if (pending.value || loadingMore.value || finished.value || !items.value.length) return
    if (total.value !== null && items.value.length >= total.value) {
      finished.value = true
      return
    }

    controller?.abort()
    controller = new AbortController()

    const nextPage = page.value + 1

    try {
      loadingMore.value = true

      const result = await $fetch<PaginatedItems<T>>(url, {
        method: 'GET',
        query: { ...baseBody, page: nextPage },
        signal: controller.signal,
      })
      total.value = typeof result.total === 'number' ? result.total : total.value

      const nextItems = result.items || []

      if (!nextItems.length) {
        finished.value = true
        return
      }

      items.value.push(...nextItems)
      page.value = nextPage

      if (total.value !== null && items.value.length >= total.value) {
        finished.value = true
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return
      throw err
    } finally {
      loadingMore.value = false
    }
  }

  return {
    items,
    page,
    pending,
    loadingMore,
    total,
    finished,
    loadMore,
  }
}
