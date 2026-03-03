import type { AuthResponse, LoginBody, RegisterBody } from '@/api/auth'
import type { DefaultError } from '@/types/httpError'
import { Form } from '@primevue/forms'
import { zodResolver } from '@primevue/forms/resolvers/zod'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import Password from 'primevue/password'
import Tab from 'primevue/tab'
import TabList from 'primevue/tablist'
import TabPanel from 'primevue/tabpanel'
import TabPanels from 'primevue/tabpanels'
import Tabs from 'primevue/tabs'
import { defineComponent, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { z } from 'zod'
import { login, register } from '@/api/auth'
import { useApiCall } from '@/composables/useApiCall'
import { useAuthStore } from '@/store/auth'

export default defineComponent({
  name: 'AuthPage',
  components: {
    Tab,
    TabList,
    TabPanel,
    TabPanels,
    Tabs,
    Form,
    Password,
    Message,
    InputText,
    Button,
  },
  setup() {
    const authStore = useAuthStore()
    const router = useRouter()
    const loginFields = reactive<LoginBody>({
      email: '',
      password: '',
    })
    const registerFields = reactive<RegisterBody>({
      name: '',
      email: '',
      password: '',
    })

    const {
      isLoading: isLoadingLogin,
      data: loginData,
      error: loginError,
      executeApiCall: loginAction,
    } = useApiCall<AuthResponse, DefaultError, LoginBody>(
      login,
      true,
    )

    const {
      isLoading: isLoadingRegister,
      data: registerData,
      error: registerError,
      executeApiCall: registerAction,
    } = useApiCall<AuthResponse, DefaultError, RegisterBody>(
      register,
      true,
    )

    const loginFormResolver = ref(zodResolver(
      z.object({
        email: z.string().min(5, { message: 'Field is required.' }).email('Email format is incorrect'),
        password: z.string().min(1, { message: 'Password is required' }),
      }),
    ))

    const registerFormResolver = ref(zodResolver(
      z.object({
        email: z.string().min(5, { message: 'Field is required.' }).email('Email format is incorrect'),
        password: z.string().min(8, { message: 'Password is required' }),
      }),
    ))

    const onLoginFormSubmit = async () => {
      try {
        await loginAction(loginFields)
        if (loginData.value) {
          authStore.authUser(loginData.value)
          router.push({ name: 'home' })
        }
      }
      catch (e) {
        console.error(e)
      }
    }
    const onRegisterFormSubmit = async () => {
      try {
        await registerAction(registerFields)
        if (registerData.value) {
          authStore.authUser(registerData.value)
          router.push({ name: 'home' })
        }
      }
      catch (e) {
        console.error(e)
      }
    }
    return {
      loginFields,
      registerFields,
      loginFormResolver,
      registerFormResolver,
      isLoadingLogin,
      loginError,
      isLoadingRegister,
      registerError,
      onLoginFormSubmit,
      onRegisterFormSubmit,
    }
  },
})
