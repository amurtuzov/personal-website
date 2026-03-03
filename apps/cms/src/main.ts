import { createApp } from 'vue'
import globalComponents from '@/plugins/globalComponents'
import PrimeVue, { primeVueConfig } from '@/plugins/prime'
import ConfirmationService from 'primevue/confirmationservice'
import pinia from '@/store'
import App from './App/App.vue'
import { router } from './router'
import '@/plugins/axios'

const app = createApp(App)

globalComponents(app)

async function initApp() {
  app.use(pinia)
  app.use(PrimeVue, primeVueConfig)
  app.use(ConfirmationService)
  app.use(router).mount('#app')
}

window.addEventListener('load', initApp)
