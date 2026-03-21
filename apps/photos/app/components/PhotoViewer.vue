<script setup lang="ts">
import type { PhotoWithUrls } from '~/types/photos'

type ExifRecord = Record<string, unknown>

const props = withDefaults(defineProps<{
  photo: PhotoWithUrls
  currentShot?: number
  totalShots?: number
  showControls?: boolean
  canGoPrev?: boolean
  canGoNext?: boolean
  isLoadingNext?: boolean
  overlay?: boolean
  backLabel?: string
  homeTo?: string
}>(), {
  showControls: true,
  canGoPrev: false,
  canGoNext: false,
  isLoadingNext: false,
  overlay: true,
  backLabel: 'Back to feed',
  homeTo: '/',
})

const emit = defineEmits<{
  close: []
  prev: []
  next: []
}>()

const MIN_ZOOM = 1
const MAX_ZOOM = 4
const ZOOM_STEP = 0.25

const stageRef = ref<HTMLElement | null>(null)
const imageRef = ref<HTMLImageElement | null>(null)
const zoom = ref(MIN_ZOOM)
const panX = ref(0)
const panY = ref(0)
const isDragging = ref(false)
const activePointerId = ref<number | null>(null)
const dragOriginX = ref(0)
const dragOriginY = ref(0)
const dragStartPanX = ref(0)
const dragStartPanY = ref(0)

const photoSrc = computed(() => props.photo.webUrl || props.photo.thumbUrl || '')
const photoAlt = computed(() => props.photo.title || 'Photo')
const isImageReady = computed(() => Boolean(photoSrc.value && imageRef.value))
const isZoomed = computed(() => zoom.value > MIN_ZOOM + 0.001)
const canZoomIn = computed(() => zoom.value < MAX_ZOOM - 0.001)
const canZoomOut = computed(() => zoom.value > MIN_ZOOM + 0.001)
const zoomPercent = computed(() => `${Math.round(zoom.value * 100)}%`)

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const getPanBounds = () => {
  const stage = stageRef.value
  const image = imageRef.value

  if (!stage || !image) {
    return { maxX: 0, maxY: 0 }
  }

  const stageWidth = stage.clientWidth
  const stageHeight = stage.clientHeight
  const baseWidth = image.clientWidth || stageWidth
  const baseHeight = image.clientHeight || stageHeight

  if (stageWidth <= 0 || stageHeight <= 0 || baseWidth <= 0 || baseHeight <= 0) {
    return { maxX: 0, maxY: 0 }
  }

  const scaledWidth = baseWidth * zoom.value
  const scaledHeight = baseHeight * zoom.value

  return {
    maxX: Math.max(0, (scaledWidth - stageWidth) / 2),
    maxY: Math.max(0, (scaledHeight - stageHeight) / 2),
  }
}

const clampPan = (nextX: number, nextY: number) => {
  const { maxX, maxY } = getPanBounds()

  return {
    x: clamp(nextX, -maxX, maxX),
    y: clamp(nextY, -maxY, maxY),
  }
}

const setPan = (nextX: number, nextY: number) => {
  const clamped = clampPan(nextX, nextY)
  panX.value = clamped.x
  panY.value = clamped.y
}

const stopDragging = (event?: PointerEvent) => {
  const stage = stageRef.value
  const pointerId = event?.pointerId ?? activePointerId.value

  if (pointerId !== null && stage && stage.hasPointerCapture(pointerId)) {
    stage.releasePointerCapture(pointerId)
  }

  isDragging.value = false
  activePointerId.value = null
}

const resetZoom = () => {
  zoom.value = MIN_ZOOM
  panX.value = 0
  panY.value = 0
  stopDragging()
}

const setZoom = (
  nextZoom: number,
  focusPoint?: { clientX: number, clientY: number }
) => {
  const currentZoom = zoom.value
  const normalizedZoom = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM)

  if (Math.abs(normalizedZoom - currentZoom) < 0.001) {
    return
  }

  if (normalizedZoom <= MIN_ZOOM + 0.001) {
    resetZoom()
    return
  }

  let nextPanX = panX.value
  let nextPanY = panY.value

  if (focusPoint && stageRef.value && currentZoom > 0) {
    const rect = stageRef.value.getBoundingClientRect()
    const focusX = focusPoint.clientX - rect.left - rect.width / 2
    const focusY = focusPoint.clientY - rect.top - rect.height / 2
    const ratio = normalizedZoom / currentZoom

    nextPanX = focusX - (focusX - panX.value) * ratio
    nextPanY = focusY - (focusY - panY.value) * ratio
  }

  zoom.value = normalizedZoom
  setPan(nextPanX, nextPanY)
}

