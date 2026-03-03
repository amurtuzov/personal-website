<template>
  <main class="portfolio-page">
    <div class="portfolio-page__content">
      <PortfolioSidebar class="portfolio-page__sidebar" />

      <div class="portfolio-page__main">
        <PortfolioAbout />
        <PortfolioExperience />
        <PortfolioProjects />
        <PortfolioContact />
      </div>
    </div>
  </main>
</template>

<style lang="scss" scoped>
.portfolio-page {
  width: 100%;
  min-height: 100vh;

  &__content {
    width: min(1340px, calc(100vw - 52px));
    min-height: 100vh;
    margin: 0 auto;
    padding: 64px 0 60px;
    display: grid;
    grid-template-columns: 420px minmax(0, 1fr);
    gap: 88px;
  }

  &__main {
    width: min(760px, 100%);
    max-height: calc(100vh - 124px);
    overflow-y: auto;
    padding-right: 8px;
    scroll-behavior: smooth;
    scrollbar-width: none;
    -ms-overflow-style: none;

    &::-webkit-scrollbar {
      width: 0;
      height: 0;
      display: none;
    }
  }

  @media only screen and (max-width: 1023px) {
    &__content {
      width: min(1340px, calc(100vw - 52px));
      min-height: initial;
      margin: 0 auto;
      padding: 44px 0 52px;
      gap: 38px;
      grid-template-columns: 1fr;
    }

    &__main {
      width: 100%;
      max-height: none;
      overflow: visible;
      padding-right: 0;
    }
  }

  @media only screen and (max-width: 767px) {
    &__content {
      width: min(760px, calc(100vw - 28px));
      padding: 36px 0 48px;
    }
  }
}
</style>
