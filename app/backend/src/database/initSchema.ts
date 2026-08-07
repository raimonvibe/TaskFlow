/**
 * Idempotent database schema initializer.
 *
 * Runs before the server starts on Render (see render.yaml startCommand)
 * and in the Docker entrypoint. It applies app/database/schema.sql only the
 * first time - when the `users` table doesn't exist yet - so it's safe to
 * run on every redeploy.
 *
 * For real schema changes going forward, add a new guarded block below
 * rather than editing schema.sql in place, or move to a proper migration
 * tool (node-pg-migrate is already a devDependency).
 */
import fs from 'fs'
import path from 'path'
import type pg from 'pg'
import type { Logger } from '../application/ports/ILogger.js'
import { runScript } from '../composition/scriptContext.js'

void runScript('Database schema initialization', async ({ db, logger }) => {
  const client = await db.pool.connect()

  try {
    if (await usersTableExists(client)) {
      logger.info('Database schema already initialized, skipping')
    } else {
      await applySchema(client, logger)
    }

    await ensureTokenBlacklistTable(client, logger)
  } finally {
    client.release()
  }
})

async function usersTableExists(client: pg.PoolClient): Promise<boolean> {
  const { rows } = await client.query<{ exists: string | null }>(
    "SELECT to_regclass('public.users') AS exists"
  )

  return Boolean(rows[0]?.exists)
}

async function applySchema(client: pg.PoolClient, logger: Logger): Promise<void> {
  const schemaPath = path.join(process.cwd(), '..', 'database', 'schema.sql')
  const sql = fs.readFileSync(schemaPath, 'utf8')

  logger.info('Applying database schema for the first time...')
  await client.query(sql)
  logger.info('Database schema applied successfully')
}

/**
 * Guarded block (see file header): the JWT blacklist originally lived only
 * in an in-memory Set, so every restart - and Render's free tier restarts
 * often - silently un-revoked every "logged out" token. Runs on every boot
 * regardless of whether schema.sql already ran, since databases created
 * before this table existed still need it.
 */
async function ensureTokenBlacklistTable(client: pg.PoolClient, logger: Logger): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS token_blacklist (
      token_hash VARCHAR(64) PRIMARY KEY,
      expires_at TIMESTAMP WITH TIME ZONE NOT NULL
    )
  `)
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_token_blacklist_expires_at ON token_blacklist(expires_at)
  `)

  logger.info('token_blacklist table ready')
}