const zoomIn = () => {
  if (!isImageReady.value) return
  setZoom(zoom.value + ZOOM_STEP)
}

const zoomOut = () => {
  if (!isImageReady.value) return
  setZoom(zoom.value - ZOOM_STEP)
}

const onStageWheel = (event: WheelEvent) => {
  if (!photoSrc.value || !isImageReady.value) return

  const direction = event.deltaY < 0 ? 1 : -1
  setZoom(zoom.value + direction * ZOOM_STEP, {
    clientX: event.clientX,
    clientY: event.clientY,
  })
}

const onStageDoubleClick = (event: MouseEvent) => {
  if (!photoSrc.value || !isImageReady.value) return

  const target = event.target as HTMLElement | null
  if (target?.closest('.viewer-zoom-controls')) return

  if (!isZoomed.value) {
    setZoom(2, {
      clientX: event.clientX,
      clientY: event.clientY,
    })
    return
  }

  resetZoom()
}

const onPointerDown = (event: PointerEvent) => {
  if (!isImageReady.value) return
  if (!isZoomed.value) return
  if (event.pointerType === 'mouse' && event.button !== 0) return

  const target = event.target as HTMLElement | null
  if (target?.closest('.viewer-zoom-controls')) return

  const stage = stageRef.value
  if (!stage) return

  activePointerId.value = event.pointerId
  isDragging.value = true
  dragOriginX.value = event.clientX
  dragOriginY.value = event.clientY
  dragStartPanX.value = panX.value
  dragStartPanY.value = panY.value
  stage.setPointerCapture(event.pointerId)
}

const onPointerMove = (event: PointerEvent) => {
  if (!isDragging.value || activePointerId.value !== event.pointerId) return

  const deltaX = event.clientX - dragOriginX.value
  const deltaY = event.clientY - dragOriginY.value

  setPan(dragStartPanX.value + deltaX, dragStartPanY.value + deltaY)
}

const onPointerUp = (event: PointerEvent) => {
  if (activePointerId.value !== null && event.pointerId !== activePointerId.value) return
  stopDragging(event)
}

const onImageLoad = (event: Event) => {
  const target = event.target
  imageRef.value = target instanceof HTMLImageElement ? target : null
  setPan(panX.value, panY.value)
}

const imageTransformStyle = computed(() => ({
  transform: `translate3d(${panX.value}px, ${panY.value}px, 0) scale(${zoom.value})`,
  transition: isDragging.value ? 'none' : 'transform 0.16s ease-out',
  cursor: !isZoomed.value ? 'zoom-in' : (isDragging.value ? 'grabbing' : 'grab'),
}))

const shotCounter = computed(() => {
  const current = Math.trunc(props.currentShot || 0)
  const total = Math.trunc(props.totalShots || 0)

  if (current <= 0 || total <= 0) {
    return ''
  }

  const width = Math.max(2, String(total).length)
  const formatShot = (value: number) => String(value).padStart(width, '0')

  return `Shot: ${formatShot(current)}/${formatShot(total)}`
})

const shotMeta = computed(() => {
  const parts: string[] = []

  if (props.photo.takenAt) {
    const parsed = new Date(props.photo.takenAt)
    if (!Number.isNaN(parsed.getTime())) {
      parts.push(
        new Intl.DateTimeFormat('en', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        }).format(parsed)
      )
    }
  }

  if (props.photo.locationName) {
    parts.push(props.photo.locationName)
  }

  return parts.join(' • ')
})

const hasDescription = computed(() => Boolean(props.photo.description?.trim()))

const exif = computed<ExifRecord | null>(() => {
  if (!props.photo.exif || typeof props.photo.exif !== 'object' || Array.isArray(props.photo.exif)) {
    return null
  }

  return props.photo.exif as ExifRecord
})

const getExifString = (key: string) => {
  const value = exif.value?.[key]
  return typeof value === 'string' ? value.trim() : ''
}

