import axios from './axios'
import { secureStorage } from '../utils/security'
import type { AuthCredentialsResponse, CurrentUserResponse, RefreshResponse } from './types'

export const authAPI = {
  login: async (email: string, password: string): Promise<AuthCredentialsResponse> => {
    const response = await axios.post<AuthCredentialsResponse>('/api/auth/login', {
      email,
      password,
    })
    return response.data
  },

  register: async (
    name: string,
    email: string,
    password: string
  ): Promise<AuthCredentialsResponse> => {
    const response = await axios.post<AuthCredentialsResponse>('/api/auth/register', {
      name,
      email,
      password,
    })
    return response.data
  },

  refresh: async (refreshToken: string): Promise<RefreshResponse> => {
    const response = await axios.post<RefreshResponse>(
      '/api/auth/refresh',
      { refresh_token: refreshToken },
      { skipAuthRefresh: true }
    )
    return response.data
  },

  getCurrentUser: async (): Promise<CurrentUserResponse> => {
    const response = await axios.get<CurrentUserResponse>('/api/auth/me')
    return response.data
  },

  logout: async (): Promise<void> => {
    // Revoke the token server-side (blacklist it) before clearing it locally -
    // previously logout only cleared local storage, so a copied/leaked token
    // stayed valid on the backend for its full life even after "logging out".
    // Always clear local storage regardless of whether the request succeeds,
    // so the user is logged out client-side even if the backend is down.
    try {
      await axios.post('/api/auth/logout')
    } catch (error) {
      console.error('Server-side logout failed:', error)
    } finally {
      secureStorage.clearToken()
    }
  },
}
