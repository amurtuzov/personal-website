import Button from 'primevue/button'
import Menubar from 'primevue/menubar'
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'AuthLayout',
  components: {
    Menubar,
    Button,
  },
  setup() {
    const version = APP_VERSION

    const toggleDarkMode = () => {
      document.documentElement.classList.toggle('dark-theme')
      localStorage.setItem('darkMode', JSON.stringify(document.documentElement.classList.contains('dark-theme')))
    }
    return {
      version,
      toggleDarkMode,
    }
  },
})
