<script setup lang="ts">
import { navigation, profile, socialLinks } from '@/constants/portfolio'
</script>

<template>
  <aside class="sidebar">
    <h1 class="sidebar__name">{{ profile.name }}</h1>
    <p class="sidebar__intro">{{ profile.intro }}</p>

    <nav class="sidebar__nav">
      <a
        v-for="item in navigation"
        :key="item.id"
        class="sidebar__nav-link"
        :href="`#${item.id}`"
      >
        {{ item.label }}
      </a>
    </nav>

    <div class="sidebar__socials">
      <a
        v-for="item in socialLinks"
        :key="item.label"
        class="sidebar__social-link"
        :href="item.href"
        :aria-label="item.label"
        target="_blank"
        rel="noopener noreferrer"
      >
        <SvgIcon :name="item.iconName" :size="17" />
      </a>
    </div>
  </aside>
</template>

<style lang="scss" scoped>
.sidebar {
  position: sticky;
  top: 64px;
  max-height: calc(100vh - 124px);

  &__name {
    margin: 0;
    color: $textPrimary;
    font-size: clamp(36px, 4vw, 52px);
    letter-spacing: -0.02em;
    line-height: 1.06;
    @include heading(700);
  }

  &__intro {
    margin: 16px 0 0;
    width: min(250px, 100%);
    color: $textBody;
    font-size: 16px;
    line-height: 1.55;
  }

  &__nav {
    margin-top: 42px;
    display: grid;
    gap: 14px;
  }

  &__nav-link {
    text-decoration: none;
    color: $textMuted;
    font-size: 12px;
    @include overline;

    &:hover {
      color: $textPrimary;
    }
  }

  &__socials {
    margin-top: 56px;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  &__social-link {
    width: 36px;
    height: 36px;
    border-radius: 999px;
    border: 1px solid $borderBase;
    background: $bgField;
    display: grid;
    place-items: center;
    text-decoration: none;
    transition: border-color 140ms ease, transform 140ms ease;

    :deep(svg) {
      display: block;
      width: 17px;
      height: 17px;
    }

    &:hover {
      border-color: $borderStrong;
      transform: translateY(-1px);
    }
  }

  @media only screen and (max-width: 1023px) {
    position: static;
    max-height: none;

    &__socials {
      margin-top: 28px;
      margin-bottom: 8px;
    }
  }
}
</style>
