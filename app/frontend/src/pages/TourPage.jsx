import { useParams, Link, Navigate } from 'react-router'
import { CaretLeft, ShieldWarning, ArrowSquareOut } from '@phosphor-icons/react'
import Layout from '../components/Layout'
import CodeBlock from '../components/tour/CodeBlock'
import { getTourPage } from '../data/tourContent'

const TourPage = () => {
  const { slug } = useParams()
  const page = getTourPage(slug)

  if (!page) {
    return <Navigate to="/tour" replace />
  }

  const Icon = page.icon

  return (
    <Layout>
      <div className="space-y-6">
        <Link
          to="/tour"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary-500 hover:text-primary-700 dark:text-primary-300 dark:hover:text-white"
        >
          <CaretLeft size={16} />
          DevOps Tour
        </Link>

        <div className="flex items-start gap-4">
          <div className="rounded-md bg-primary-50 p-3 text-primary-600 dark:bg-primary-900 dark:text-accent-300">
            <Icon size={28} weight="duotone" />
          </div>
          <div>
            <h1 className="page-title">{page.title}</h1>
            <p className="mt-1 text-sm text-primary-500 dark:text-primary-300">{page.tagline}</p>
          </div>
        </div>

        {page.quickAccess && (
          <div className="card">
            <h2 className="section-title mb-3">Quick access</h2>
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {page.quickAccess.map(item => (
                <div key={item.label}>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-primary-400 dark:text-primary-400">
                    {item.label}
                  </dt>
                  <dd className="mt-1 break-words font-mono text-sm text-primary-700 dark:text-primary-200">
                    {item.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        {page.sections.map(section => (
          <div key={section.heading} className="card space-y-3">
            <h2 className="section-title">{section.heading}</h2>
            {section.body && (
              <p className="text-sm leading-relaxed text-primary-600 dark:text-primary-300">
                {section.body}
              </p>
            )}
            {section.links && (
              <div className="flex flex-wrap gap-2">
                {section.links.map(link => (
                  <a
                    key={link.url}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-md border border-primary-200 px-3 py-1.5 text-sm font-medium text-primary-700 hover:bg-primary-50 dark:border-primary-600 dark:text-primary-200 dark:hover:bg-primary-700"
                  >
                    {link.label}
                    <ArrowSquareOut size={14} />
                  </a>
                ))}
              </div>
            )}
            {section.commands?.map((cmd, i) => (
              <CodeBlock key={i} label={cmd.label} code={cmd.code} />
            ))}
          </div>
        ))}

        {page.security && (
          <div className="card space-y-3 border-red-200 bg-red-50/60 dark:border-red-900 dark:bg-red-950/40">
            <div className="flex items-center gap-2">
              <ShieldWarning size={22} weight="duotone" className="text-red-700 dark:text-red-300" />
              <h2 className="section-title">Things to watch out for</h2>
            </div>
            <ul className="space-y-2 text-sm text-primary-700 dark:text-primary-200">
              {page.security.map((note, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-red-600 dark:text-red-400">&bull;</span>
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="text-xs text-primary-400 dark:text-primary-400">
          Full guide: <code className="font-mono">{page.guidePath}</code> in the repo.
        </p>
      </div>
    </Layout>
  )
}

export default TourPage
