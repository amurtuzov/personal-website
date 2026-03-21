<script setup lang="ts">
type AppNavLink = {
  label: string
  to?: string
  href?: string
  external?: boolean
}

const route = useRoute()
const mobileMenuOpen = ref(false)

const navLinks: AppNavLink[] = [
  { label: 'Home', to: '/' },
  { label: 'Albums', to: '/albums' },
  { label: 'Contact', to: '/contact' },
  { label: 'Dev Portfolio', href: 'https://amurtuzov.com', external: true },
]

const isActive = (to?: string) => {
  if (!to) return false
  if (to === '/') return route.path === '/'
  return route.path === to || route.path.startsWith(`${to}/`)
}

const closeMobileMenu = () => {
  mobileMenuOpen.value = false
}

const toggleMobileMenu = () => {
  mobileMenuOpen.value = !mobileMenuOpen.value
}

const handleEscape = (event: KeyboardEvent) => {
  if (event.key !== 'Escape') return
  closeMobileMenu()
}

watch(
  () => route.fullPath,
  () => {
    closeMobileMenu()
  }
)

watch(mobileMenuOpen, (isOpen) => {
  if (!import.meta.client) return
  document.body.style.overflow = isOpen ? 'hidden' : ''
})

onMounted(() => {
  window.addEventListener('keydown', handleEscape)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleEscape)
  if (import.meta.client) {
    document.body.style.overflow = ''
  }
})
</script>

<template>
  <div class="layout-root">
    <aside class="sidebar">
      <div class="brand">
        <img class="brand__logo" src="/icon.svg" alt="" aria-hidden="true" />
        <div>
          <p class="brand__title">Anar Murtuzov</p>
          <p class="brand__subtitle">Visual Journal</p>
        </div>
      </div>

      <nav class="nav" aria-label="Primary">
        <template v-for="link in navLinks" :key="link.label">
          <NuxtLink
            v-if="link.to"
            :to="link.to"
            class="nav__link"
            :class="{ 'nav__link--active': isActive(link.to) }"
          >
            {{ link.label }}
          </NuxtLink>

          <a
            v-else-if="link.href"
            :href="link.href"
            class="nav__link"
            target="_blank"
            rel="noreferrer"
          >
            {{ link.label }}
          </a>
        </template>
      </nav>

      <div class="socials">
        <a href="https://instagram.com" target="_blank" rel="noreferrer" aria-label="Instagram">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" />
            <circle cx="12" cy="12" r="4" stroke="currentColor" />
            <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" stroke="none" />
          </svg>
        </a>
      </div>
    </aside>

    <div class="surface">
      <header class="mobile-topbar">
        <div class="brand brand--mobile">
          <img class="brand__logo" src="/icon.svg" alt="" aria-hidden="true" />
          <p class="brand__title">Anar Murtuzov</p>
        </div>

        <button
          class="menu-toggle"
          type="button"
          aria-label="Toggle menu"
          :aria-expanded="mobileMenuOpen ? 'true' : 'false'"
          @click="toggleMobileMenu"
        >
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M4 7.5H20" stroke="currentColor" stroke-linecap="round" />
            <path d="M4 12H20" stroke="currentColor" stroke-linecap="round" />
            <path d="M4 16.5H15" stroke="currentColor" stroke-linecap="round" />
          </svg>
        </button>
      </header>

      <main class="content">
        <slot />
      </main>
    </div>

    <Transition name="menu-fade">
      <div v-if="mobileMenuOpen" class="mobile-overlay" @click="closeMobileMenu">
        <aside class="mobile-drawer" @click.stop>
          <div class="mobile-drawer__head">
            <p class="mobile-drawer__title">Navigation</p>
            <button type="button" class="menu-toggle menu-toggle--close" aria-label="Close menu" @click="closeMobileMenu">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M6 6L18 18" stroke="currentColor" stroke-linecap="round" />
                <path d="M18 6L6 18" stroke="currentColor" stroke-linecap="round" />
              </svg>
            </button>
          </div>

          <nav class="mobile-nav" aria-label="Mobile primary">
            <template v-for="link in navLinks" :key="`mobile-${link.label}`">
              <NuxtLink
                v-if="link.to"
                :to="link.to"
                class="mobile-nav__link"
                :class="{ 'mobile-nav__link--active': isActive(link.to) }"
              >
                {{ link.label }}
              </NuxtLink>

              <a
                v-else-if="link.href"
                :href="link.href"
                class="mobile-nav__link"
                target="_blank"
                rel="noreferrer"
              >
                {{ link.label }}
              </a>
            </template>
          </nav>

          <div class="mobile-socials">
            <a href="https://instagram.com" target="_blank" rel="noreferrer" aria-label="Instagram">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" />
                <circle cx="12" cy="12" r="4" stroke="currentColor" />
                <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" stroke="none" />
              </svg>
            </a>
          </div>
        </aside>
      </div>
    </Transition>
  </div>
