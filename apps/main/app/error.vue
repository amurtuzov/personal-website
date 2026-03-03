<script setup lang="ts">
import type { NuxtError } from 'nuxt/app'

defineProps<{
  error: NuxtError
}>()
</script>

<template>
  <main class="error-page">
    <h1>{{ error.statusCode || 500 }}</h1>
    <p>{{ error.statusMessage || 'Unexpected error' }}</p>
    <NuxtLink to="/">Back to Home</NuxtLink>
  </main>
</template>

<style lang="scss" scoped>
.error-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  text-align: center;
  gap: 12px;

  h1 {
    margin: 0;
    color: $textPrimary;
    @include heading(700);
  }

  p {
    margin: 0;
  }

  a {
    color: $textPrimary;
  }
}
</style>