const getExifNumber = (key: string) => {
  const value = exif.value?.[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

const formatNumber = (value: number, maxFractionDigits = 1) => {
  if (Number.isInteger(value)) return String(value)
  return value.toFixed(maxFractionDigits).replace(/\.?0+$/, '')
}

const cameraPart = computed(() => {
  const make = getExifString('make')
  const model = getExifString('model')

  if (make && model) {
    if (model.toLowerCase().includes(make.toLowerCase())) {
      return model
    }

    return `${make} ${model}`
  }

  return make || model || ''
})

const shotDateIso = computed(() => {
  if (!props.photo.takenAt) return ''
  const parsed = new Date(props.photo.takenAt)
  if (Number.isNaN(parsed.getTime())) return ''
  return parsed.toISOString().slice(0, 10)
})

const exifText = computed(() => {
  const parts: string[] = []

  const camera = cameraPart.value
  if (camera) parts.push(camera)

  const lensModel = getExifString('lensModel')
  if (lensModel) parts.push(lensModel)

  const focalLength = getExifNumber('focalLength')
  if (focalLength !== null) parts.push(`${formatNumber(focalLength)}mm`)

  const fNumber = getExifNumber('fNumber')
  if (fNumber !== null) parts.push(`f/${formatNumber(fNumber)}`)

  const shutterSpeed = getExifString('shutterSpeed')
  if (shutterSpeed) parts.push(shutterSpeed)

  const iso = getExifNumber('iso')
  if (iso !== null) parts.push(`ISO ${Math.round(iso)}`)

  if (shotDateIso.value) parts.push(shotDateIso.value)
  if (props.photo.locationName) parts.push(props.photo.locationName)

  return parts.join(' · ')
})

const hasExif = computed(() => Boolean(exifText.value))

watch(() => props.photo.id, () => {
  resetZoom()
})

watch(photoSrc, () => {
  imageRef.value = null
  resetZoom()
})

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  if (!import.meta.client || typeof ResizeObserver === 'undefined') return

  resizeObserver = new ResizeObserver(() => {
    if (!isZoomed.value) return
    setPan(panX.value, panY.value)
  })

  if (stageRef.value) {
    resizeObserver.observe(stageRef.value)
  }
})

onBeforeUnmount(() => {
  if (!resizeObserver) return
  resizeObserver.disconnect()
  resizeObserver = null
})
</script>