</template>

<style lang="scss" scoped>
.layout-root {
  min-height: 100vh;
  display: flex;
  background: #f6f6f3;
}

.sidebar {
  width: 300px;
  min-width: 300px;
  padding: 34px 28px 26px;
  position: sticky;
  top: 0;
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 32px;

  &__logo {
    width: 46px;
    height: 46px;
    display: block;
  }

  &__title {
    margin: 0;
    font-size: 26px;
    line-height: 1;
    font-family: 'Lora', serif;
    color: #151a1f;
  }

  &__subtitle {
    margin: 5px 0 0;
    color: #66707a;
    font-size: 12px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  &--mobile {
    margin-bottom: 0;

    .brand__logo {
      width: 30px;
      height: 30px;
    }

    .brand__title {
      font-size: 19px;
    }
  }
}

.nav {
  display: grid;
  gap: 14px;

  &__link {
    color: #66707a;
    text-decoration: none;
    font-size: 15px;
    transition: color 0.2s ease;

    &:hover,
    &--active {
      color: #151a1f;
    }
  }
}

.socials {
  margin-top: auto;

  a {
    width: 34px;
    height: 34px;
    border: 1px solid #dbe1e7;
    border-radius: 999px;
    display: grid;
    place-items: center;
    color: #66707a;
    text-decoration: none;
    background: #fff;
  }

  svg {
    width: 16px;
    height: 16px;
    stroke-width: 1.9;
  }
}

.surface {
  flex: 1;
  min-width: 0;
}

.mobile-topbar {
  display: none;
}

.content {
  min-height: 100vh;
}

.menu-toggle {
  width: 36px;
  height: 36px;
  border: 1px solid #dbe1e7;
  border-radius: 10px;
  background: #fff;
  color: #66707a;
  display: grid;
  place-items: center;
  cursor: pointer;

  svg {
    width: 16px;
    height: 16px;
    stroke-width: 2.1;
  }

  &--close {
    width: 32px;
    height: 32px;
  }
}

.mobile-overlay {
  position: fixed;
  inset: 0;
  background: rgba(18, 24, 30, 0.22);
  z-index: 30;
}

.mobile-drawer {
  margin-left: auto;
  width: min(82vw, 360px);
  height: 100%;
  background: #fbfbf8;
  padding: 20px 18px;
  display: flex;
  flex-direction: column;
}

.mobile-drawer__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18px;
}

.mobile-drawer__title {
  margin: 0;
  font-size: 12px;
  color: #66707a;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.mobile-nav {
  display: grid;
  gap: 14px;

  &__link {
    font-size: 19px;
    text-decoration: none;
    color: #252c34;

    &--active {
      color: #11161c;
    }
  }
}

.mobile-socials {
  margin-top: auto;

  a {
    width: 34px;
    height: 34px;
    border: 1px solid #dbe1e7;
    border-radius: 999px;
    display: grid;
    place-items: center;
    color: #66707a;
    text-decoration: none;
    background: #fff;
  }

  svg {
    width: 16px;
    height: 16px;
    stroke-width: 1.9;
  }
}

.menu-fade-enter-active,
.menu-fade-leave-active {
  transition: opacity 0.2s ease;
}

.menu-fade-enter-from,
.menu-fade-leave-to {
  opacity: 0;
}

@media (max-width: 1024px) {
  .sidebar {
    display: none;
  }

  .mobile-topbar {
    height: 68px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 16px;
    border-bottom: 1px solid #dbe1e7;
    background: #fbfbf8;
    position: sticky;
    top: 0;
    z-index: 10;
  }

  .content {
    min-height: calc(100vh - 68px);
  }
}
</style>
