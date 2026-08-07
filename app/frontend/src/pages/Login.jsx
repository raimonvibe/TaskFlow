import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useAuth } from '../contexts/AuthContext'
import ThemeToggle from '../components/ThemeToggle'

const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(email, password)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to login. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-shell relative">
      <div className="absolute right-4 top-4 z-20 sm:right-6 sm:top-6">
        <ThemeToggle />
      </div>
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          <div className="mb-10 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent-300 mb-3">
              Student portal
            </p>
            <h1 className="font-serif text-5xl font-bold text-white tracking-tight">TaskFlow</h1>
            <p className="mt-3 text-primary-100 text-base">
              Sign in to manage your coursework and DevOps lab tasks.
            </p>
          </div>

          <div className="bg-campus border border-accent-400/40 rounded-md p-8 shadow-none">
            <h2 className="font-serif text-2xl font-semibold text-ink mb-6">Sign in</h2>

            <form className="space-y-5" onSubmit={handleSubmit}>
              {error && (
                <div className="bg-red-50 border border-red-300 text-red-800 px-4 py-3 rounded-md text-sm dark:bg-red-950 dark:border-red-800 dark:text-red-300">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="email" className="label">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="input"
                  placeholder="you@university.edu"
                />
              </div>
              <div>
                <label htmlFor="password" className="label">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="input"
                  placeholder="••••••••"
                />
              </div>

              <button type="submit" disabled={loading} className="w-full btn btn-primary">
                {loading ? 'Signing in...' : 'Sign in'}
              </button>

              <p className="text-center text-sm text-primary-500 dark:text-primary-300">
                Don&apos;t have an account?{' '}
                <Link
                  to="/register"
                  className="font-semibold text-primary-600 hover:text-accent-600 dark:text-accent-300 dark:hover:text-accent-200"
                >
                  Register
                </Link>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login
