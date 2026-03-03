import Avatar from 'primevue/avatar'
import Button from 'primevue/button'
import Card from 'primevue/card'
import ConfirmDialog from 'primevue/confirmdialog'
import Drawer from 'primevue/drawer'
import Menubar from 'primevue/menubar'
import PanelMenu from 'primevue/panelmenu'
import { defineComponent, ref } from 'vue'
import { useAuthStore } from '@/store/auth'
import { useMainStore } from '@/store/main'

export default defineComponent({
  name: 'MainLayout',
  components: {
    Menubar,
    Drawer,
    PanelMenu,
    Button,
    Avatar,
    Card,
    ConfirmDialog,
  },
  setup() {
    const version = APP_VERSION
    const authStore = useAuthStore()
    const sidebarVisible = ref(false)
    const mainStore = useMainStore()
    const menuItems = [
      { label: 'Dashboard', icon: 'pi pi-home', to: '/' },
      { label: 'Albums', icon: 'pi pi-folder', to: '/albums' },
      { label: 'Photos', icon: 'pi pi-image', to: '/photos' },
    ]

    const toggleDarkMode = () => {
      document.documentElement.classList.toggle('dark-theme')
      localStorage.setItem('darkMode', JSON.stringify(document.documentElement.classList.contains('dark-theme')))
    }

    return {
      version,
      authStore,
      sidebarVisible,
      mainStore,
      menuItems,
      toggleDarkMode,
    }
  },
})
