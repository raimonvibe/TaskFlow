import type { Request, Response } from 'express'
import type { DatabaseHealth } from '../../../application/ports/IDatabaseHealth.js'
import type { Logger } from '../../../application/ports/ILogger.js'
import type { MetricsExporter } from '../../../application/ports/IMetricsExporter.js'

const METRICS_KEY_HEADER = 'X-Metrics-Key'

export interface MetricsControllerOptions {
  /** When null, /metrics is open - the local/dev default. In production
   * METRICS_KEY is set and the endpoint requires a matching header. */
  readonly key: string | null
}

/**
 * Serves the Prometheus scrape endpoint.
 *
 * Unchanged in behavior from `healthRoutes.js`, including the two decisions
 * worth not losing in translation:
 *
 *  - A missing or wrong key returns **404**, not 401 or 403, so the
 *    endpoint's existence is not confirmed to an unauthenticated caller.
 *    The security suite asserts this.
 *  - The database pool gauge is set immediately before rendering, because
 *    pool counts are a snapshot rather than something that accumulates.
 *    The gauge existed before this was wired up and always reported empty.
 */
export class MetricsController {
  constructor(
    private readonly metrics: MetricsExporter,
    private readonly database: DatabaseHealth,
    private readonly options: MetricsControllerOptions,
    private readonly logger: Logger
  ) {}

  scrape = async (req: Request, res: Response): Promise<void> => {
    if (this.options.key && req.get(METRICS_KEY_HEADER) !== this.options.key) {
      res.status(404).json({ message: 'Not found' })
      return
    }

    try {
      this.metrics.recordDatabasePool(this.database.getPoolStats())

      res.set('Content-Type', this.metrics.contentType)
      res.send(await this.metrics.scrape())
    } catch (error) {
      this.logger.error('Metrics collection failed', {
        error: error instanceof Error ? error.message : String(error),
      })
      res.status(500).json({ message: 'Failed to collect metrics' })
    }
  }
}
