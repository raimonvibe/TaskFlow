// Token storage helper. This used to sit alongside ~300 lines of unused
// exports (sanitizeInput, CSRF token generation, clickjacking detection,
// session timeout, password strength meters, etc.) that were never imported
// anywhere in the app - only secureStorage below was actually wired up
// (AuthContext, api/auth, api/axios). Trimmed to what's real.
const ACCESS_TOKEN_TTL_MS = 15 * 60 * 1000 // keep in sync with backend JWT_EXPIRE default

export const secureStorage = {
  // Store access token securely.
  // Note: sessionStorage is readable by any script on the page, so this
  // does not protect against XSS-based token theft - only an httpOnly
  // cookie set by the backend would. That's a bigger change (backend would
  // need to set the cookie on login/register instead of returning the token
  // in the JSON body), left as a follow-up rather than bundled here.
  setToken(token: string): void {
    try {
      sessionStorage.setItem('auth_token', token)
      const expiryTime = Date.now() + ACCESS_TOKEN_TTL_MS
      sessionStorage.setItem('token_expiry', expiryTime.toString())
    } catch (error) {
      console.error('Failed to store token:', error)
    }
  },

  setRefreshToken(refreshToken: string | null | undefined): void {
    try {
      if (refreshToken) {
        sessionStorage.setItem('refresh_token', refreshToken)
      } else {
        sessionStorage.removeItem('refresh_token')
      }
    } catch (error) {
      console.error('Failed to store refresh token:', error)
    }
  },

  setTokenPair(accessToken: string, refreshToken: string): void {
    secureStorage.setToken(accessToken)
    secureStorage.setRefreshToken(refreshToken)
  },

  getToken(): string | null {
    try {
      const token = sessionStorage.getItem('auth_token')
      const expiry = sessionStorage.getItem('token_expiry')

      // Check if token expired
      if (expiry && Date.now() > parseInt(expiry, 10)) {
        // Access token only — keep the refresh token so the interceptor can rotate.
        sessionStorage.removeItem('auth_token')
        sessionStorage.removeItem('token_expiry')
        return null
      }

      return token
    } catch (error) {
      console.error('Failed to retrieve token:', error)
      return null
    }
  },

  getRefreshToken(): string | null {
    try {
      return sessionStorage.getItem('refresh_token')
    } catch (error) {
      console.error('Failed to retrieve refresh token:', error)
      return null
    }
  },

  clearToken(): void {
    try {
      sessionStorage.removeItem('auth_token')
      sessionStorage.removeItem('token_expiry')
      sessionStorage.removeItem('refresh_token')
      sessionStorage.removeItem('user')
    } catch (error) {
      console.error('Failed to clear token:', error)
    }
  },

  hasValidToken(): boolean {
    const token = secureStorage.getToken()
    return token !== null && token !== undefined && token !== ''
  },
}
