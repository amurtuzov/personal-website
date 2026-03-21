import type { Ref } from 'vue'

type MasonryFallbackOptions = {
  waitForImages?: boolean
  observeSubtree?: boolean
}

export function useMasonryFallbackGrid(
  target: Ref<HTMLElement | null>,
  options: MasonryFallbackOptions = {}
) {
  const waitForImages = options.waitForImages ?? false
  const observeSubtree = options.observeSubtree ?? false

  let resizeObserver: ResizeObserver | null = null
  let mutationObserver: MutationObserver | null = null
  let rafId = 0

  const scheduleLayout = () => {
    if (rafId) {
      cancelAnimationFrame(rafId)
    }

    rafId = requestAnimationFrame(() => {
      rafId = 0

      const container = target.value
      if (!container) return

      const colGap = parseFloat(getComputedStyle(container).columnGap) || 0
      const children = Array.from(container.children) as HTMLElement[]

      for (const item of children) {
        const box = item.getBoundingClientRect()
        item.style.gridRowEnd = `span ${Math.round(box.height + colGap)}`
      }
    })
  }

  const bindImageLoadListeners = (nodes: HTMLElement[]) => {
    for (const node of nodes) {
      const images = Array.from(node.querySelectorAll('img'))

      for (const img of images) {
        if (img.dataset.masonryBound === '1') continue
        img.dataset.masonryBound = '1'

        if (img.complete) continue

        img.addEventListener('load', scheduleLayout, { once: true })
        img.addEventListener('error', scheduleLayout, { once: true })
      }
    }
  }

  onMounted(() => {
    if (CSS.supports('display', 'grid-lanes')) return

    const container = target.value
    if (!container) return

    container.style.gridAutoRows = '0px'
    container.style.setProperty('row-gap', '1px', 'important')

    if (waitForImages) {
      bindImageLoadListeners([container])
    }

    scheduleLayout()

    resizeObserver = new ResizeObserver(() => {
      scheduleLayout()
    })
    resizeObserver.observe(container)

    mutationObserver = new MutationObserver((records) => {
      const addedNodes = records.flatMap((record) => Array.from(record.addedNodes))
      const addedElements = addedNodes.filter((node): node is HTMLElement => node instanceof HTMLElement)

      if (!addedElements.length) return

      if (waitForImages) {
        bindImageLoadListeners(addedElements)
      }

      scheduleLayout()
    })

    mutationObserver.observe(container, {
      childList: true,
      subtree: observeSubtree,
    })
  })

  onBeforeUnmount(() => {
    resizeObserver?.disconnect()
    mutationObserver?.disconnect()

    if (rafId) {
      cancelAnimationFrame(rafId)
      rafId = 0
    }
  })

  return {
    scheduleLayout,
  }
}