<template>
  <section
    class="viewer"
    :class="{ 'viewer--overlay': overlay }"
    :role="overlay ? 'dialog' : undefined"
    :aria-modal="overlay ? 'true' : undefined"
  >
    <div class="viewer-shell">
      <div class="viewer-main">
        <div
          ref="stageRef"
          class="viewer-image-wrap"
          :class="{
            'viewer-image-wrap--dragging': isDragging,
            'viewer-image-wrap--loading': photoSrc && !isImageReady,
          }"
          @wheel.prevent="onStageWheel"
          @dblclick.prevent="onStageDoubleClick"
          @pointerdown="onPointerDown"
          @pointermove="onPointerMove"
          @pointerup="onPointerUp"
          @pointercancel="onPointerUp"
          @contextmenu.prevent
        >
          <NuxtImg
            v-if="photoSrc"
            :key="photo.id || photoSrc"
            :src="photoSrc"
            :alt="photoAlt"
            :width="photo.width || undefined"
            :height="photo.height || undefined"
            loading="eager"
            decoding="async"
            densities="x1 x2"
            sizes="100vw two:100vw three:100vw four:100vw"
            custom
            v-slot="{ src, isLoaded, imgAttrs }"
          >
            <img
              :class="['viewer-image', { 'viewer-image--loaded': isLoaded }]"
              v-bind="imgAttrs"
              :src="src"
              :style="imageTransformStyle"
              draggable="false"
              @load="onImageLoad"
              @dragstart.prevent
              @contextmenu.prevent
            >

            <div v-if="!isLoaded" class="viewer-loader" aria-hidden="true">
              <div class="viewer-loader__pulse-grid">
                <span />
                <span />
                <span />
              </div>
            </div>
          </NuxtImg>

          <div v-else class="viewer-fallback">
            Photo unavailable
          </div>

          <div
            v-if="photoSrc && isImageReady"
            class="viewer-zoom-controls"
            role="group"
            aria-label="Photo zoom controls"
            @dblclick.stop
          >
            <button
              type="button"
              class="viewer-chip viewer-chip--square viewer-chip--overlay"
              :disabled="!isImageReady || !canZoomOut"
              @click.stop="zoomOut"
            >
              −
            </button>
            <button
              type="button"
              class="viewer-chip viewer-chip--zoom viewer-chip--overlay"
              :disabled="!isImageReady || !isZoomed"
              @click.stop="resetZoom"
            >
              {{ zoomPercent }}
            </button>
            <button
              type="button"
              class="viewer-chip viewer-chip--square viewer-chip--overlay"
              :disabled="!isImageReady || !canZoomIn"
              @click.stop="zoomIn"
            >
              +
            </button>
          </div>

          <p v-if="photoSrc" class="viewer-zoom-hint">
            Scroll to zoom • Drag to pan • Double-click to reset
          </p>
        </div>

        <aside class="viewer-side">
          <div class="viewer-meta">
            <div class="viewer-title-row">
              <h2 class="viewer-title">{{ photo.title || 'Untitled photo' }}</h2>
              <span v-if="shotCounter" class="viewer-counter">{{ shotCounter }}</span>
            </div>

            <p v-if="shotMeta" class="viewer-shot">{{ shotMeta }}</p>

            <p v-if="hasDescription" class="viewer-description">
              {{ photo.description }}
            </p>

            <p v-if="hasExif" class="viewer-exif">{{ exifText }}</p>
          </div>

          <div class="viewer-nav">
            <template v-if="showControls">
              <button
                type="button"
                class="viewer-chip"
                :disabled="!canGoPrev || isLoadingNext"
                @click="emit('prev')"
              >
                Previous
              </button>
              <button
                type="button"
                class="viewer-chip"
                @click="emit('close')"
              >
                {{ backLabel }}
              </button>
              <button
                type="button"
                class="viewer-chip"
                :disabled="(!canGoNext && !isLoadingNext) || !photoSrc"
                @click="emit('next')"
              >
                {{ isLoadingNext ? 'Loading…' : 'Next' }}
              </button>
            </template>
            <NuxtLink v-else :to="homeTo" class="viewer-chip">
              Home
            </NuxtLink>
          </div>
        </aside>
      </div>
    </div>
  </section>
</template>

<style lang="scss" scoped>
.viewer {
  min-height: 100dvh;
  height: 100dvh;
  background: radial-gradient(circle at center, rgba(31, 36, 44, 0.78), rgba(7, 9, 12, 0.98));
  padding: 15px;
  color: #d3d8df;
  overflow: hidden;
  width: 100%;

  &--overlay {
    position: fixed;
    inset: 0;
    z-index: 50;
  }
}

.viewer-shell {
  max-width: 3000px;
  margin: 0 auto;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.viewer-main {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.viewer-side {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
}

.viewer-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #d3d8df;
  font-size: 13px;
  border: 1px solid rgba(255, 255, 255, 0.24);
  background: rgba(255, 255, 255, 0.03);
  padding: 6px 10px;
  border-radius: 999px;
  text-decoration: none;
  cursor: pointer;
  transition: background-color 0.2s ease, border-color 0.2s ease;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.34);
  }
}

.viewer-image-wrap {
  position: relative;
  border: 1px solid rgba(255, 255, 255, 0.13);
  background: rgba(0, 0, 0, 0.5);
  padding: 8px;
  flex: 1 1 auto;
  display: flex;
  align-items: center;
  justify-items: center;
  min-height: 0;
  overflow: hidden;
  touch-action: none;
}

.viewer-image-wrap--loading {
  cursor: progress;
}

.viewer-image-wrap--dragging {
  cursor: grabbing;
}

.viewer-image {
  display: block !important;
  width: 100%;
  height: 100%;
  max-width: none;
  max-height: none;
  object-fit: contain;
  user-select: none;
  -webkit-user-select: none;
  -webkit-user-drag: none;
  -webkit-touch-callout: none;
  opacity: 0;
  transition: opacity 0.32s ease;
}

.viewer-image--loaded {
  opacity: 1;
}

.viewer-image-canvas {
  width: 100%;
  height: 100%;
  transform-origin: center center;
  will-change: transform;
}

.viewer-fallback {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  color: #b6bfcc;
}

