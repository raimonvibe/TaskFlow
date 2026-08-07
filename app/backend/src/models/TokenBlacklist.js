import { query } from '../config/database.js'

export const TokenBlacklist = {
  // Revoke a token until its own expiry (no point keeping it past that -
  // jwt.verify will reject it as expired anyway).
  add: async (tokenHash, expiresAt) => {
    await query(
      'INSERT INTO token_blacklist (token_hash, expires_at) VALUES ($1, $2) ON CONFLICT (token_hash) DO NOTHING',
      [tokenHash, expiresAt]
    )
  },

  isBlacklisted: async tokenHash => {
    const result = await query('SELECT 1 FROM token_blacklist WHERE token_hash = $1', [
      tokenHash,
    ])
    return result.rows.length > 0
  },

  // Opportunistic cleanup instead of a scheduled job (no worker process on
  // Render's free tier) - cheap, and only deletes rows that are dead weight
  // anyway since expired tokens fail jwt.verify() regardless of this table.
  deleteExpired: async () => {
    await query('DELETE FROM token_blacklist WHERE expires_at < NOW()')
  },
}
