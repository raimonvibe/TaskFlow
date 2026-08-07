import type { Request, Response } from 'express'
import type { HealthService } from '../../../application/services/HealthService.js'

const OK = 200
const SERVICE_UNAVAILABLE = 503

/**
 * HTTP adapter for `HealthService`. Maps the report onto the status code
 * and body `healthRoutes.js` produced, byte for byte - Render's
 * health checker treats any non-2xx as a failed deploy, so the 503 matters
 * as much as the 200.
 *
 * No `next(error)`: this endpoint's whole job is to answer even when things
 * are broken, so a failure is a response, not an error to hand upward.
 */
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  check = async (_req: Request, res: Response): Promise<void> => {
    const report = await this.healthService.check()

    res.status(report.healthy ? OK : SERVICE_UNAVAILABLE).json({
      status: report.healthy ? 'healthy' : 'unhealthy',
      timestamp: report.timestamp,
      database: report.database,
    })
  }
}
