import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { AxiosAdapter, InternalAxiosRequestConfig } from 'axios'
import instance from './axios'
import { secureStorage } from '../utils/security'

/**
 * Exercises the real axios instance's 401 → refresh → retry path with a
 * fake adapter (no network). This is the regression test for Option A /
 * Option B auth-client work: a unit test of authAPI alone cannot catch a
 * broken interceptor.
 */
describe('axios 401 refresh interceptor', () => {
  let originalAdapter: AxiosAdapter | undefined
  let hrefSpy: string

  beforeEach(() => {
    sessionStorage.clear()
    originalAdapter = instance.defaults.adapter as AxiosAdapter | undefined
    // Disable the 5xx retry interceptor noise for these cases.
    instance.defaults.retry = false

    hrefSpy = '/tasks'
    vi.stubGlobal('location', {
      pathname: '/tasks',
      get href() {
        return hrefSpy
      },
      set href(value: string) {
        hrefSpy = value
      },
    })
  })

  afterEach(() => {
    if (originalAdapter) {
      instance.defaults.adapter = originalAdapter
    }
    instance.defaults.retry = true
    sessionStorage.clear()
    vi.unstubAllGlobals()
  })

  function jsonResponse(config: InternalAxiosRequestConfig, status: number, data: unknown) {
    return {
      data,
      status,
      statusText: status === 200 ? 'OK' : 'Error',
      headers: {},
      config,
    }
  }

  it('refreshes and retries the original request on 401', async () => {
    secureStorage.setRefreshToken('refresh-1')
    let taskCalls = 0

    instance.defaults.adapter = async config => {
      if (config.url?.includes('/api/auth/refresh')) {
        const body = typeof config.data === 'string' ? JSON.parse(config.data) : config.data
        expect(body).toEqual({ refresh_token: 'refresh-1' })
        return jsonResponse(config, 200, {
          message: 'Token refreshed',
          token: 'new-access',
          refresh_token: 'refresh-2',
        })
      }

      if (config.url?.includes('/api/tasks')) {
        taskCalls += 1
        if (taskCalls === 1) {
          const error = Object.assign(new Error('Unauthorized'), {
            isAxiosError: true,
            config,
            response: {
              status: 401,
              data: { message: 'Unauthorized' },
              headers: {},
              statusText: 'Unauthorized',
              config,
            },
          })
          return Promise.reject(error)
        }
        expect(config.headers?.Authorization).toBe('Bearer new-access')
        return jsonResponse(config, 200, { tasks: [], count: 0 })
      }

      throw new Error(`Unexpected URL: ${config.url}`)
    }

    const res = await instance.get('/api/tasks')

    expect(res.status).toBe(200)
    expect(res.data).toEqual({ tasks: [], count: 0 })
    expect(taskCalls).toBe(2)
    expect(secureStorage.getToken()).toBe('new-access')
    expect(secureStorage.getRefreshToken()).toBe('refresh-2')
    expect(hrefSpy).toBe('/tasks')
  })

  it('clears the session and redirects when refresh fails', async () => {
    secureStorage.setTokenPair('stale-access', 'bad-refresh')

    instance.defaults.adapter = async config => {
      if (config.url?.includes('/api/auth/refresh')) {
        const error = Object.assign(new Error('Invalid refresh token'), {
          isAxiosError: true,
          config,
          response: {
            status: 401,
            data: { message: 'Invalid refresh token' },
            headers: {},
            statusText: 'Unauthorized',
            config,
          },
        })
        return Promise.reject(error)
      }

      if (config.url?.includes('/api/tasks')) {
        const error = Object.assign(new Error('Unauthorized'), {
          isAxiosError: true,
          config,
          response: {
            status: 401,
            data: { message: 'Unauthorized' },
            headers: {},
            statusText: 'Unauthorized',
            config,
          },
        })
        return Promise.reject(error)
      }

      throw new Error(`Unexpected URL: ${config.url}`)
    }

    await expect(instance.get('/api/tasks')).rejects.toBeTruthy()
    expect(secureStorage.getToken()).toBeNull()
    expect(secureStorage.getRefreshToken()).toBeNull()
    expect(hrefSpy).toBe('/login')
  })

  it('does not attempt refresh for login 401s', async () => {
    let refreshCalls = 0

    instance.defaults.adapter = async config => {
      if (config.url?.includes('/api/auth/refresh')) {
        refreshCalls += 1
        return jsonResponse(config, 200, {
          token: 'x',
          refresh_token: 'y',
        })
      }

      const error = Object.assign(new Error('Invalid credentials'), {
        isAxiosError: true,
        config,
        response: {
          status: 401,
          data: { message: 'Invalid credentials' },
          headers: {},
          statusText: 'Unauthorized',
          config,
        },
      })
      return Promise.reject(error)
    }

    await expect(
      instance.post('/api/auth/login', { email: 'a@b.com', password: 'x' })
    ).rejects.toBeTruthy()
    expect(refreshCalls).toBe(0)
  })
})
