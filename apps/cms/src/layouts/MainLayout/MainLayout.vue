<template>
  <div class="layout">
    <ConfirmDialog class="w-11 md:w-6 xl:w-4" />
    <Drawer v-model:visible="sidebarVisible" :dismissable="!mainStore.isMobile" class="sidebar">
      <PanelMenu :model="menuItems">
        <template #item="{ item }">
          <router-link v-if="item.to" v-slot="{ href, navigate }" :to="item.to" custom>
            <a class="flex items-center cursor-pointer px-4 py-2 no-underline text-primary" :href="href" @click="() => { navigate(); sidebarVisible = false }">
              <span :class="item.icon" />
              <span class="ml-2">{{ item.label }}</span>
            </a>
          </router-link>
        </template>
      </PanelMenu>
    </Drawer>
    <Menubar class="topbar border-noround" :model="[]">
      <template #start>
        <div class="brand">
          <Button class="sidebar-toggle" icon="pi pi-bars" @click="sidebarVisible = true" />
        </div>
      </template>
      <template #end>
        <Button icon="pi pi-sun" text @click="toggleDarkMode" />
        <Button icon="pi pi-sign-out" text @click="authStore.logout" />
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

<script lang="ts" src="./MainLayout.ts"></script>

<style lang="scss" scoped src="./MainLayout.scss"></style>
