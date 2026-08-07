import { UnauthorizedError } from '../../domain/errors/UnauthorizedError.js'
import type { TokenBlacklistRepository } from '../../domain/repositories/ITokenBlacklistRepository.js'
import type { Clock } from '../ports/IClock.js'
import type { Logger } from '../ports/ILogger.js'
import type { TokenClaims, TokenProvider, TokenSubject } from '../ports/ITokenProvider.js'

/** Mirrors middleware/auth.js's current `maxTokenAge` check exactly. */
const MAX_TOKEN_AGE_SECONDS = 7 * 24 * 60 * 60

/** Fallback revocation window when a token carries no `exp` claim - same
 * 7 days middleware/auth.js's `blacklistToken` falls back to. */
const DEFAULT_REVOCATION_MS = 7 * 24 * 60 * 60 * 1000

/**
 * Everything about the lifecycle of an access token: issue it, verify it
 * (including revocation), revoke it.
 *
 * This is the logic that currently lives in `middleware/auth.js` as a set
 * of module-level functions closing over an imported `config` and an
 * imported `TokenBlacklist` model. Pulled into a class with injected
 * dependencies, the revocation and token-age rules become testable without
 * a database, a real JWT secret, or the passage of time - a `FixedClock`
 * makes the 7-day age check a synchronous assertion instead of something
 * you can only exercise by mocking timers.
 */
export class TokenService {
  constructor(
    private readonly tokenProvider: TokenProvider,
    private readonly blacklist: TokenBlacklistRepository,
    private readonly clock: Clock,
    private readonly logger: Logger
  ) {}

  issue(subject: TokenSubject): string {
    return this.tokenProvider.sign(subject)
  }

  /**
   * Full verification of a bearer token, in the same order as today's
   * `authenticate` middleware: revocation first (a revoked token must be
   * rejected even if it is otherwise perfectly valid), then signature and
   * claims, then payload sanity, then age.
   *
   * @throws {UnauthorizedError} with the same messages the current
   * middleware returns, so the HTTP responses clients see are unchanged.
   */
  async verify(token: string): Promise<TokenClaims> {
    const tokenHash = this.tokenProvider.hashForRevocation(token)
    if (await this.blacklist.isBlacklisted(tokenHash)) {
      throw new UnauthorizedError('Token has been revoked')
    }

    // Throws UnauthorizedError with a message chosen by the provider
    // ('Token expired', 'Invalid token', 'Token not yet valid', ...).
    const claims = this.tokenProvider.verify(token)

    if (!claims.id || !claims.email) {
      throw new UnauthorizedError('Invalid token payload')
    }

    if (claims.iat !== undefined) {
      const tokenAgeSeconds = this.clock.now().getTime() / 1000 - claims.iat
      if (tokenAgeSeconds > MAX_TOKEN_AGE_SECONDS) {
        throw new UnauthorizedError('Token expired, please login again')
      }
    }

    return claims
  }

  /**
   * Revokes a token until its own expiry - there is no point tracking it
   * past the point where verification would reject it as expired anyway.
   *
   * The expired-row cleanup is fire-and-forget on purpose: it is an
   * opportunistic substitute for a scheduled job (there is no worker
   * process on Render's free tier), and a logout must not fail because
   * housekeeping did.
   */
  async revoke(token: string): Promise<void> {
    const tokenHash = this.tokenProvider.hashForRevocation(token)
    const claims = this.tokenProvider.decode(token)

    const expiresAt = claims?.exp
      ? new Date(claims.exp * 1000)
      : new Date(this.clock.now().getTime() + DEFAULT_REVOCATION_MS)

    await this.blacklist.add(tokenHash, expiresAt)
    this.logger.info('Token blacklisted', { tokenHash: tokenHash.substring(0, 10) })

    void this.blacklist.deleteExpired().catch((error: unknown) => {
      this.logger.warn('Token blacklist cleanup failed', {
        error: error instanceof Error ? error.message : String(error),
      })
    })
  }
}
