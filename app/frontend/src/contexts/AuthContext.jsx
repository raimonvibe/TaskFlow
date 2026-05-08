import { createContext, useState, useContext } from 'react'
import { jwtDecode } from 'jwt-decode'
import { authAPI } from '../api/auth'
import { secureStorage } from '../utils/security'

const AuthContext = createContext(null)

function readInitialUser() {
  const token = secureStorage.getToken()
  if (!token) return null
  try {
    const decoded = jwtDecode(token)
    if (decoded.exp * 1000 < Date.now()) {
      secureStorage.clearToken()
      return null
    }
    const savedUser = sessionStorage.getItem('user')
    return savedUser ? JSON.parse(savedUser) : null
  } catch {
    secureStorage.clearToken()
    return null
  }
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
    secureStorage.setToken(data.token)
    sessionStorage.setItem('user', JSON.stringify(data.user))
    setUser(data.user)
    return data
  }

  const register = async (name, email, password) => {
    const data = await authAPI.register(name, email, password)
    secureStorage.setToken(data.token)
    sessionStorage.setItem('user', JSON.stringify(data.user))
    setUser(data.user)
    return data
  }

  const logout = () => {
    secureStorage.clearToken()
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
