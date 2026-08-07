import express, { type Router } from 'express'
import type { HealthController } from '../controllers/HealthController.js'
import type { MetricsController } from '../controllers/MetricsController.js'
import type { OpenApiController } from '../controllers/OpenApiController.js'

export interface HealthRoutesDependencies {
  readonly health: HealthController
  readonly metrics: MetricsController
  readonly openApi: OpenApiController
}

/**
 * The endpoints mounted at the root rather than under /api/, all deliberately
 * outside `authenticate`.
 *
 * /health has to be reachable by Render's health checker, which sends no
 * headers of its own; /metrics is gated on METRICS_KEY inside the
 * controller instead, so that a missing key can answer 404 rather than
 * advertising that authentication is what was missing.
 *
 * /api-docs.json sits here for the same reason the other two do - it is
 * about the service rather than about anyone's tasks - and it is
 * unauthenticated because it describes only what the frontend bundle
 * already reveals.
 */
export function createHealthRouter(deps: HealthRoutesDependencies): Router {
  const router = express.Router()

  router.get('/health', deps.health.check)
  router.get('/metrics', deps.metrics.scrape)
  router.get('/api-docs.json', deps.openApi.serve)

  return router
}
