<script setup lang="ts">
withDefaults(defineProps<{
  name: string
  size?: string | number
  mode?: 'svg' | 'css'
  link?: string
}>(), {
  size: 17,
  mode: 'svg',
  link: undefined,
})
</script>

<template>
  <a v-if="link" :href="link" target="_blank" rel="noopener noreferrer">
    <Icon :name="name" :size="size" :mode="mode" />
  </a>

  <Icon v-else :name="name" :size="size" :mode="mode" />
</template>

<style scoped lang="scss">
a {
  display: block;
  text-decoration: none;
}

:deep(svg) {
  display: block;
}
</style>
