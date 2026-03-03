<template>
  <div class="layout">
    <main>
      <slot />
    </main>
    <footer>
      <div class="version">
        Version: {{ version }}
      </div>
    </footer>
  </div>
</template>

<script lang="ts" src="./SimpleLayout.ts"></script>

<style lang="scss">
.version {
  @include Roboto(400);
  font-size: 12px;
  color: var(--custom-text-color);
}
</style>
