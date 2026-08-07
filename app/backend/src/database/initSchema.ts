/**
 * Applies the database schema.
 *
 * Runs before the server starts on Render (see render.yaml startCommand)
 * and in the Docker entrypoint. It applies app/database/schema.sql in full,
 * on every boot - the file is idempotent by construction, so re-applying it
 * is a no-op against a database that already matches it.
 *
 * This used to skip the file entirely when the `users` table existed, and
 * then hand-patch `token_blacklist` afterwards with its own copy of that
 * table's DDL, because a database created before that table was added would
 * otherwise never get it. Applying the whole file unconditionally covers
 * that case without a second copy: CREATE TABLE IF NOT EXISTS adds what is
 * missing and leaves the rest alone. Schema changes go in schema.sql and
 * nowhere else - see its header for what that arrangement can and cannot
 * express.
 */
import fs from 'fs'
import path from 'path'
import { runScript } from '../composition/scriptContext.js'

void runScript('Database schema initialization', async ({ db, logger }) => {
  const schemaPath = path.join(process.cwd(), '..', 'database', 'schema.sql')
  const sql = fs.readFileSync(schemaPath, 'utf8')

  logger.info('Applying database schema...', { schemaPath })
  await db.pool.query(sql)
  logger.info('Database schema applied successfully')
})
