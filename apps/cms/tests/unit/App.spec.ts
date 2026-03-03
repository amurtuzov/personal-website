import { mount } from '@vue/test-utils'
import App from '@/App/App.vue'
import { routes } from '@/router'
import { createTestingPinia } from '@pinia/testing'
import SvgIcon from '@/components/SvgIcon/SvgIcon.vue'
import { createRouter, createWebHistory, Router } from 'vue-router'

describe('App.vue', () => {
  let router: Router
  beforeEach(async () => {
    router = createRouter({
      history: createWebHistory(),
      routes: routes,
    })
    router.push('/login')
    await router.isReady()
  })
  it('Should render root component correctly', () => {
    const wrapper = mount(App, {
      global: {
        components: {
          SvgIcon,
        },
        plugins: [router, createTestingPinia()],
      },
    })
    expect(wrapper.findComponent(App).exists()).toBe(true)
  })
})
