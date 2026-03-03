<template>
  <div class="layout-root">
    <slot />
  </div>
</template>

<style lang="scss" scoped>
.layout-root {
  min-height: 100vh;
  @include page-fade-in;
}
</style>
