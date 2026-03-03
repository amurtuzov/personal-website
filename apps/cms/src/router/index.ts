import type { RouteRecordRaw } from 'vue-router'
import { createRouter, createWebHistory } from 'vue-router'
import pinia from '@/store'
import { useAuthStore } from '@/store/auth'

const routes: Array<RouteRecordRaw> = [
  {
    path: '/:catchAll(.*)',
    name: 'not-found',
    component: () => import('@/views/ErrorPage/ErrorPage.vue'),
    meta: {
      layout: 'Simple',
    },
  },
  {
    path: '/auth',
    name: 'auth',
    component: () => import('@/views/AuthPage/AuthPage.vue'),
    meta: {
      layout: 'Auth',
    },
  },
  {
    path: '/',
    name: 'home',
    component: () => import('@/views/HomePage/HomePage.vue'),
    meta: {
      layout: 'Main',
    },
  },
  {
    path: '/albums',
    name: 'albums',
    component: () => import('@/views/AlbumsPage/AlbumsPage.vue'),
    meta: {
      layout: 'Main',
    },
  },
  {
    path: '/album/:id',
    name: 'album',
    component: () => import('@/views/AlbumPage/AlbumPage.vue'),
    meta: {
      layout: 'Main',
    },
  },
  {
    path: '/photos',
    name: 'photos',
    component: () => import('@/views/PhotosPage/PhotosPage.vue'),
    meta: {
      layout: 'Main',
    },
  },
  {
    path: '/photo/:id',
    name: 'photo',
    component: () => import('@/views/PhotoPage/PhotoPage.vue'),
    meta: {
      layout: 'Main',
    },
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior: (to, from, savedPosition) => {
    if (to.hash)
      return { selector: to.hash }
    if (savedPosition) {
      setTimeout(() => {
        window.scrollTo(savedPosition.left, savedPosition.top)
        return savedPosition
      }, 200)
    }
    else {
      return { x: 0, top: 0 }
    }
  },
  routes,
})

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore(pinia)
  const routeName = to.name || ''
  const isAuthRoute = ['auth'].includes(routeName as string)
  if (authStore.isAuth && isAuthRoute) {
    next({ name: 'home' })
  }
  else if (!authStore.isAuth && !isAuthRoute) {
    next({ name: 'auth' })
  }
  else {
    next()
  }
})

router.onError((error, to) => {
  if (error.message.includes('Failed to fetch dynamically imported module')) {
    if (to.fullPath) {
      window.location.href = to.fullPath
    }
    else {
      window.location.reload()
    }
  }
})

export { router, routes }
