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
    if (check.rows[0].users_exist != null) {
      await endPool()
      return
    }

    const schemaPath = join(__dirname, '../../../database/schema.sql')
    const schema = readFileSync(schemaPath, 'utf8')
    await pool.query(schema)
  } finally {
    await endPool()
  }
}
