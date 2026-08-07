/**
 * Idempotent database schema initializer.
 *
 * Intended to run before the server starts on Render (see render.yaml
 * startCommand). It only applies app/database/schema.sql the first time (when the `users` table
 * doesn't exist yet), so it's safe to run repeatedly across redeploys.
 *
 * For real schema changes going forward, add a new guarded block below
 * rather than editing schema.sql in place, or migrate to a proper migration
 * tool (node-pg-migrate is already a devDependency).
 */
import fs from 'fs'
import path from 'path'
import pool from '../config/database.js'
import logger from '../utils/logger.js'

const run = async () => {
  const client = await pool.connect()
  try {
    const { rows } = await client.query("SELECT to_regclass('public.users') AS exists")

    if (rows[0].exists) {
      logger.info('Database schema already initialized, skipping')
      return
    }

    const schemaPath = path.join(process.cwd(), '..', 'database', 'schema.sql')
    const sql = fs.readFileSync(schemaPath, 'utf8')

    logger.info('Applying database schema for the first time...')
    await client.query(sql)
    logger.info('Database schema applied successfully')
  } finally {
    client.release()
    await pool.end()
  }
}

run().catch(error => {
  logger.error('Database schema initialization failed', error)
  process.exit(1)
})
