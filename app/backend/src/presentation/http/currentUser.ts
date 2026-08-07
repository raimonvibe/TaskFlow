import type { Request } from 'express'
import { UnauthorizedError } from '../../domain/errors/UnauthorizedError.js'

export interface AuthenticatedRequestContext {
  readonly user: { id: number; email: string }
  readonly token: string
}

/**
 * Narrows the optional `req.user`/`req.token` that `authenticate` attaches.
 *
 * These are optional on the Express request by design - the type system
 * cannot know a route was mounted behind `authenticate`. Rather than assert
 * non-null and hope, this fails as a 401 if the route was ever wired up
 * without the middleware, which is the same answer the client would have
 * gotten anyway.
 */
export function requireAuth(req: Request): AuthenticatedRequestContext {
  if (!req.user || !req.token) {
    throw new UnauthorizedError('Authentication required')
  }
  return { user: req.user, token: req.token }
}

/** For the majority of handlers, which need the caller's identity and not
 * the token itself. */
export function requireUserId(req: Request): number {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required')
  }
  return req.user.id
}
