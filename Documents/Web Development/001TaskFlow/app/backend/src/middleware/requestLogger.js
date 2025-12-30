import logger from '../utils/logger.js'
import { httpRequestDuration, httpRequestTotal, activeConnections } from '../utils/metrics.js'

export const requestLogger = (req, res, next) => {
  const start = Date.now()

  // Increment active connections
  activeConnections.inc()

  // Log request
  logger.info('Incoming request', {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
  })

  // Capture response
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000
    const route = req.route ? req.route.path : req.originalUrl

    // Record metrics
    httpRequestDuration.observe(
      {
        method: req.method,
        route,
        status_code: res.statusCode,
      },
      duration
    )

    httpRequestTotal.inc({
      method: req.method,
      route,
      status_code: res.statusCode,
    })

    // Decrement active connections
    activeConnections.dec()

    // Log response
    logger.info('Request completed', {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}s`,
    })
  })

  next()
}
