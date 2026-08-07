export interface StoredRefreshToken {
  readonly userId: number
  readonly tokenHash: string
  readonly familyId: string
  readonly expiresAt: Date
  readonly revokedAt: Date | null
}

export interface NewRefreshToken {
  readonly userId: number
  readonly tokenHash: string
  readonly familyId: string
  readonly expiresAt: Date
}

/**
 * Outcome of consuming a presented refresh token and inserting its
 * replacement in one transaction. `reuse_detected` means the presented
 * token was already revoked — the whole family must be treated as stolen.
 */
export type RotateResult =
  | { readonly status: 'rotated'; readonly userId: number; readonly familyId: string }
  | { readonly status: 'reuse_detected'; readonly userId: number; readonly familyId: string }
  | { readonly status: 'invalid' }

/**
 * Persistence for opaque refresh tokens. Hashes only — a database leak
 * must not yield usable credentials. Rotation is a single atomic operation
 * so a crash cannot leave "old revoked, new never inserted".
 */
export interface RefreshTokenRepository {
  insert(token: NewRefreshToken): Promise<void>

  /**
   * Atomically: look up `presentedHash` (FOR UPDATE), detect reuse, revoke
   * the old row, insert a replacement in the same family/user. The caller
   * supplies only the new hash and expiry — user and family come from the
   * presented row.
   */
  rotate(
    presentedHash: string,
    replacementHash: string,
    replacementExpiresAt: Date,
    now: Date
  ): Promise<RotateResult>

  revokeAllForUser(userId: number, now: Date): Promise<void>

  revokeFamily(familyId: string, now: Date): Promise<void>

  deleteExpired(now: Date): Promise<void>
}
