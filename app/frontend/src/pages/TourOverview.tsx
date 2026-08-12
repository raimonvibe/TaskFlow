import type { ReactElement } from 'react'
import { Link } from 'react-router'
import { Compass, ShieldCheck, Lifebuoy } from '@phosphor-icons/react'
import Layout from '../components/Layout'
import CodeBlock from '../components/tour/CodeBlock'
import { TOUR_PAGES, DEBUG_PROMPT_TEMPLATE } from '../data/tourContent'

const TourOverview = (): ReactElement => {
  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-start gap-4">
          <div className="rounded-md bg-primary-50 p-3 text-primary-600 dark:bg-primary-900 dark:text-accent-300">
            <Compass size={28} weight="duotone" />
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-accent-600 dark:text-accent-300">
              Field Guide
            </p>
            <h1 className="page-title">DevOps Tour</h1>
            <p className="mt-1 max-w-2xl text-sm text-primary-500 dark:text-primary-300">
              TaskFlow doubles as a learning project for the tools around it, not just the app
              itself. Pick a tool below for real commands and a short walkthrough - all sourced
              from the longer guides in this repo&apos;s docs/TOOL-GUIDES/ folder.
            </p>
          </div>
        </div>

        <div className="card flex items-start gap-3 border-accent-300/60 bg-accent-50/60 dark:bg-primary-900/60">
          <ShieldCheck
            size={22}
            weight="duotone"
            className="mt-0.5 flex-shrink-0 text-accent-600 dark:text-accent-300"
          />
          <p className="text-sm text-primary-700 dark:text-primary-200">
            These pages are reference material only - static text and copy-paste commands you run
            yourself, on your own machine. Nothing here fetches from localhost automatically or
            embeds a live dashboard, and no real production credentials appear anywhere on this
            site. Each tool page ends with the specific things to watch out for with that tool.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TOUR_PAGES.map(page => {
            const Icon = page.icon
            return (
              <Link
                key={page.slug}
                to={`/tour/${page.slug}`}
                className="card flex flex-col gap-3 transition-shadow hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-300"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-md bg-primary-50 p-2.5 text-primary-600 dark:bg-primary-900 dark:text-accent-300">
                    <Icon size={24} weight="duotone" />
                  </div>
                  <h2 className="section-title">{page.title}</h2>
                </div>
                <p className="text-sm text-primary-500 dark:text-primary-300">{page.tagline}</p>
              </Link>
            )
          })}
        </div>

        <div id="stuck" className="card scroll-mt-24 space-y-3">
          <div className="flex items-center gap-2">
            <Lifebuoy size={22} weight="duotone" className="text-primary-600 dark:text-accent-300" />
            <h2 className="section-title">Stuck? Get unstuck</h2>
          </div>
          <p className="text-sm leading-relaxed text-primary-600 dark:text-primary-300">
            Every machine is different, so no static page covers every error. Fill in the brackets
            below and paste it into any AI assistant (Claude, whatever you have) - it
            gives useful context instead of just the raw error.
          </p>
          <CodeBlock code={DEBUG_PROMPT_TEMPLATE} />
        </div>
      </div>
    </Layout>
  )
}

export default TourOverview
