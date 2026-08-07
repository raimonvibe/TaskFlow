import type { NextFunction, Request, RequestHandler, Response } from 'express'
import type { HttpMetrics } from '../../../application/ports/IHttpMetrics.js'
import type { Logger } from '../../../application/ports/ILogger.js'

const MILLISECONDS_PER_SECOND = 1000

/**
 * Logs both ends of every request and records its timing.
 *
 * Same two log lines and the same three instruments
 * `middleware/requestLogger.js` had, with its module-level Winston and
 * prom-client imports replaced by injected ports - which is what makes the
 * `active_connections` bookkeeping assertable: a test can drive a request
 * through this and check the gauge went up and came back down, without a
 * Prometheus registry existing anywhere.
 *
 * The route label falls back to the raw URL when Express has not matched a
 * route (404s, and anything rejected before routing). That is unchanged,
 * and it is the reason the label is bounded in practice but not in
 * principle - worth remembering if an unmatched-path flood ever shows up as
 * metric cardinality.
 */
export function createRequestLogger(logger: Logger, metrics: HttpMetrics): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const start = Date.now()

    metrics.requestStarted()

    logger.info('Incoming request', {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
    })

    res.on('finish', () => {
      const durationSeconds = (Date.now() - start) / MILLISECONDS_PER_SECOND
      const route = req.route ? (req.route as { path: string }).path : req.originalUrl

      metrics.requestCompleted({
        method: req.method,
        route,
        statusCode: res.statusCode,
        durationSeconds,
      })

      logger.info('Request completed', {
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        duration: `${durationSeconds}s`,
      })
    })

    next()
  }
}
