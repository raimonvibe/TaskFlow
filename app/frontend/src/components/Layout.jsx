import { Link, useNavigate, useLocation } from 'react-router'
import { useAuth } from '../contexts/AuthContext'
import Footer from './Footer'
import ThemeToggle from './ThemeToggle'

const Layout = ({ children }) => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const isActive = path => {
    return location.pathname === path
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-primary-600 text-white border-b-4 border-accent-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <div className="flex items-baseline gap-2">
                <h1 className="font-serif text-2xl font-bold tracking-tight text-white">
                  TaskFlow
                </h1>
                <span className="hidden sm:inline text-xs uppercase tracking-widest text-accent-300">
                  Campus
                </span>
              </div>
              <nav className="hidden md:flex space-x-1">
                <Link
                  to="/dashboard"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive('/dashboard')
                      ? 'bg-white/15 text-white border-b-2 border-accent-400'
                      : 'text-primary-100 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  Dashboard
                </Link>
                <Link
                  to="/tasks"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive('/tasks')
                      ? 'bg-white/15 text-white border-b-2 border-accent-400'
                      : 'text-primary-100 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  Tasks
                </Link>
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              <span className="hidden text-sm text-primary-100 sm:inline">
                Welcome, <span className="font-medium text-white">{user?.name}</span>
              </span>
              <ThemeToggle />
              <button
                onClick={handleLogout}
                className="btn text-sm bg-white/10 text-white border border-white/20 hover:bg-white/20"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>

      <Footer />
    </div>
  )
}

export default Layout
