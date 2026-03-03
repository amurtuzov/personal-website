import { defineComponent } from 'vue'

export default defineComponent({
  name: 'SimpleLayout',
  setup() {
    const version = APP_VERSION
    return {
      version,
    }
  },
})
