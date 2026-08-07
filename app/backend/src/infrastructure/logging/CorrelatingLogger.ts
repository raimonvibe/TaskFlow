import type { Logger } from '../../application/ports/ILogger.js'
import type { RequestContext } from '../../application/ports/IRequestContext.js'

/**
 * Stamps the current request's correlation ID onto every log line.
 *
 * Decorator pattern (docs/BACKEND_REWRITE_PLAN.md §3): it implements
 * `Logger` and wraps a `Logger`, so it can be slipped in at the composition
 * root without a single caller changing. `AuthService` still asks for a
 * `Logger` and still calls `logger.warn(message, meta)`; it has no idea a
 * correlation ID is being attached, which is the point - otherwise every
 * call site would have to remember to include one.
 *
 * Wrapping is also why this works for log lines the application never
 * writes itself: the error middleware, the event bus, and the Postgres
 * connection all take the same decorated instance.
 *
 * Outside a request the metadata is passed through untouched rather than
 * gaining a `correlationId: undefined` key, so startup and shutdown lines
 * look exactly as they did before.
 */
export class CorrelatingLogger implements Logger {
  constructor(
    private readonly inner: Logger,
    private readonly context: RequestContext
  ) {}

  debug(message: string, meta?: Record<string, unknown>): void {
    this.inner.debug(message, this.withCorrelationId(meta))
  }

  info(message: string, meta?: Record<string, unknown>): void {
    this.inner.info(message, this.withCorrelationId(meta))
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.inner.warn(message, this.withCorrelationId(meta))
  }

  error(message: string, meta?: Record<string, unknown>): void {
    this.inner.error(message, this.withCorrelationId(meta))
  }

  private withCorrelationId(
    meta: Record<string, unknown> | undefined
  ): Record<string, unknown> | undefined {
    const correlationId = this.context.getCorrelationId()
    if (correlationId === undefined) return meta
    return { ...meta, correlationId }
  }
}
