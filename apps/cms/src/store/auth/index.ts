import type { AuthResponse, LoginBody } from '@/api/auth'
import type { RootActions, RootGetters, RootState } from '@/store/auth/types'
import type { DefaultError } from '@/types/httpError'
import { defineStore } from 'pinia'
import { login } from '@/api/auth'
import { useApiCall } from '@/composables/useApiCall'
import {
  getStorageItemWithExpiry,
  setStorageItemWithExpiry,
} from '@/helpers/localStorageHelpers'

const authToken = getStorageItemWithExpiry<string>('authToken')

export const useAuthStore = defineStore<
  string,
  RootState,
  RootGetters,
  RootActions
>('auth', {
  state: () => {
    return {
      token: authToken,
    }
  },

  getters: {
    isAuth: (state: RootState) => !!state.token,
  },

  actions: {
    authUser(authData: AuthResponse) {
      if (authData) {
        const {
          accessToken,
          expiresInMs,
        } = authData
        this.$patch({
          token: accessToken,
        })
        setStorageItemWithExpiry('authToken', accessToken, expiresInMs)
      }
    },
    logout() {
      this.token = null
      localStorage.removeItem('authToken')
      window.location.reload()
    },
  },
})
