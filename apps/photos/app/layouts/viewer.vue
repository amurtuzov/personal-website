<template>
  <main class="viewer-layout">
    <slot />
  </main>
</template>

<style lang="scss" scoped>
.viewer-layout {
  width: 100%;
  min-height: 100dvh;
  height: 100dvh;
  overflow: hidden;
  background: #0d1014;
}
</style>
