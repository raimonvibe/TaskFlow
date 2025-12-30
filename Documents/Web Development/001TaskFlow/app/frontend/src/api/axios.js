import axios from 'axios'
import config from '../config'

const instance = axios.create({
  baseURL: config.apiUrl,
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest', // Prevent CSRF
  },
  withCredentials: true, // Include httpOnly cookies automatically
})

// Helper function to get cookie value
const getCookie = name => {
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) return parts.pop().split(';').shift()
  return null
}

// Request interceptor to add security headers
instance.interceptors.request.use(
  config => {
    // NOTE: Authentication now uses httpOnly cookies automatically sent by browser
    // No need to manually add Authorization header

    // Add request timestamp for replay attack prevention
    config.headers['X-Request-ID'] = `${Date.now()}-${Math.random().toString(36).substring(7)}`

    // Add CSRF token from cookie (not httpOnly, so we can read it)
    const csrfToken = getCookie('csrf_token')
    if (csrfToken) {
      config.headers['X-CSRF-Token'] = csrfToken
    }

    return config
  },
  error => {
    console.error('Request interceptor error:', error)
    return Promise.reject(error)
  }
)

// Response interceptor for security and error handling
instance.interceptors.response.use(
  response => {
    // Check for suspicious response headers
    if (response.headers['x-powered-by']) {
      console.warn('Server leaking technology information')
    }

    return response
  },
  error => {
    // Handle different error scenarios
    if (error.response) {
      const status = error.response.status

      switch (status) {
        case 401:
          // Unauthorized - redirect to login
          // Cookie will be cleared by backend or expired
          console.warn('Authentication failed - redirecting to login')

          // Prevent redirect loop
          if (!window.location.pathname.includes('/login')) {
            window.location.href = '/login'
          }
          break

        case 403:
          // Forbidden - insufficient permissions
          console.error('Access denied - insufficient permissions')
          break

        case 429: {
          // Rate limited
          const retryAfter = error.response.headers['retry-after'] || 60
          console.warn(`Rate limited. Retry after ${retryAfter} seconds`)
          break
        }

        case 500:
        case 502:
        case 503:
        case 504:
          // Server errors
          console.error('Server error occurred')
          break

        default:
          console.error(`HTTP error ${status}:`, error.response.data)
      }
    } else if (error.request) {
      // Request made but no response received
      console.error('No response received from server')
    } else {
      // Error in request setup
      console.error('Request setup error:', error.message)
    }

    return Promise.reject(error)
  }
)

// Add retry logic for failed requests
const MAX_RETRIES = 3
const RETRY_DELAY = 1000 // 1 second

instance.interceptors.response.use(undefined, async error => {
  const config = error.config

  // Don't retry if no config or already retried max times
  if (!config || !config.retry || config.__retryCount >= MAX_RETRIES) {
    return Promise.reject(error)
  }

  // Increment retry count
  config.__retryCount = config.__retryCount || 0
  config.__retryCount++

  // Only retry on network errors or 5xx errors
  const shouldRetry =
    !error.response || (error.response.status >= 500 && error.response.status < 600)

  if (!shouldRetry) {
    return Promise.reject(error)
  }

  // Wait before retrying
  await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * config.__retryCount))

  console.log(`Retrying request (attempt ${config.__retryCount}/${MAX_RETRIES})`)
  return instance(config)
})

// Enable retries by default
instance.defaults.retry = true

export default instance
