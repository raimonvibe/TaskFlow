import { createContext, useState, useContext } from 'react'
import { jwtDecode } from 'jwt-decode'
import { authAPI } from '../api/auth'
import { secureStorage } from '../utils/security'

const AuthContext = createContext(null)

function readInitialUser() {
  const token = secureStorage.getToken()
  const refreshToken = secureStorage.getRefreshToken()
  const savedUser = sessionStorage.getItem('user')

  if (token) {
    try {
      const decoded = jwtDecode(token)
      if (decoded.exp * 1000 >= Date.now()) {
        return savedUser ? JSON.parse(savedUser) : null
      }
      // Access JWT expired — drop it but keep refresh so the interceptor can rotate.
      sessionStorage.removeItem('auth_token')
      sessionStorage.removeItem('token_expiry')
    } catch {
      sessionStorage.removeItem('auth_token')
      sessionStorage.removeItem('token_expiry')
    }
  }

  // Still authenticated if a refresh token remains; the next API call will rotate.
  if (refreshToken && savedUser) {
    try {
      return JSON.parse(savedUser)
    } catch {
      secureStorage.clearToken()
      return null
    }
  }

  if (!token && !refreshToken) {
    return null
  }

  secureStorage.clearToken()
  return null
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => readInitialUser())

  const login = async (email, password) => {
    const data = await authAPI.login(email, password)
    secureStorage.setTokenPair(data.token, data.refresh_token)
    sessionStorage.setItem('user', JSON.stringify(data.user))
    setUser(data.user)
    return data
  }

  const register = async (name, email, password) => {
    const data = await authAPI.register(name, email, password)
    secureStorage.setTokenPair(data.token, data.refresh_token)
    sessionStorage.setItem('user', JSON.stringify(data.user))
    setUser(data.user)
    return data
  }

  const logout = () => {
    // Fire-and-forget: don't block navigation on the network round trip.
    // authAPI.logout() clears local storage in its own finally block even
    // if the server call fails.
    authAPI.logout()
    setUser(null)
  }

  const value = {
    user,
    login,
    register,
    logout,
    isAuthenticated: !!user,
    loading: false,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
