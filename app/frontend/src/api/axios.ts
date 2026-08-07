import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios'
import config from '../config'
import { secureStorage } from '../utils/security'
import type { RefreshResponse } from './types'

/** Custom fields the interceptors read/write on a request config. */
export interface AppAxiosRequestConfig extends InternalAxiosRequestConfig {
  skipAuthRefresh?: boolean
  _retry?: boolean
  retry?: boolean
  __retryCount?: number
}

declare module 'axios' {
  export interface AxiosRequestConfig {
    skipAuthRefresh?: boolean
    _retry?: boolean
    retry?: boolean
    __retryCount?: number
  }
}

const instance: AxiosInstance = axios.create({
  baseURL: config.apiUrl,
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest', // Prevent CSRF
  },
  withCredentials: true, // Include cookies for CSRF protection
})

// Single in-flight refresh so concurrent 401s share one rotation.
let refreshPromise: Promise<string> | null = null

async function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const refreshToken = secureStorage.getRefreshToken()
      if (!refreshToken) {
        throw new Error('No refresh token')
      }
      // Call through this instance with skipAuthRefresh so a failed refresh
      // does not re-enter this interceptor (and avoid importing auth.ts,
      // which would create a circular dependency).
      const { data } = await instance.post<RefreshResponse>(
        '/api/auth/refresh',
        { refresh_token: refreshToken },
        { skipAuthRefresh: true }
      )
      secureStorage.setTokenPair(data.token, data.refresh_token)
      return data.token
    })().finally(() => {
      refreshPromise = null
    })
  }
  return refreshPromise
}

function clearSessionAndRedirect(): void {
  console.warn('Authentication failed - clearing session')
  secureStorage.clearToken()
  if (!window.location.pathname.includes('/login')) {
    window.location.href = '/login'
  }
}

// Request interceptor to add auth token and security headers
instance.interceptors.request.use(
  (requestConfig: InternalAxiosRequestConfig) => {
    const token = secureStorage.getToken()
    if (token) {
      requestConfig.headers.Authorization = `Bearer ${token}`
    }

    requestConfig.headers['X-Request-ID'] =
      `${Date.now()}-${Math.random().toString(36).substring(7)}`

    const csrfToken = sessionStorage.getItem('csrf_token')
    if (csrfToken) {
      requestConfig.headers['X-CSRF-Token'] = csrfToken
    }

    return requestConfig
  },
  (error: unknown) => {
    console.error('Request interceptor error:', error)
    return Promise.reject(error)
  }
)

// Response interceptor for security and error handling
instance.interceptors.response.use(
  (response: AxiosResponse) => {
    if (response.headers['x-powered-by']) {
      console.warn('Server leaking technology information')
    }

    return response
  },
  async (error: AxiosError) => {
    const original = error.config as AppAxiosRequestConfig | undefined
    const status = error.response?.status

    if (
      status === 401 &&
      original &&
      !original.skipAuthRefresh &&
      !original._retry &&
      !original.url?.includes('/api/auth/login') &&
      !original.url?.includes('/api/auth/register') &&
      !original.url?.includes('/api/auth/refresh')
    ) {
      original._retry = true
      try {
        const token = await refreshAccessToken()
        original.headers = original.headers || {}
        original.headers.Authorization = `Bearer ${token}`
        return instance(original)
      } catch (refreshError) {
        clearSessionAndRedirect()
        return Promise.reject(refreshError)
      }
    }

    if (error.response) {
      switch (status) {
        case 401:
          // Refresh already attempted (or skipped) — give up.
          if (!original?.skipAuthRefresh) {
            clearSessionAndRedirect()
          }
          break

        case 403:
          console.error('Access denied - insufficient permissions')
          break

        case 429: {
          const retryAfter = error.response.headers['retry-after'] || 60
          console.warn(`Rate limited. Retry after ${retryAfter} seconds`)
          break
        }

        case 500:
        case 502:
        case 503:
        case 504:
          console.error('Server error occurred')
          break

        default:
          console.error(`HTTP error ${status}:`, error.response.data)
      }
    } else if (error.request) {
      console.error('No response received from server')
    } else {
      console.error('Request setup error:', error.message)
    }

    return Promise.reject(error)
  }
)

// Add retry logic for failed requests
const MAX_RETRIES = 3
const RETRY_DELAY = 1000 // 1 second

instance.interceptors.response.use(undefined, async (error: AxiosError) => {
  const requestConfig = error.config as AppAxiosRequestConfig | undefined

  // Don't retry if no config or already retried max times
  if (!requestConfig || !requestConfig.retry || (requestConfig.__retryCount ?? 0) >= MAX_RETRIES) {
    return Promise.reject(error)
  }

  requestConfig.__retryCount = (requestConfig.__retryCount || 0) + 1

  // Only retry on network errors or 5xx errors
  const shouldRetry =
    !error.response || (error.response.status >= 500 && error.response.status < 600)

  if (!shouldRetry) {
    return Promise.reject(error)
  }

  await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * requestConfig.__retryCount!))

  console.log(`Retrying request (attempt ${requestConfig.__retryCount}/${MAX_RETRIES})`)
  return instance(requestConfig)
})

// Enable retries by default
instance.defaults.retry = true

export default instance
