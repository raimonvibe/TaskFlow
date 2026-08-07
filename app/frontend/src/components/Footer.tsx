import { Link } from 'react-router'
import SocialIcon from './SocialIcon'
import { SOCIAL_LINKS } from '../data/socialLinks'

const Footer = () => {
  const year = new Date().getFullYear()

  return (
    <footer className="bg-primary-700 text-primary-100 border-t-4 border-accent-400 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-12">
          {/* Brand */}
          <div className="md:col-span-5">
            <div className="flex items-baseline gap-2">
              <h2 className="font-serif text-2xl font-bold tracking-tight text-white">
                TaskFlow
              </h2>
              <span className="text-xs uppercase tracking-widest text-accent-300">Campus</span>
            </div>
            <p className="mt-4 max-w-sm font-serif text-base italic leading-relaxed text-primary-100/90">
              &ldquo;A learning hall for the full craft of DevOps &mdash; from first commit to
              production deploy.&rdquo;
            </p>
            <div className="mt-6 flex items-center gap-3">
              {SOCIAL_LINKS.map(link => (
                <SocialIcon key={link.id} link={link} />
              ))}
            </div>
          </div>

          {/* Navigate */}
          <div className="md:col-span-3">
            <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-accent-300">
              Navigate
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <Link to="/dashboard" className="hover:text-white transition-colors">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link to="/tasks" className="hover:text-white transition-colors">
                  Tasks
                </Link>
              </li>
              <li>
                <a
                  href="https://github.com/raimonvibe/TaskFlow"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors"
                >
                  Source &amp; Docs
                </a>
              </li>
            </ul>
          </div>

          {/* Built with */}
          <div className="md:col-span-4">
            <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-accent-300">
              Built With
            </h3>
            <p className="mt-4 text-sm leading-relaxed text-primary-100/90">
              React &amp; Vite · Node.js &amp; Express · PostgreSQL · Docker &amp; Kubernetes ·
              Terraform &amp; Ansible · Prometheus &amp; Grafana
            </p>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center gap-3 border-t border-accent-400/20 pt-6 text-xs text-primary-300 sm:flex-row sm:justify-between">
          <p>&copy; {year} TaskFlow &middot; DevOps Learning Project</p>
          <p className="font-serif italic tracking-wide text-primary-200">
            Per commit, ad astra
          </p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
