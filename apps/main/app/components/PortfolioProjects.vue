<script setup lang="ts">
import { projects } from '@/constants/portfolio'
</script>

<template>
  <section id="projects" class="section-anchor projects">
    <h2>Projects</h2>

    <a
      v-for="project in projects"
      :key="project.title"
      :href="project.href"
      target="_blank"
      rel="noopener noreferrer"
      class="projects__card"
    >
      <h3>{{ project.title }}</h3>
      <p>{{ project.summary }}</p>
    </a>
  </section>
</template>

<style lang="scss" scoped>
.projects {
  margin-top: 52px;
  display: grid;
  gap: 14px;

  h2 {
    margin: 0;
    color: $textBody;
    font-size: 13px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    @include heading(700);
  }

  &__card {
    @include borderedCard;
    padding: 19px 21px;
    text-decoration: none;
    display: block;
    transition: transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease, background-color 180ms ease;

    &:hover {
      transform: translateY(-2px);
      border-color: $borderStrong;
      background: rgba(255, 255, 255, 0.02);
      box-shadow: 0 14px 28px rgba(0, 0, 0, 0.26);
    }

    &:focus-visible {
      outline: 2px solid rgba(214, 214, 214, 0.62);
      outline-offset: 3px;
      border-color: $borderStrong;
    }
  }

  h3 {
    margin: 0;
    color: $textPrimary;
    font-size: 18px;
    @include heading(700);
    line-height: 1.25;
  }

  p {
    margin: 8px 0 0;
    color: $textBody;
    font-size: 14px;
    line-height: 1.7;
  }
}
</style>
