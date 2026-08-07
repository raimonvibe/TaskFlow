import { createHmac, randomBytes, randomUUID } from 'node:crypto'
import { UnauthorizedError } from '../../domain/errors/UnauthorizedError.js'
import type { RefreshTokenRepository } from '../../domain/repositories/IRefreshTokenRepository.js'
import { parseDurationToMs } from '../../infrastructure/time/parseDuration.js'
import type { Clock } from '../ports/IClock.js'
import type { Logger } from '../ports/ILogger.js'

export interface IssuedRefreshToken {
  /** Opaque token to hand to the client. Shown once; only the hash is stored. */
  readonly token: string
  readonly familyId: string
  readonly expiresAt: Date
}

/**
 * Opaque refresh tokens, hashed with HMAC-SHA256 keyed by
 * `JWT_REFRESH_SECRET` before persistence. Rotation with reuse detection:
 * presenting an already-revoked token kills the whole family.
 */
export class RefreshTokenService {
  private readonly ttlMs: number

  constructor(
    private readonly tokens: RefreshTokenRepository,
    private readonly secret: string,
    refreshExpiresIn: string,
    private readonly clock: Clock,
    private readonly logger: Logger
  ) {
    this.ttlMs = parseDurationToMs(refreshExpiresIn)
  }

  /** Start a new family (login / register). */
  async issue(userId: number): Promise<IssuedRefreshToken> {
    const familyId = randomUUID()
    const token = randomBytes(32).toString('base64url')
    const expiresAt = new Date(this.clock.now().getTime() + this.ttlMs)
    await this.tokens.insert({
      userId,
      tokenHash: this.hash(token),
      familyId,
      expiresAt,
    })
    this.cleanupExpired()
    return { token, familyId, expiresAt }
  }

  /**
   * Consume a presented refresh token and issue a replacement in the same
   * family. Reuse of an already-rotated token invalidates the family and
   * throws — the client must log in again.
   */
  async rotate(presentedToken: string): Promise<{ refreshToken: string; userId: number }> {
    if (!presentedToken) {
      throw new UnauthorizedError('Invalid refresh token')
    }

    const presentedHash = this.hash(presentedToken)
    const replacementRaw = randomBytes(32).toString('base64url')
    const replacementHash = this.hash(replacementRaw)
    const expiresAt = new Date(this.clock.now().getTime() + this.ttlMs)

    const result = await this.tokens.rotate(
      presentedHash,
      replacementHash,
      expiresAt,
      this.clock.now()
    )

    if (result.status === 'invalid') {
      throw new UnauthorizedError('Invalid refresh token')
    }

    if (result.status === 'reuse_detected') {
      // Same client-facing message as a bad token — don't confirm reuse to
      // an attacker. The family kill and the warning log are the signal.
      this.logger.warn('Refresh token reuse detected; family revoked', {
        userId: result.userId,
        familyId: result.familyId,
      })
      throw new UnauthorizedError('Invalid refresh token')
    }

    this.cleanupExpired()
    return { refreshToken: replacementRaw, userId: result.userId }
  }

  async revokeAllForUser(userId: number): Promise<void> {
    await this.tokens.revokeAllForUser(userId, this.clock.now())
    this.cleanupExpired()
  }

  hash(rawToken: string): string {
    return createHmac('sha256', this.secret).update(rawToken).digest('hex')
  }

  private cleanupExpired(): void {
    void this.tokens.deleteExpired(this.clock.now()).catch((error: unknown) => {
      this.logger.warn('Refresh token cleanup failed', {
        error: error instanceof Error ? error.message : String(error),
      })
    })
  }
}
