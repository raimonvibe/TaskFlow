import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router'
import { CaretDown, List, X } from '@phosphor-icons/react'
import { useAuth } from '../contexts/AuthContext'
import Footer from './Footer'
import ThemeToggle from './ThemeToggle'
import { TOUR_PAGES } from '../data/tourContent'

const navLinkClasses = (active, extra = '') =>
  `px-3 py-2 rounded-md text-sm font-medium transition-colors ${extra} ${
    active
      ? 'bg-white/15 text-white border-b-2 border-accent-400'
      : 'text-primary-100 hover:bg-white/10 hover:text-white'
  }`

const Layout = ({ children }) => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [tourOpen, setTourOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const tourRef = useRef(null)

  const isActive = path => location.pathname === path
  const isTourActive = location.pathname.startsWith('/tour')

  const closeMenus = () => {
    setTourOpen(false)
    setMobileOpen(false)
  }

  // Close the desktop dropdown on outside click or Escape.
  useEffect(() => {
    if (!tourOpen) return

    const handleClick = event => {
      if (tourRef.current && !tourRef.current.contains(event.target)) {
        setTourOpen(false)
      }
    }
    const handleKey = event => {
      if (event.key === 'Escape') setTourOpen(false)
    }

    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [tourOpen])

  const handleLogout = () => {
    logout()
    navigate('/login')
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

              <nav className="hidden md:flex items-center space-x-1">
                <Link
                  to="/dashboard"
                  onClick={closeMenus}
                  className={navLinkClasses(isActive('/dashboard'))}
                >
                  Dashboard
                </Link>
                <Link to="/tasks" onClick={closeMenus} className={navLinkClasses(isActive('/tasks'))}>
                  Tasks
                </Link>

                <div className="relative" ref={tourRef}>
                  <button
                    type="button"
                    onClick={() => setTourOpen(open => !open)}
                    aria-haspopup="menu"
                    aria-expanded={tourOpen}
                    className={navLinkClasses(isTourActive, 'inline-flex items-center gap-1')}
                  >
                    DevOps Tour
                    <CaretDown
                      size={14}
                      weight="bold"
                      className={`transition-transform ${tourOpen ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {tourOpen && (
                    <div
                      role="menu"
                      className="absolute left-0 top-full z-20 mt-2 w-64 overflow-hidden rounded-md border border-primary-100 bg-white py-1 shadow-lg dark:border-primary-600 dark:bg-primary-800"
                    >
                      <Link
                        to="/tour"
                        role="menuitem"
                        onClick={closeMenus}
                        className="block px-4 py-2 text-sm font-medium text-primary-700 hover:bg-primary-50 dark:text-primary-100 dark:hover:bg-primary-700"
                      >
                        Overview
                      </Link>
                      <div className="my-1 border-t border-primary-100 dark:border-primary-600" />
                      {TOUR_PAGES.map(page => (
                        <Link
                          key={page.slug}
                          to={`/tour/${page.slug}`}
                          role="menuitem"
                          onClick={closeMenus}
                          className="block px-4 py-2 text-sm text-primary-600 hover:bg-primary-50 dark:text-primary-200 dark:hover:bg-primary-700"
                        >
                          {page.title}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </nav>
            </div>

            <div className="flex items-center space-x-2 sm:space-x-4">
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
              <button
                type="button"
                onClick={() => setMobileOpen(open => !open)}
                aria-expanded={mobileOpen}
                aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
                className="md:hidden rounded-md p-2 text-white hover:bg-white/10"
              >
                {mobileOpen ? <X size={22} /> : <List size={22} />}
              </button>
            </div>
          </div>

          {mobileOpen && (
            <nav className="md:hidden space-y-1 border-t border-white/10 pb-4 pt-2">
              <Link
                to="/dashboard"
                onClick={closeMenus}
                className={navLinkClasses(isActive('/dashboard'), 'block')}
              >
                Dashboard
              </Link>
              <Link
                to="/tasks"
                onClick={closeMenus}
                className={navLinkClasses(isActive('/tasks'), 'block')}
              >
                Tasks
              </Link>

              <div className="px-3 pt-2 text-xs font-semibold uppercase tracking-widest text-primary-200">
                DevOps Tour
              </div>
              <Link
                to="/tour"
                onClick={closeMenus}
                className={navLinkClasses(location.pathname === '/tour', 'block')}
              >
                Overview
              </Link>
              {TOUR_PAGES.map(page => (
                <Link
                  key={page.slug}
                  to={`/tour/${page.slug}`}
                  onClick={closeMenus}
                  className={navLinkClasses(isActive(`/tour/${page.slug}`), 'block pl-6')}
                >
                  {page.title}
                </Link>
              ))}
            </nav>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>

      <Footer />
    </div>
  )
}

export default Layout
