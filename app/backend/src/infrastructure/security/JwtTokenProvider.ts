import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import { UnauthorizedError } from '../../domain/errors/UnauthorizedError.js'
import type {
  TokenClaims,
  TokenProvider,
  TokenSubject,
} from '../../application/ports/ITokenProvider.js'

/** Verified on every token, exactly as middleware/auth.js did.
 * Pinning the algorithm is what makes the `alg: none` substitution attack
 * (and HS256/RS256 confusion) a non-issue; issuer and audience make a token
 * minted for some other service useless here. */
const ALGORITHM = 'HS256'
const ISSUER = 'taskflow-api'
const AUDIENCE = 'taskflow-client'

export interface JwtTokenProviderOptions {
  readonly secret: string
  readonly expiresIn: string
}

/**
 * `TokenProvider` implementation over `jsonwebtoken`. The only file that
 * imports it, and the only one that knows what a `TokenExpiredError` is -
 * every failure leaves here as an `UnauthorizedError` carrying the message
 * clients already saw, so the HTTP layer no longer pattern-matches on
 * `error.name` (docs/BACKEND_REWRITE_PLAN.md §1).
 */
export class JwtTokenProvider implements TokenProvider {
  constructor(private readonly options: JwtTokenProviderOptions) {}

  sign(subject: TokenSubject): string {
    return jwt.sign(
      {
        id: subject.id,
        email: subject.email,
        iss: ISSUER,
        aud: AUDIENCE,
        // Unique per token, so an individual token can be identified in
        // logs (and revoked by id) without ever logging the token itself.
        jti: crypto.randomUUID(),
      },
      this.options.secret,
      {
        expiresIn: this.options.expiresIn as jwt.SignOptions['expiresIn'],
        algorithm: ALGORITHM,
      }
    )
  }

  verify(token: string): TokenClaims {
    try {
      const decoded = jwt.verify(token, this.options.secret, {
        algorithms: [ALGORITHM],
        issuer: ISSUER,
        audience: AUDIENCE,
      })

      // A token whose payload is a bare string carries no claims to read.
      if (typeof decoded === 'string') {
        throw new UnauthorizedError('Invalid token payload')
      }

      return decoded as TokenClaims
    } catch (error) {
      throw toUnauthorized(error)
    }
  }

  decode(token: string): TokenClaims | null {
    const decoded = jwt.decode(token)
    if (!decoded || typeof decoded === 'string') {
      return null
    }
    return decoded as TokenClaims
  }

  /** sha256 of the raw token - the same fingerprint middleware/auth.js
   * wrote, so rows already in token_blacklist keep matching. */
  hashForRevocation(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex')
  }
}

/**
 * jsonwebtoken's error names -> the 401 messages the old middleware
 * returned, unchanged. Anything unrecognized becomes the same generic
 * 'Authentication failed' its catch-all produced, rather than leaking a
 * library-internal message to the client.
 */
function toUnauthorized(error: unknown): UnauthorizedError {
  if (error instanceof UnauthorizedError) {
    return error
  }

  const name = error instanceof Error ? error.name : ''

  switch (name) {
    case 'TokenExpiredError':
      return new UnauthorizedError('Token expired')
    case 'JsonWebTokenError':
      return new UnauthorizedError('Invalid token')
    case 'NotBeforeError':
      return new UnauthorizedError('Token not yet valid')
    default:
      return new UnauthorizedError('Authentication failed')
  }
}
