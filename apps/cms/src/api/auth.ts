import type { User } from '@packages/database'
import axios from 'axios'

export interface RegisterBody {
  email: string
  password: string
  name?: string
}

export interface LoginBody {
  email: string
  password: string
}

export interface AuthResponse {
  user: Pick<User, 'id' | 'email'>
  accessToken: string
  expiresInMs: number
}

export const register = async (
  abortController: AbortController,
  body?: RegisterBody,
): Promise<AuthResponse> => {
  const { data } = await axios.post<AuthResponse>('/auth/register', body, {
    signal: abortController.signal,
  })
  return data
}

export const login = async (
  abortController: AbortController,
  body?: LoginBody,
): Promise<AuthResponse> => {
  const { data } = await axios.post<AuthResponse>('/auth/login', body, {
    signal: abortController.signal,
  })
  return data
}
