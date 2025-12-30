import { createContext, useState, useContext, useEffect } from 'react'
import { authAPI } from '../api/auth'

const AuthContext = createContext(null)

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if user is already logged in using httpOnly cookie
    // We can't read the cookie directly (that's the point of httpOnly!)
    // So we call the /me endpoint to validate the session
    const checkAuth = async () => {
      try {
        const data = await authAPI.getCurrentUser()
        setUser(data.user)
      } catch (error) {
        // Not authenticated or session expired
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [])

  const login = async (email, password) => {
    const data = await authAPI.login(email, password)
    // Backend sets httpOnly cookie, so we don't need to store token
    setUser(data.user)
    return data
  }

  const register = async (name, email, password) => {
    const data = await authAPI.register(name, email, password)
    // Backend sets httpOnly cookie, so we don't need to store token
    setUser(data.user)
    return data
  }

  const logout = async () => {
    try {
      await authAPI.logout()
    } catch (error) {
      // Even if logout API fails, clear local state
      console.error('Logout API error:', error)
    }
    setUser(null)
  }

  const value = {
    user,
    login,
    register,
    logout,
    isAuthenticated: !!user,
    loading,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
