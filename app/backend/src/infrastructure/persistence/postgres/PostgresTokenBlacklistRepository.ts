import type { TokenBlacklistRepository } from '../../../domain/repositories/ITokenBlacklistRepository.js'
import type { PostgresConnection } from './PostgresConnection.js'

/** `TokenBlacklistRepository` over Postgres. Replaces
 * `models/TokenBlacklist.js` unchanged in behavior - same table, same
 * `ON CONFLICT DO NOTHING` idempotency, same opportunistic cleanup. */
export class PostgresTokenBlacklistRepository implements TokenBlacklistRepository {
  constructor(private readonly db: PostgresConnection) {}

  async add(tokenHash: string, expiresAt: Date): Promise<void> {
    await this.db.query(
      'INSERT INTO token_blacklist (token_hash, expires_at) VALUES ($1, $2) ON CONFLICT (token_hash) DO NOTHING',
      [tokenHash, expiresAt]
    )
  }

  async isBlacklisted(tokenHash: string): Promise<boolean> {
    const result = await this.db.query('SELECT 1 FROM token_blacklist WHERE token_hash = $1', [
      tokenHash,
    ])
    return result.rows.length > 0
  }

  async deleteExpired(): Promise<void> {
    await this.db.query('DELETE FROM token_blacklist WHERE expires_at < NOW()')
  }
}
