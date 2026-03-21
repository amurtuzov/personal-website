<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{
  error: NuxtError
}>()

const statusCode = computed(() => props.error?.statusCode || 500)
const statusMessage = computed(() => props.error?.statusMessage || 'Request failed')

const details = computed(() => {
  const message = props.error?.message?.trim()
  if (!message || message === statusMessage.value) {
    return 'Please retry in a moment. If the issue persists, return to the home page.'
  }

  return message
})

const goHome = () => clearError({ redirect: '/' })
</script>

<template>
  <section class="error-page">
    <div class="error-card">
      <p class="error-code">{{ statusCode }}</p>
      <h1>{{ statusMessage }}</h1>
      <p class="error-details">{{ details }}</p>

      <div class="error-actions">
        <button type="button" @click="goHome">
          Back to Home
        </button>
      </div>
    </div>
  </section>
</template>

<style lang="scss" scoped>
.error-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 20px;
  background:
    radial-gradient(circle at 18% 12%, rgba(95, 137, 161, 0.15), rgba(95, 137, 161, 0) 42%),
    radial-gradient(circle at 86% 84%, rgba(200, 166, 128, 0.16), rgba(200, 166, 128, 0) 48%),
    #f7f8f7;
}

.error-card {
  width: min(580px, 100%);
  border: 1px solid #d7dde3;
  border-radius: 18px;
  background: #ffffff;
  padding: clamp(26px, 5vw, 36px);
  box-shadow: 0 16px 38px rgba(18, 24, 29, 0.09);

  h1 {
    margin: 0;
    color: #121820;
    font-size: clamp(32px, 5vw, 44px);
    line-height: 1;
    @include display-heading(700);
  }
}

.error-code {
  margin: 0 0 12px;
  color: #5f6f7f;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-size: 13px;
  @include body-text(600);
}

.error-details {
  margin: 16px 0 0;
  color: #4c5762;
  font-size: 15px;
  line-height: 1.6;
}

.error-actions {
  margin-top: 24px;

  button {
    border: 1px solid #cfd8e1;
    border-radius: 999px;
    background: #f9fbfc;
    padding: 10px 18px;
    font-size: 14px;
    color: #121820;
    cursor: pointer;
    @include body-text(600);
  }
}
</style>
