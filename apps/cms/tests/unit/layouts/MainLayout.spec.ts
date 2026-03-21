import type { Router } from 'vue-router'
import { createTestingPinia } from '@pinia/testing'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import SvgIcon from '@/components/SvgIcon/SvgIcon.vue'
import MainLayout from '@/layouts/MainLayout/MainLayout.vue'
import { routes } from '@/router'

describe('MainLayout.vue', () => {
  let router: Router
  beforeEach(async () => {
    router = createRouter({
      history: createWebHistory(),
      routes,
    })
    router.push('/auth')
    await router.isReady()
  })
  it('Renders correctly', () => {
    const wrapper = mount(MainLayout, {
      global: {
        components: {
          SvgIcon,
        },
        stubs: {
          notifications: true,
        },
        plugins: [router, createTestingPinia()],
      },
    })
    expect(wrapper.findComponent(MainLayout).exists()).toBe(true)
  })
})
