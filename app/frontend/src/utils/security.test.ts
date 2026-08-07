import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { secureStorage } from './security'

describe('secureStorage', () => {
  beforeEach(() => {
    sessionStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-01T12:00:00.000Z'))
  })

  afterEach(() => {
    sessionStorage.clear()
    vi.useRealTimers()
  })

  it('stores and returns an access token within its client TTL', () => {
    secureStorage.setToken('access-1')
    expect(secureStorage.getToken()).toBe('access-1')
    expect(secureStorage.hasValidToken()).toBe(true)
  })

  it('drops only the access token after the client TTL, keeping refresh', () => {
    secureStorage.setTokenPair('access-1', 'refresh-1')
    vi.advanceTimersByTime(15 * 60 * 1000 + 1)

    expect(secureStorage.getToken()).toBeNull()
    expect(secureStorage.getRefreshToken()).toBe('refresh-1')
  })

  it('clearToken removes access, refresh, and cached user', () => {
    secureStorage.setTokenPair('access-1', 'refresh-1')
    sessionStorage.setItem('user', '{"id":1}')
    secureStorage.clearToken()

    expect(secureStorage.getToken()).toBeNull()
    expect(secureStorage.getRefreshToken()).toBeNull()
    expect(sessionStorage.getItem('user')).toBeNull()
  })
})
