import { randomUUID } from 'node:crypto'
import type { NextFunction, Request, RequestHandler, Response } from 'express'
import type { RequestContext } from '../../../application/ports/IRequestContext.js'

const REQUEST_HEADER = 'x-request-id'
const RESPONSE_HEADER = 'X-Request-Id'

/**
 * An inbound ID is only reused if it looks like an identifier and nothing
 * else. This is the security-relevant part of the middleware: the value goes
 * straight into log files, so anything permitting CR/LF would let a client
 * forge whole log entries, and anything unbounded would let one request
 * write a megabyte per line. Alphanumerics plus the separators real tracing
 * systems use (UUIDs, W3C trace IDs, Render's request IDs) all survive; the
 * characters that make log injection possible do not.
 */
const USABLE_ID = /^[A-Za-z0-9._:-]{1,128}$/

/**
 * Gives every request an ID, and puts it in scope for everything that
 * request touches.
 *
 * An inbound `X-Request-Id` is honoured when it is safe to reuse, so a trace
 * started by a proxy, a load balancer, or the frontend stays a single trace
 * across hops. Otherwise a UUID is generated.
 *
 * The ID goes back out on the response header before anything else runs, so
 * it is present even on replies this application never consciously produces
 * - a rate-limit 429, a helmet rejection, a 404 - which is what makes "quote
 * the X-Request-Id from the failed response" a workable bug report.
 *
 * Mounted first, ahead of the request logger, so that the "Incoming request"
 * line already carries the ID rather than appearing untagged above its own
 * request.
 */
export function createCorrelationId(context: RequestContext): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const inbound = req.get(REQUEST_HEADER)
    const correlationId = inbound !== undefined && USABLE_ID.test(inbound) ? inbound : randomUUID()

    res.setHeader(RESPONSE_HEADER, correlationId)

    // Express continues the middleware chain synchronously inside next(),
    // so everything downstream - including its async work - runs within
    // this scope.
    context.run(correlationId, () => {
      next()
    })
  }
}
