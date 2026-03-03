<template>
  <main class="photo-placeholder">
    <div class="photo-placeholder__orb photo-placeholder__orb--left" aria-hidden="true" />
    <div class="photo-placeholder__orb photo-placeholder__orb--right" aria-hidden="true" />

    <section class="photo-placeholder__card">
      <p class="photo-placeholder__eyebrow">Anar Murtuzov</p>
      <h1>Photo Blog Coming Soon</h1>
      <p class="photo-placeholder__lead">
        This space is becoming a visual journal with curated albums, travel stories, and quiet moments.
      </p>
      <p class="photo-placeholder__note">
        Check back soon while I shape the first collection.
      </p>
    </section>
  </main>
</template>

<style lang="scss" scoped>
.photo-placeholder {
  position: relative;
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px;
  overflow: hidden;
  background:
    radial-gradient(circle at 15% 14%, rgba(198, 112, 52, 0.22) 0, rgba(198, 112, 52, 0) 58%),
    radial-gradient(circle at 84% 82%, rgba(37, 132, 122, 0.18) 0, rgba(37, 132, 122, 0) 52%),
    linear-gradient(135deg, #f9f2e7 0%, #f2e9dc 46%, #ece5db 100%);

  &__orb {
    position: absolute;
    border-radius: 999px;
    filter: blur(10px);
    opacity: 0.55;
    animation: drift 12s ease-in-out infinite;

    &--left {
      width: min(44vw, 380px);
      height: min(44vw, 380px);
      left: -16%;
      top: -12%;
      background: radial-gradient(circle, rgba(232, 138, 73, 0.72) 0%, rgba(232, 138, 73, 0) 68%);
    }

    &--right {
      width: min(40vw, 340px);
      height: min(40vw, 340px);
      right: -12%;
      bottom: -16%;
      background: radial-gradient(circle, rgba(50, 150, 138, 0.6) 0%, rgba(50, 150, 138, 0) 64%);
      animation-delay: -5.5s;
    }
  }

  &__card {
    position: relative;
    z-index: 1;
    width: min(720px, 100%);
    padding: clamp(28px, 5vw, 52px);
    border-radius: 28px;
    background: linear-gradient(148deg, rgba(255, 251, 244, 0.86), rgba(255, 248, 238, 0.68));
    border: 1px solid rgba(60, 40, 22, 0.16);
    box-shadow:
      0 20px 50px rgba(61, 38, 20, 0.15),
      inset 0 1px 0 rgba(255, 255, 255, 0.72);
    text-align: center;
    backdrop-filter: blur(3px);
  }

  &__eyebrow {
    margin: 0;
    text-transform: uppercase;
    letter-spacing: 0.18em;
    font-size: 11px;
    color: $ink-700;
    @include body-text(600);
  }

  h1 {
    margin: 12px 0 0;
    color: $ink-900;
    font-size: clamp(40px, 8vw, 76px);
    line-height: 0.98;
    @include display-heading(700);
  }

  &__lead {
    margin: 16px auto 0;
    width: min(560px, 100%);
    color: $ink-800;
    font-size: clamp(16px, 2.2vw, 22px);
    line-height: 1.55;
    @include body-text(500);
  }

  &__note {
    margin: 14px auto 0;
    width: min(500px, 100%);
    color: $ink-600;
    font-size: 14px;
    line-height: 1.65;
    @include body-text(500);
  }
}

@media only screen and (max-width: 767px) {
  .photo-placeholder {
    padding: 16px;

    &__card {
      border-radius: 24px;
      padding: 24px 18px;
    }
  }
}
</style>
