/**
 * Vitest globalSetup: ensures the test database has the users and tasks
 * tables. Runs once before any test file; applies app/database/schema.sql
 * if needed. Works in CI (postgres service) and locally (taskflow_test or
 * taskflow).
 *
 * Talks to `pg` directly rather than going through `PostgresConnection`,
 * because it has to work on a database that may not have a schema yet -
 * before any of the app's assumptions hold.
 */
import 'dotenv/config'
import pg from 'pg'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const currentDir = dirname(fileURLToPath(import.meta.url))

export default async function globalSetup(): Promise<void> {
  const pool = new pg.Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'taskflow',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  })

  try {
    const check = await pool.query<{ users_exist: string | null }>(
      "SELECT to_regclass('public.users') AS users_exist"
    )

    if (check.rows[0]?.users_exist == null) {
      const schemaPath = join(currentDir, '../../../database/schema.sql')
      await pool.query(readFileSync(schemaPath, 'utf8'))
    }

    // Guarded, idempotent, and run unconditionally (mirrors
    // database/initSchema.ts's own ensureTokenBlacklistTable) so a test DB
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

    // Sweep leftovers from a previous run that crashed before its own
    // afterAll cleanup could run. This is the *only* place allowed to delete
    // every sectest user at once: it runs once, before any test file starts,
    // so it can't pull rows out from under a test that's still using them.
    // Per-file cleanup is scoped to that file's own users - see
    // helpers/testUser.ts.
    await pool.query("DELETE FROM users WHERE email LIKE 'sectest-%@example.com'")
  } finally {
    await pool.end()
  }
}
