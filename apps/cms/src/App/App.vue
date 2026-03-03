<template>
  <component :is="layoutComponent">
    <router-view :key="componentKey" v-slot="{ Component }">
      <transition name="fade" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>
  </component>
</template>

<script lang="ts" src="./App.ts"></script>

<style lang="scss" src="./App.scss"></style>
