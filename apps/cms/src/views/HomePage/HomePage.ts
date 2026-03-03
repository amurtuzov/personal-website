import Card from 'primevue/card'
import { defineComponent } from 'vue'
import { useRouter } from 'vue-router'

export default defineComponent({
  name: 'HomePage',
  components: {
    Card,
  },
  setup() {
    const router = useRouter()
    const pages = [
      { label: 'Albums', description: 'Create and edit albums', to: '/albums' },
      { label: 'Photos', description: 'Upload and edit photos', to: '/photos' },
    ]

    const onDashboardCardClick = (to: string) => {
      router.push(to)
    }
    return {
      pages,
      onDashboardCardClick,
    }
  },
})
