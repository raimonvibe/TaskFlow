/**
 * Persistence port for revoked tokens (logout). Stores an opaque hash of
 * the token rather than the token itself - a leaked database dump then
 * yields no usable bearer tokens. Which hash is a detail of whoever issues
 * the tokens; see `TokenProvider.hashForRevocation`.
 *
 * Backed by Postgres rather than an in-memory Set so a revoked token stays
 * revoked across process restarts (Render's free tier restarts often) -
 * matching what `models/TokenBlacklist.js` already did.
 */
export interface TokenBlacklistRepository {
  /** Idempotent - revoking an already-revoked token is not an error. */
  add(tokenHash: string, expiresAt: Date): Promise<void>

  isBlacklisted(tokenHash: string): Promise<boolean>

  /** Drops rows past their own expiry. They are dead weight: an expired
   * token fails signature/expiry verification regardless of this table. */
  deleteExpired(): Promise<void>
}
