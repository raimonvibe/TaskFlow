import { Link } from 'react-router'

const NotFound = () => {
  return (
    <div className="auth-shell relative">
      <div className="relative z-10 flex flex-1 items-center justify-center px-4 py-12">
        <div className="text-center max-w-md">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent-300 mb-3">
            Campus
          </p>
          <h1 className="font-serif text-7xl font-bold text-white mb-4">404</h1>
          <h2 className="font-serif text-2xl font-semibold text-primary-50 mb-4">
            Page Not Found
          </h2>
          <p className="text-primary-200 mb-8">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
          <Link to="/dashboard" className="btn btn-accent">
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}

export default NotFound
