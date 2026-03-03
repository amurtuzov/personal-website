<script setup lang="ts">
import { factGroups, profile } from '@/constants/portfolio'
</script>

<template>
  <section id="about" class="section-anchor about">
    <h2>About</h2>
    <p>{{ profile.about }}</p>

    <div class="about__facts">
      <article v-for="group in factGroups" :key="group.title" class="about__facts-card">
        <h3>{{ group.title }}</h3>

        <ul>
          <li v-for="item in group.items" :key="item">{{ item }}</li>
        </ul>
      </article>
    </div>
  </section>
</template>

<style lang="scss" scoped>
.about {
  h2 {
    margin: 0;
    color: $textBody;
    font-size: 13px;
    @include heading(700);
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }

  p {
    margin: 14px 0 0;
    width: min(590px, 100%);
    color: $textBody;
    font-size: 15px;
    line-height: 1.78;
  }

  &__facts {
    margin-top: 18px;
    width: min(700px, 100%);
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;

    @media only screen and (min-width: 768px) and (max-width: 1199px) {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    @include mobileOnly {
      grid-template-columns: 1fr;
    }
  }

  &__facts-card {
    @include borderedCard;
    padding: 14px 15px;

    h3 {
      margin: 0;
      color: $textPrimary;
      font-size: 12px;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      @include heading(700);
    }

    ul {
      margin: 10px 0 0;
      padding: 0;
      list-style: none;
      display: grid;
      gap: 7px;
    }

    li {
      color: $textBody;
      font-size: 13px;
      line-height: 1.5;
    }
  }
}
</style>
