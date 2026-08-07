import type { ErrorRequestHandler, Request, RequestHandler, Response } from 'express'
import { AppError } from '../../../domain/errors/AppError.js'
import type { Logger } from '../../../application/ports/ILogger.js'

/** Postgres error codes still reaching this middleware from the parts of
 * the app that have not been migrated yet (models/Task.js and the task
 * controller, which still talk to `config/database.js` directly). Delete
 * this block in Phase 4, once `PostgresTaskRepository` translates these the
 * way `PostgresUserRepository` already does. */
const LEGACY_PG_ERRORS: Record<string, { statusCode: number; message: string }> = {
  '23505': { statusCode: 409, message: 'Resource already exists' },
  '23503': { statusCode: 400, message: 'Invalid reference' },
}

export interface ErrorHandlerOptions {
  /** Include stack traces in the response body. Development only - the
   * current middleware keys this off NODE_ENV directly; injecting it keeps
   * the decision in the composition root and testable. */
  readonly includeStack: boolean
  /** Replace unclassified 500 messages with a generic string. */
  readonly hideInternalErrors: boolean
}

/**
 * The single place an HTTP error body is constructed.
 *
 * Every error response is now `{ status: 'error', message, errors? }` - the
 * one deliberate wire-format change in this rewrite (see
 * docs/BACKEND_REWRITE_PLAN.md §6). Previously three different shapes were
 * in circulation: `authController.js` sent a bare `{ message }`,
 * `validate.js` sent the full envelope with field errors, and this
 * middleware sent `{ status, message }`. The frontend only ever reads
 * `.message` (AuthContext.jsx, Login.jsx), which every one of those shapes
 * - old and new - provides.
 *
 * The classification itself is now one `instanceof AppError` check instead
 * of sniffing driver internals, because errors arrive here already
 * translated by the layer that understood them.
 */
export function createErrorHandler(
  logger: Logger,
  options: ErrorHandlerOptions
): ErrorRequestHandler {
  return (err: unknown, req: Request, res: Response, _next): void => {
    const error = err instanceof Error ? err : new Error(String(err))

    logger.error('Error occurred', {
      error: error.message,
      stack: error.stack,
      method: req.method,
      url: req.originalUrl,
    })

    const { statusCode, message, details } = classify(error, options.hideInternalErrors)

    res.status(statusCode).json({
      status: 'error',
      message,
      ...(details && { errors: details }),
      ...(options.includeStack && { stack: error.stack }),
    })
  }
}

function classify(
  error: Error,
  hideInternalErrors: boolean
): {
  statusCode: number
  message: string
  details?: ReadonlyArray<{ field: string; message: string }>
} {
  if (error instanceof AppError) {
    return { statusCode: error.statusCode, message: error.message, details: error.details }
  }

  const code = (error as { code?: unknown }).code
  if (typeof code === 'string' && LEGACY_PG_ERRORS[code]) {
    return LEGACY_PG_ERRORS[code]
  }

  const statusCode = (error as { statusCode?: unknown }).statusCode
  if (typeof statusCode === 'number' && statusCode !== 500) {
    return { statusCode, message: error.message }
  }

  // Unclassified: could be a raw driver error, a third-party library's
  // internals, a file path - never safe to hand to a client in production.
  // The full detail (stack included) is already logged above.
  return {
    statusCode: 500,
    message: hideInternalErrors ? 'Internal Server Error' : error.message || 'Internal Server Error',
  }
}

/** Unmatched route. Same body and status as today's `notFound`. */
export const notFound: RequestHandler = (req, res) => {
  res.status(404).json({
    status: 'error',
    message: `Route ${req.originalUrl} not found`,
  })
}
