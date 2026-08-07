import {
  createContext,
  useState,
  useContext,
  type PropsWithChildren,
  type ReactElement,
} from 'react'
import { jwtDecode } from 'jwt-decode'
import { authAPI } from '../api/auth'
import type { AuthCredentialsResponse, AuthUser } from '../api/types'
import { secureStorage } from '../utils/security'

interface AccessTokenPayload {
  exp?: number
}

interface AuthContextValue {
  user: AuthUser | null
  login: (email: string, password: string) => Promise<AuthCredentialsResponse>
  register: (name: string, email: string, password: string) => Promise<AuthCredentialsResponse>
  logout: () => void
  isAuthenticated: boolean
  loading: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

function readInitialUser(): AuthUser | null {
  const token = secureStorage.getToken()
  const refreshToken = secureStorage.getRefreshToken()
  const savedUser = sessionStorage.getItem('user')

  if (token) {
    try {
      const decoded = jwtDecode<AccessTokenPayload>(token)
      if (decoded.exp !== undefined && decoded.exp * 1000 >= Date.now()) {
        return savedUser ? (JSON.parse(savedUser) as AuthUser) : null
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
      return JSON.parse(savedUser) as AuthUser
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
export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }: PropsWithChildren): ReactElement => {
  const [user, setUser] = useState<AuthUser | null>(() => readInitialUser())

  const login = async (email: string, password: string): Promise<AuthCredentialsResponse> => {
    const data = await authAPI.login(email, password)
    secureStorage.setTokenPair(data.token, data.refresh_token)
    sessionStorage.setItem('user', JSON.stringify(data.user))
    setUser(data.user)
    return data
  }

  const register = async (
    name: string,
    email: string,
    password: string
  ): Promise<AuthCredentialsResponse> => {
    const data = await authAPI.register(name, email, password)
    secureStorage.setTokenPair(data.token, data.refresh_token)
    sessionStorage.setItem('user', JSON.stringify(data.user))
    setUser(data.user)
    return data
  }

  const logout = (): void => {
    // Fire-and-forget: don't block navigation on the network round trip.
    // authAPI.logout() clears local storage in its own finally block even
    // if the server call fails.
    void authAPI.logout()
    setUser(null)
  }

  const value: AuthContextValue = {
    user,
    login,
    register,
    logout,
    isAuthenticated: !!user,
    loading: false,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
