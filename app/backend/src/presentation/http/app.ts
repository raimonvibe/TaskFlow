import express, { type Express } from 'express'
import compression from 'compression'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import type { Container } from '../../composition/container.js'

/**
 * Builds the Express application from an already-wired container.
 *
 * Takes the container as an argument instead of building one, so nothing is
 * constructed as a side effect of importing this module - which is what
 * lets a test build an app against fakes, and lets two differently
 * configured apps exist in one process. That is the difference from the
 * `app.js` this replaces, which built its middleware stack against
 * module-level singletons at import time.
 *
 * Middleware order matters: the correlation ID first so every response and
 * every log line carries one, helmet before anything can respond, the
 * generic rate limiter before body parsing (so a flood costs as little as
 * possible), and the error handler last. Everything from helmet onwards is
 * in the order app.js used.
 */
export function createApp(container: Container): Express {
  const app = express()
  const { config } = container

  // Ahead of the rate limiter deliberately: a request rejected with a 429
  // is exactly the kind someone will ask about later, and it should have an
  // ID to quote.
  app.use(container.correlationId)

  app.use(helmet())
  app.use(cors(config.cors))

  const limiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max,
    message: 'Too many requests from this IP, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
  })
  app.use('/api/', limiter)

  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))
  app.use(compression())
  app.use(container.requestLogger)

  // Health and metrics: public, no auth (Render's health checker hits
  // /health directly; /metrics is gated on METRICS_KEY inside the
  // controller).
  app.use('/', container.healthRouter)

  app.use('/api/auth', container.authRouter)
  app.use('/api/tasks', container.taskRouter)

  app.use(container.notFound)
  app.use(container.errorHandler)

  return app
}
