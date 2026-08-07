import type { Express } from 'express'
import { createContainer } from '../../composition/container.js'
import { createApp } from '../../presentation/http/app.js'
import { PrometheusMetricsRegistry } from '../../infrastructure/metrics/PrometheusMetricsRegistry.js'
import { authAttempts, tasksByStatus } from '../../utils/metrics.js'

/**
 * The application the integration tests exercise, built the same way
 * main.ts builds the real one - same container, same middleware stack, same
 * routes. That sameness is the point: these tests are the evidence that the
 * rewrite did not change observable behavior, which they can only provide
 * if they run the thing production runs.
 *
 * Built once and shared, because supertest opens a fresh ephemeral listener
 * per request anyway, and because a container per test file would mean a
 * database pool per test file.
 */
let cached: Express | undefined

export function getTestApp(): Express {
  if (!cached) {
    cached = createApp(
      createContainer({ metrics: new PrometheusMetricsRegistry({ authAttempts, tasksByStatus }) })
    )
  }
  return cached
}

export default getTestApp()
