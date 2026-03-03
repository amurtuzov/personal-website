import axios from 'axios'
import { useAuthStore } from '@/store/auth'

axios.interceptors.request.use((config) => {
  if (config && config.headers) {
    config.baseURL = import.meta.env.VITE_API_URL
    const authStore = useAuthStore()
    if (authStore.isAuth) {
      config.headers.Authorization = `Bearer ${authStore.token}`
    }
  }
  return config
})

axios.interceptors.response.use(undefined, async (error) => {
  const status = error?.response?.status
  const authStore = useAuthStore()
  const isAuthEndpoint = error?.config?.url?.includes('/auth/login') || error?.config?.url?.includes('/auth/register')

  if (!axios.isCancel(error) && status === 401 && !isAuthEndpoint) {
    authStore.logout()
  }

  return Promise.reject(error)
})
