import { useTheme } from '../contexts/ThemeContext'

const ThemeToggle = ({ className = '' }) => {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-pressed={isDark}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/20 text-accent-300 transition-colors duration-200 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-300 ${className}`}
    >
      {isDark ? (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="4.6" fill="currentColor" />
          <g stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <path d="M12 1.6v2.6M12 19.8v2.6M22.4 12h-2.6M4.2 12H1.6" />
            <path d="M19.07 4.93l-1.84 1.84M6.77 17.23l-1.84 1.84M19.07 19.07l-1.84-1.84M6.77 6.77 4.93 4.93" />
          </g>
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
          <path
            d="M20.5 14.6A8.6 8.6 0 0 1 9.4 3.5a8.6 8.6 0 1 0 11.1 11.1Z"
            fill="currentColor"
          />
        </svg>
      )}
    </button>
  )
}

export default ThemeToggle
