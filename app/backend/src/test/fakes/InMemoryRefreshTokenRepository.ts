import type {
  NewRefreshToken,
  RefreshTokenRepository,
  RotateResult,
  StoredRefreshToken,
} from '../../domain/repositories/IRefreshTokenRepository.js'

/** In-memory stand-in for unit tests. Same rotate/reuse semantics as
 * PostgresRefreshTokenRepository, without a database. */
export class InMemoryRefreshTokenRepository implements RefreshTokenRepository {
  private readonly rows = new Map<string, StoredRefreshToken>()

  async insert(token: NewRefreshToken): Promise<void> {
    if (this.rows.has(token.tokenHash)) {
      throw new Error('duplicate refresh token hash')
    }
    this.rows.set(token.tokenHash, {
      userId: token.userId,
      tokenHash: token.tokenHash,
      familyId: token.familyId,
      expiresAt: token.expiresAt,
      revokedAt: null,
    })
  }

  async rotate(
    presentedHash: string,
    replacementHash: string,
    replacementExpiresAt: Date,
    now: Date
  ): Promise<RotateResult> {
    const row = this.rows.get(presentedHash)
    if (!row) {
      return { status: 'invalid' }
    }
    if (row.expiresAt.getTime() <= now.getTime()) {
      return { status: 'invalid' }
    }
    if (row.revokedAt !== null) {
      await this.revokeFamily(row.familyId, now)
      return {
        status: 'reuse_detected',
        userId: row.userId,
        familyId: row.familyId,
      }
    }

    this.rows.set(presentedHash, { ...row, revokedAt: now })
    await this.insert({
      userId: row.userId,
      tokenHash: replacementHash,
      familyId: row.familyId,
      expiresAt: replacementExpiresAt,
    })
    return {
      status: 'rotated',
      userId: row.userId,
      familyId: row.familyId,
    }
  }

  async revokeAllForUser(userId: number, now: Date): Promise<void> {
    for (const [hash, row] of this.rows) {
      if (row.userId === userId && row.revokedAt === null) {
        this.rows.set(hash, { ...row, revokedAt: now })
      }
    }
  }

  async revokeFamily(familyId: string, now: Date): Promise<void> {
    for (const [hash, row] of this.rows) {
      if (row.familyId === familyId && row.revokedAt === null) {
        this.rows.set(hash, { ...row, revokedAt: now })
      }
    }
  }

  async deleteExpired(now: Date): Promise<void> {
    for (const [hash, row] of this.rows) {
      if (row.expiresAt.getTime() < now.getTime()) {
        this.rows.delete(hash)
      }
    }
  }

  /** Test helper. */
  get size(): number {
    return this.rows.size
  }

  /** Test helper. */
  getByHash(tokenHash: string): StoredRefreshToken | undefined {
    return this.rows.get(tokenHash)
  }
}
