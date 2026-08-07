import pg from 'pg'
import type { DatabaseConfig } from '../../config/Config.js'
import type { Logger } from '../../../application/ports/ILogger.js'

export interface PoolStats {
  readonly total: number
  readonly idle: number
  readonly waiting: number
}

/**
 * Adapter around `pg.Pool` - mirrors `config/database.js`'s current
 * behavior (query/testConnection/transaction/getPoolStats), but as an
 * injectable class instead of a module-level pool everything imports by
 * path. Repository implementations (Phase 3+) take a `PostgresConnection`
 * in their constructor instead of importing `query` directly, which is
 * what lets them be swapped for an in-memory fake in unit tests without
 * `vi.mock('../config/database.js')` - see
 * docs/BACKEND_REWRITE_PLAN.md §1 and §5.
 *
 * One deliberate behavior change from today's `config/database.js`: this
 * class does **not** call `process.exit(-1)` when the pool emits an
 * `'error'` event on an idle client. Crashing the whole process is a
 * bootstrap-level policy decision, not something a reusable, unit-testable
 * class should hardcode - a class that can call `process.exit` can also
 * kill the test runner. The future composition root (Phase 3+) can
 * subscribe to the same failure mode and decide to exit if that's still the
 * right call operationally.
 */
export class PostgresConnection {
  readonly pool: pg.Pool

  constructor(
    config: DatabaseConfig,
    private readonly logger?: Logger
  ) {
    const shared = {
      ssl: config.ssl,
      max: config.max,
      idleTimeoutMillis: config.idleTimeoutMillis,
      connectionTimeoutMillis: config.connectionTimeoutMillis,
    }

    const poolConfig: pg.PoolConfig = config.connectionString
      ? { connectionString: config.connectionString, ...shared }
      : {
          host: config.host,
          port: config.port,
          database: config.database,
          user: config.user,
          password: config.password,
          ...shared,
        }

    this.pool = new pg.Pool(poolConfig)

    this.pool.on('error', err => {
      this.logger?.error('Unexpected error on idle client', { error: err.message })
    })
  }

  async testConnection(): Promise<boolean> {
    const client = await this.pool.connect()
    try {
      const result = await client.query('SELECT NOW()')
      this.logger?.info('Database connected successfully', { timestamp: result.rows[0].now })
      return true
    } catch (error) {
      this.logger?.error('Failed to connect to database', { error: describeError(error) })
      throw error
    } finally {
      client.release()
    }
  }

  async query<T extends pg.QueryResultRow = pg.QueryResultRow>(
    text: string,
    params?: unknown[]
  ): Promise<pg.QueryResult<T>> {
    const start = Date.now()
    try {
      const result = await this.pool.query<T>(text, params)
      this.logger?.debug('Executed query', {
        text,
        duration: Date.now() - start,
        rows: result.rowCount,
      })
      return result
    } catch (error) {
      this.logger?.error('Query error', { text, error: describeError(error) })
      throw error
    }
  }

  async transaction<T>(callback: (client: pg.PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect()
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

  getPoolStats(): PoolStats {
    return {
      total: this.pool.totalCount,
      idle: this.pool.idleCount,
      waiting: this.pool.waitingCount,
    }
  }

  /** Not present in the current config/database.js (which just lets the
   * pool live for the process lifetime) - added because a unit-testable,
   * constructible class also needs a way to clean itself up, e.g. between
   * test files that each build their own PostgresConnection. */
  async close(): Promise<void> {
    await this.pool.end()
  }
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
