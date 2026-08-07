import express, { type Router } from 'express'
import type { HealthController } from '../controllers/HealthController.js'
import type { MetricsController } from '../controllers/MetricsController.js'

export interface HealthRoutesDependencies {
  readonly health: HealthController
  readonly metrics: MetricsController
}

/**
 * The two operational endpoints, both mounted at the root rather than under
 * /api/ and both deliberately outside `authenticate`.
 *
 * /health has to be reachable by Render's health checker, which sends no
 * headers of its own; /metrics is gated on METRICS_KEY inside the
 * controller instead, so that a missing key can answer 404 rather than
 * advertising that authentication is what was missing.
 */
export function createHealthRouter(deps: HealthRoutesDependencies): Router {
  const router = express.Router()

  router.get('/health', deps.health.check)
  router.get('/metrics', deps.metrics.scrape)

  return router
}
