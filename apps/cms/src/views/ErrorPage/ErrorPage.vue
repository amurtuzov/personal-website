<template>
  <div class="not-found flex flex-column align-items-center justify-content-center gap-2">
    <span class="not-found__code">404</span>
    <router-link :to="{ name: 'home' }" class="not-found__link">
      To Home Page
    </router-link>
  </div>
</template>

<script lang="ts" src="./ErrorPage.ts"></script>

<style lang="scss" scoped src="./ErrorPage.scss"></style>
