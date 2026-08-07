import type { PoolStats } from './IDatabaseHealth.js'

/**
 * Rendering the collected metrics for a scrape.
 *
 * This is the seam that keeps `MetricsController` from importing
 * prom-client: the controller asks for a content type and a body, and does
 * not know the exposition format exists.
 *
 * `recordDatabasePool` lives here rather than on `MetricsRegistry` because
 * pool counters are not events that happened - they are a snapshot only
 * worth taking at scrape time, which is exactly when `healthRoutes.js`
 * took it.
 */
export interface MetricsExporter {
  readonly contentType: string

  recordDatabasePool(stats: PoolStats): void

  scrape(): Promise<string>
}
