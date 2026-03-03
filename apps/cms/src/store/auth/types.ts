import type { AuthResponse } from '@/api/auth'

export interface RootState {
  token: string | null
}

export type RootGetters = {
  isAuth: (state: RootState) => boolean
}

export interface RootActions {
  logout: () => void
  authUser: (authData: AuthResponse) => void
}
