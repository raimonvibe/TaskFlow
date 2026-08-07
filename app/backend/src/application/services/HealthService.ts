import type { Clock } from '../ports/IClock.js'
import type { DatabaseHealth } from '../ports/IDatabaseHealth.js'
import type { Logger } from '../ports/ILogger.js'

export interface HealthReport {
  readonly healthy: boolean
  readonly timestamp: string
  readonly database: 'connected' | 'disconnected'
}

/**
 * Answers "is this instance able to serve requests".
 *
 * Small enough that a service layer looks like ceremony, and it earns its
 * place anyway for one reason: the interesting branch is the failure one,
 * and until now it could only be reached by breaking a real database
 * mid-test. Against a `DatabaseHealth` whose `ping()` rejects, the
 * unhealthy path - including the deliberate omission of the driver's error
 * message from the response - is an ordinary unit test.
 *
 * The report deliberately carries no detail beyond up/down. /health is
 * public and unauthenticated (Render's health checker hits it directly with
 * no way to pass a header), and a driver error message can name the host,
 * the port, and the database. That detail is logged server-side and
 * exposed on /metrics, which is the endpoint METRICS_KEY actually gates.
 */
export class HealthService {
  constructor(
    private readonly database: DatabaseHealth,
    private readonly clock: Clock,
    private readonly logger: Logger
  ) {}

  async check(): Promise<HealthReport> {
    const timestamp = this.clock.now().toISOString()

    try {
      await this.database.ping()
      return { healthy: true, timestamp, database: 'connected' }
    } catch (error) {
      this.logger.error('Health check failed', {
        error: error instanceof Error ? error.message : String(error),
      })
      return { healthy: false, timestamp, database: 'disconnected' }
    }
  }
}
