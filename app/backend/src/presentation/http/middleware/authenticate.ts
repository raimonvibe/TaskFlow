import type { NextFunction, Request, RequestHandler, Response } from 'express'
import { UnauthorizedError } from '../../../domain/errors/UnauthorizedError.js'
import type { Logger } from '../../../application/ports/ILogger.js'
import type { TokenService } from '../../../application/services/TokenService.js'

const BEARER_PREFIX = 'Bearer '

/**
 * Rejects requests without a valid, unrevoked bearer token, and attaches
 * the token's claims to the request.
 *
 * All of the actual rules - revocation, signature, issuer/audience,
 * algorithm pinning, payload sanity, token age - live in `TokenService` and
 * `JwtTokenProvider`. What is left here is genuinely HTTP-shaped: read the
 * Authorization header, and turn a rejection into a 401.
 *
 * A factory rather than an exported function, because the middleware needs
 * dependencies and the composition root is the only place allowed to supply
 * them (docs/BACKEND_REWRITE_PLAN.md §3).
 *
 * Behavior note: the current middleware emits a different warn line per
 * rejection reason ('Blacklisted token used', 'Invalid token payload',
 * 'Token too old', 'Authentication failed'). Those are consolidated into
 * one 'Authentication failed' line whose `error` field carries the specific
 * reason, so the same information is still logged, in a single searchable
 * shape, with the request context (ip, user agent) attached to every case
 * rather than only some.
 */
export function createAuthenticate(tokenService: TokenService, logger: Logger): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const authHeader = req.headers.authorization

    try {
      if (!authHeader || !authHeader.startsWith(BEARER_PREFIX)) {
        throw new UnauthorizedError('No token provided')
      }

      const token = authHeader.substring(BEARER_PREFIX.length)
      const claims = await tokenService.verify(token)

      req.user = claims
      req.token = token
      next()
    } catch (error) {
      logger.warn('Authentication failed', {
        error: error instanceof Error ? error.message : String(error),
        ip: req.ip,
        userAgent: req.headers['user-agent'],
      })

      // Anything that is not an UnauthorizedError is a real failure (the
      // revocation lookup hitting a dead database, say) and must not be
      // reported to the client as bad credentials - hand it to the error
      // middleware, which decides what a 500 is allowed to say.
      if (error instanceof UnauthorizedError) {
        res.status(error.statusCode).json({ status: 'error', message: error.message })
        return
      }

      next(error)
    }
  }
}
