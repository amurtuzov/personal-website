<template>
  <div class="layout">
    <Menubar class="topbar border-noround" :model="[]">
      <template #start>
        <span class="layout__title">
          Photo Gallery CMS
        </span>
      </template>
      <template #end>
        <Button icon="pi pi-sun" text @click="toggleDarkMode" />
      </template>
    </Menubar>
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

<script lang="ts" src="./AuthLayout.ts"></script>

<style lang="scss" src="./AuthLayout.scss"></style>
