import type { PropsWithChildren, ReactElement } from 'react'
import { Navigate } from 'react-router'
import { useAuth } from '../contexts/AuthContext'

const PrivateRoute = ({ children }: PropsWithChildren): ReactElement => {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    )
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

export default PrivateRoute
