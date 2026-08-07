// Token storage helper. This used to sit alongside ~300 lines of unused
// exports (sanitizeInput, CSRF token generation, clickjacking detection,
// session timeout, password strength meters, etc.) that were never imported
// anywhere in the app - only secureStorage below was actually wired up
// (AuthContext, api/auth.js, api/axios.js). Trimmed to what's real.
export const secureStorage = {
  // Store token securely.
  // Note: sessionStorage is readable by any script on the page, so this
  // does not protect against XSS-based token theft - only an httpOnly
  // cookie set by the backend would. That's a bigger change (backend would
  // need to set the cookie on login/register instead of returning the token
  // in the JSON body), left as a follow-up rather than bundled here.
  setToken: token => {
    try {
      sessionStorage.setItem('auth_token', token)
      const expiryTime = Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
      sessionStorage.setItem('token_expiry', expiryTime.toString())
    } catch (error) {
      console.error('Failed to store token:', error)
    }
  },

  // Retrieve token
  getToken: () => {
    try {
      const token = sessionStorage.getItem('auth_token')
      const expiry = sessionStorage.getItem('token_expiry')

      // Check if token expired
      if (expiry && Date.now() > parseInt(expiry)) {
        secureStorage.clearToken()
        return null
      }

      return token
    } catch (error) {
      console.error('Failed to retrieve token:', error)
      return null
    }
  },

  // Clear token
  clearToken: () => {
    try {
      sessionStorage.removeItem('auth_token')
      sessionStorage.removeItem('token_expiry')
      sessionStorage.removeItem('user')
    } catch (error) {
      console.error('Failed to clear token:', error)
    }
  },

  // Check if token exists and is valid
  hasValidToken: () => {
    const token = secureStorage.getToken()
    return token !== null && token !== undefined && token !== ''
  },
}
