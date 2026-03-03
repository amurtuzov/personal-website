<template>
  <div class="home">
    <Card
      v-for="page in pages"
      :key="page.label"
      class="cursor-pointer"
      @click="onDashboardCardClick(page.to)"
    >
      <template #title>
        {{ page.label }}
      </template>
      <template #content>
        <p class="m-0">
          {{ page.description }}
        </p>
      </template>
    </Card>
  </div>
</template>

<script lang="ts" src="./HomePage.ts"></script>

<style lang="scss" src="./HomePage.scss"></style>
