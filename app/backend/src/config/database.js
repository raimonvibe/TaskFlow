import pg from 'pg'
import config from './index.js'
import logger from '../utils/logger.js'

const { Pool } = pg

// Create PostgreSQL connection pool
const pool = new Pool(config.database)

// Handle pool errors
pool.on('error', (err, _client) => {
  logger.error('Unexpected error on idle client', err)
  process.exit(-1)
})

// Test database connection
export const testConnection = async () => {
  try {
    const client = await pool.connect()
    const result = await client.query('SELECT NOW()')
    logger.info('Database connected successfully', {
      timestamp: result.rows[0].now,
    })
    client.release()
    return true
  } catch (error) {
    logger.error('Failed to connect to database', error)
    throw error
  }
}

// Query helper function
export const query = async (text, params) => {
  const start = Date.now()
  try {
    const result = await pool.query(text, params)
    const duration = Date.now() - start
    logger.debug('Executed query', { text, duration, rows: result.rowCount })
    return result
  } catch (error) {
    logger.error('Query error', { text, error: error.message })
    throw error
  }
}

// Transaction helper
export const transaction = async callback => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await callback(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

// Get pool stats for monitoring
export const getPoolStats = () => {
  return {
    total: pool.totalCount,
    idle: pool.idleCount,
    waiting: pool.waitingCount,
  }
}

export default pool
