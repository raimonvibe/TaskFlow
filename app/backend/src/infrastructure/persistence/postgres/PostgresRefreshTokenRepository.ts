import type {
  NewRefreshToken,
  RefreshTokenRepository,
  RotateResult,
} from '../../../domain/repositories/IRefreshTokenRepository.js'
import type { PostgresConnection } from './PostgresConnection.js'

/** `RefreshTokenRepository` over Postgres. Rotation uses
 * `PostgresConnection.transaction` so revoke-old + insert-new cannot
 * half-apply — the first production caller of that method. */
export class PostgresRefreshTokenRepository implements RefreshTokenRepository {
  constructor(private readonly db: PostgresConnection) {}

  async insert(token: NewRefreshToken): Promise<void> {
    await this.db.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, family_id, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [token.userId, token.tokenHash, token.familyId, token.expiresAt]
    )
  }

  async rotate(
    presentedHash: string,
    replacementHash: string,
    replacementExpiresAt: Date,
    now: Date
  ): Promise<RotateResult> {
    return this.db.transaction(async client => {
      const found = await client.query<{
        user_id: number
        family_id: string
        expires_at: Date
        revoked_at: Date | null
      }>(
        `SELECT user_id, family_id, expires_at, revoked_at
         FROM refresh_tokens
         WHERE token_hash = $1
         FOR UPDATE`,
        [presentedHash]
      )

      const row = found.rows[0]
      if (!row) {
        return { status: 'invalid' }
      }

      if (row.expires_at.getTime() <= now.getTime()) {
        return { status: 'invalid' }
      }

      if (row.revoked_at !== null) {
        await client.query(
          `UPDATE refresh_tokens
           SET revoked_at = COALESCE(revoked_at, $2)
           WHERE family_id = $1 AND revoked_at IS NULL`,
          [row.family_id, now]
        )
        return {
          status: 'reuse_detected',
          userId: row.user_id,
          familyId: row.family_id,
        }
      }

      await client.query(`UPDATE refresh_tokens SET revoked_at = $2 WHERE token_hash = $1`, [
        presentedHash,
        now,
      ])
      await client.query(
        `INSERT INTO refresh_tokens (user_id, token_hash, family_id, expires_at)
         VALUES ($1, $2, $3, $4)`,
        [row.user_id, replacementHash, row.family_id, replacementExpiresAt]
      )

      return {
        status: 'rotated',
        userId: row.user_id,
        familyId: row.family_id,
      }
    })
  }

  async revokeAllForUser(userId: number, now: Date): Promise<void> {
    await this.db.query(
      `UPDATE refresh_tokens
       SET revoked_at = $2
       WHERE user_id = $1 AND revoked_at IS NULL`,
      [userId, now]
    )
  }

  async revokeFamily(familyId: string, now: Date): Promise<void> {
    await this.db.query(
      `UPDATE refresh_tokens
       SET revoked_at = $2
       WHERE family_id = $1 AND revoked_at IS NULL`,
      [familyId, now]
    )
  }

  async deleteExpired(now: Date): Promise<void> {
    await this.db.query('DELETE FROM refresh_tokens WHERE expires_at < $1', [now])
  }
}
