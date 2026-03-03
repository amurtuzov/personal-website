<script setup lang="ts">
import { cvFileHref, experiences } from '@/constants/portfolio'
</script>

<template>
  <section id="experience" class="section-anchor experience">
    <div class="experience__heading">
      <h2>Experience</h2>
      <a :href="cvFileHref" target="_blank" rel="noopener noreferrer">View full CV (PDF)</a>
    </div>

    <a
      v-for="item in experiences"
      :key="item.period + item.role"
      :href="item.href"
      target="_blank"
      rel="noopener noreferrer"
      class="experience__card"
    >
      <div class="experience__meta">
        <p class="experience__period">{{ item.period }}</p>
        <ul class="experience__details">
          <li>{{ item.employmentType }}</li>
          <li>{{ item.workFormat }}</li>
        </ul>
      </div>
      <h3>{{ item.role }}</h3>
      <p class="experience__summary">{{ item.summary }}</p>
      <ul class="experience__tags">
        <li v-for="tag in item.tags" :key="tag">{{ tag }}</li>
      </ul>
    </a>
  </section>
</template>

<style lang="scss" scoped>
.experience {
  margin-top: 52px;
  display: grid;
  gap: 14px;

  &__heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }

  h2 {
    margin: 0;
    color: $textBody;
    font-size: 13px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    @include heading(700);
  }

  &__heading a {
    text-decoration: none;
    color: $textBody;
    font-size: 11px;
    @include overline;
    letter-spacing: 0.08em;
    border: 1px solid $borderBase;
    border-radius: 999px;
    padding: 7px 10px;

    &:hover {
      color: $textPrimary;
      border-color: $borderStrong;
    }
  }

  &__card {
    @include borderedCard;
    padding: 18px 20px;
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

  &__meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
  }

  &__period {
    margin: 0;
    color: $textMuted;
    font-size: 12px;
    @include overline;
    letter-spacing: 0.08em;
  }

  &__details {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    gap: 8px;
    flex-wrap: wrap;

    li {
      border: 1px solid $borderBase;
      background: rgba(255, 255, 255, 0.02);
      border-radius: 999px;
      padding: 4px 9px;
      color: $textMuted;
      font-size: 10px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      @include overline;
    }
  }

  h3 {
    margin: 8px 0 0;
    color: $textPrimary;
    font-size: 18px;
    @include heading(700);
    line-height: 1.28;
  }

  &__summary {
    margin: 10px 0 0;
    color: $textBody;
    font-size: 14px;
    line-height: 1.7;
    width: min(710px, 100%);
  }

  &__tags {
    list-style: none;
    margin: 18px 0 0;
    padding: 0;
    display: flex;
    gap: 8px;
    flex-wrap: wrap;

    li {
      border: 1px solid $chipBorder;
      background: $chipBg;
      border-radius: 999px;
      padding: 6px 9px;
      color: #d6d6d6;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      @include body(400);
    }
  }
}
</style>
