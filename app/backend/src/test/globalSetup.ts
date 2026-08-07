/**
 * Vitest globalSetup: brings the test database up to the current schema.
 * Runs once before any test file; applies app/database/schema.sql, which is
 * idempotent, so this works the same on an empty database and on one left
 * over from a previous run. Works in CI (postgres service) and locally
 * (taskflow_test or taskflow).
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
    // Unconditional, which is what keeps a long-lived local test database
    // in step with schema.sql as tables are added to it. This file used to
    // apply the schema only when `users` was missing, and then re-declare
    // token_blacklist inline to cover the databases that predated it -
    // a second copy of that table's DDL, in the test harness. Applying the
    // whole schema every time removes the need for the copy.
    const schemaPath = join(currentDir, '../../../database/schema.sql')
    await pool.query(readFileSync(schemaPath, 'utf8'))

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
