import type { TokenClaims } from '../../application/ports/ITokenProvider.js'

/**
 * Adds the two properties the authentication middleware attaches to the
 * request, so controllers can read `req.user.id` without casting.
 *
 * This is the standard way to type middleware-populated request state in
 * Express; both are optional because they only exist downstream of
 * `authenticate`, which is what stops a controller from silently assuming
 * a route is authenticated when it is not.
 */
declare global {
  namespace Express {
    interface Request {
      user?: TokenClaims
      /** The raw bearer token, kept so logout can revoke it. */
      token?: string
    }
  }
}

export {}
