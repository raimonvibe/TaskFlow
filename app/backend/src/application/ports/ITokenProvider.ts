/** The claims the application actually reads off a verified token. A
 * provider may include more (issuer, audience, jti, ...); those are the
 * provider's own business and are verified inside `verify`. */
export interface TokenClaims {
  readonly id: number
  readonly email: string
  /** Issued-at, seconds since epoch. Used for the token-age check. */
  readonly iat?: number
  /** Expiry, seconds since epoch. Used to size the revocation record. */
  readonly exp?: number
}

export interface TokenSubject {
  readonly id: number
  readonly email: string
}

/**
 * Token issuing/verification port (Strategy - docs/BACKEND_REWRITE_PLAN.md
 * §3). JWT today via `JwtTokenProvider`; the application layer never
 * imports `jsonwebtoken` and never sees its error types.
 *
 * Implementations are responsible for translating their own library's
 * failures into domain errors (`UnauthorizedError`), exactly as
 * repositories translate driver errors - so "what does a bad token look
 * like" is answered once, in infrastructure, instead of by the HTTP layer
 * pattern-matching on `error.name === 'JsonWebTokenError'` the way
 * middleware/auth.js does today.
 */
export interface TokenProvider {
  sign(subject: TokenSubject): string

  /** @throws {UnauthorizedError} if the token is malformed, expired, not
   * yet valid, or fails signature/issuer/audience verification. */
  verify(token: string): TokenClaims

  /** Claims without verification - only safe for deciding how long to keep
   * a revocation record. Returns null if the token cannot be parsed. */
  decode(token: string): TokenClaims | null

  /** Stable, non-reversible id for a token, used as the revocation-list
   * key. Lives here because how a token is fingerprinted belongs to
   * whoever issues tokens, and it must stay consistent with the hashes
   * already stored in the token_blacklist table. */
  hashForRevocation(token: string): string
}