.viewer-loader {
  position: absolute;
  inset: 8px;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 10px;
  background:
    radial-gradient(circle at 20% 22%, rgba(123, 147, 176, 0.16), transparent 48%),
    radial-gradient(circle at 82% 78%, rgba(89, 114, 141, 0.14), transparent 44%),
    linear-gradient(120deg, rgba(8, 11, 15, 0.82), rgba(18, 25, 34, 0.66));
  border: 1px solid rgba(255, 255, 255, 0.09);
  backdrop-filter: blur(1px);
  pointer-events: none;
}

.viewer-loader__pulse-grid {
  display: inline-flex;
  gap: 8px;

  span {
    width: 8px;
    height: 8px;
    border-radius: 999px;
    background: rgba(214, 224, 236, 0.9);
    opacity: 0.2;
    animation: viewer-pulse 1.1s ease-in-out infinite;

    &:nth-child(2) {
      animation-delay: 0.14s;
    }

    &:nth-child(3) {
      animation-delay: 0.28s;
    }
  }
}

.viewer-meta {
  color: #d3d8df;
  max-width: 980px;
}

.viewer-title-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
}

.viewer-title {
  margin: 0;
  font-family: 'Lora', serif;
  font-size: 26px;
  font-weight: 400;
  line-height: 160%;
}

.viewer-shot {
  margin: 8px 0 0;
  font-size: 13px;
  color: #a7afbb;
}

.viewer-counter {
  font-size: 13px;
  color: #a7afbb;
}

.viewer-description {
  margin: 8px 0 0;
  color: #aeb6c2;
  font-size: 13px;
  line-height: 160%;
  max-width: 760px;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.viewer-exif {
  margin: 8px 0 0;
  color: #98a1ae;
  font-size: 12px;
  line-height: 160%;
}

.viewer-nav {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.viewer-zoom-controls {
  position: absolute;
  right: 16px;
  bottom: 14px;
  display: inline-flex;
  gap: 8px;
}

.viewer-chip--square {
  width: 34px;
  padding-left: 0;
  padding-right: 0;
  font-size: 20px;
  line-height: 1;
}

.viewer-chip--zoom {
  min-width: 76px;
}

.viewer-chip--overlay {
  background: rgba(7, 9, 12, 0.54);
  border-color: rgba(255, 255, 255, 0.14);

  &:hover:not(:disabled) {
    background: rgba(7, 9, 12, 0.7);
    border-color: rgba(255, 255, 255, 0.24);
  }

  &:disabled {
    opacity: 1;
    color: rgba(148, 160, 176, 0.55);
    background: rgba(7, 9, 12, 0.8);
    border-color: rgba(255, 255, 255, 0.08);
    box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.38);
  }
}

.viewer-zoom-hint {
  position: absolute;
  left: 16px;
  bottom: 18px;
  margin: 0;
  padding: 4px 10px;
  font-size: 11px;
  letter-spacing: 0.02em;
  color: #aeb6c2;
  background: rgba(7, 9, 12, 0.54);
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 999px;
  pointer-events: none;
}

@keyframes viewer-pulse {
  0%, 80%, 100% {
    opacity: 0.2;
    transform: scale(1);
  }
  40% {
    opacity: 0.95;
    transform: scale(1.2);
  }
}


@media (min-width: 1024px) {
  .viewer-main {
    flex-direction: row;
    align-items: stretch;
  }

  .viewer-image-wrap {
    min-width: 0;
    flex: 1 1 auto;
  }

  .viewer-side {
    width: 300px;
    flex: 0 0 300px;
  }

  .viewer-meta {
    max-width: none;
    overflow: auto;
    padding-right: 2px;
  }

  .viewer-nav {
    margin-top: auto;
    flex-direction: column;
    flex-wrap: nowrap;
  }

  .viewer-nav .viewer-chip {
    width: 100%;
  }
}

@media (min-width: 1920px) {
  .viewer-side {
    width: 400px;
    flex-basis: 400px;
  }
}

@media (max-width: 1023px) {
  .viewer {
    padding: 12px;
  }

  .viewer-zoom-controls {
    right: 12px;
    bottom: 12px;
    gap: 6px;
  }

  .viewer-chip--square {
    width: 30px;
    font-size: 17px;
  }

  .viewer-chip--zoom {
    min-width: 68px;
  }

  .viewer-zoom-hint {
    display: none;
  }

  .viewer-title {
    font-size: 22px;
  }

  .viewer-title-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }
}
</style>
