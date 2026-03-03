<template>
  <div class="layout-root">
    <slot />
  </div>
</template>

<style lang="scss" scoped>
.layout-root {
  @include pageFadeIn;
}
</style>
