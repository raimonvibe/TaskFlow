/**
 * Vitest globalSetup: ensures test DB has users and tasks tables.
 * Runs once before any tests; applies app/database/schema.sql if needed.
 * Works in CI (postgres service) and locally (taskflow_test or taskflow DB).
 */
import 'dotenv/config'
import pg from 'pg'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default async function globalSetup() {
  const pool = new pg.Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'taskflow',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  })

  let ended = false
  const endPool = async () => {
    if (!ended) {
      ended = true
      await pool.end()
    }
  }

  try {
    const check = await pool.query("SELECT to_regclass('public.users') AS users_exist")
    if (check.rows[0].users_exist == null) {
      const schemaPath = join(__dirname, '../../../database/schema.sql')
      const schema = readFileSync(schemaPath, 'utf8')
      await pool.query(schema)
    }

    // Guarded, idempotent, and run unconditionally (mirrors
    // database/init-schema.js's own ensureTokenBlacklistTable) so a test DB
    // that was already initialized before token_blacklist was added to
    // schema.sql still ends up with it, instead of every auth test that
    // touches logout/revocation failing with "relation does not exist".
    await pool.query(`
      CREATE TABLE IF NOT EXISTS token_blacklist (
        token_hash VARCHAR(64) PRIMARY KEY,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL
      )
    `)
    await pool.query(
      'CREATE INDEX IF NOT EXISTS idx_token_blacklist_expires_at ON token_blacklist(expires_at)'
    )
  } finally {
    await endPool()
  }
}
