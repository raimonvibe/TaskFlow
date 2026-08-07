import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { PostgresConnection } from './PostgresConnection.js'
import type { DatabaseConfig } from '../../config/Config.js'

// Integration test against the real Postgres test database (same DB_* env
// vars and globalSetup as models/User.test.js and the src/test/security/*
// suites) - this class exists specifically to talk to a real database, so a
// mocked pg.Pool would only prove the mock works, not this adapter.
describe('PostgresConnection', () => {
  const testConfig: DatabaseConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'taskflow',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    ssl: false,
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  }

  let connection: PostgresConnection

  beforeAll(() => {
    connection = new PostgresConnection(testConfig)
  })

  afterAll(async () => {
    await connection.close()
  })

  describe('testConnection', () => {
    it('resolves true against a reachable database', async () => {
      await expect(connection.testConnection()).resolves.toBe(true)
    })
  })

  describe('query', () => {
    it('runs a parameterized query and returns real rows', async () => {
      const result = await connection.query<{ answer: number }>('SELECT $1::int AS answer', [42])
      expect(result.rows[0]?.answer).toBe(42)
    })

    it('rejects with the driver error for invalid SQL, rather than swallowing it', async () => {
      await expect(connection.query('SELECT FROM nonsense_table_xyz')).rejects.toThrow()
    })
  })

  describe('transaction', () => {
    it('commits when the callback succeeds', async () => {
      const result = await connection.transaction(async client => {
        const { rows } = await client.query('SELECT 1 + 1 AS sum')
        return rows[0].sum
      })
      expect(result).toBe(2)
    })

    it('rolls back and rethrows when the callback throws', async () => {
      await expect(
        connection.transaction(async client => {
          await client.query('SELECT 1')
          throw new Error('deliberate failure')
        })
      ).rejects.toThrow('deliberate failure')
    })
  })

  describe('getPoolStats', () => {
    it('returns a stats object with numeric total/idle/waiting counts', async () => {
      // Exercise the pool first so `total` is non-zero.
      await connection.query('SELECT 1')

      const stats = connection.getPoolStats()
      expect(typeof stats.total).toBe('number')
      expect(typeof stats.idle).toBe('number')
      expect(typeof stats.waiting).toBe('number')
      expect(stats.total).toBeGreaterThan(0)
    })
  })

  describe('multiple independent instances', () => {
    it('two PostgresConnections against the same database do not share state', async () => {
      const second = new PostgresConnection(testConfig)
      try {
        const [a, b] = await Promise.all([
          connection.query<{ v: number }>('SELECT 1 AS v'),
          second.query<{ v: number }>('SELECT 2 AS v'),
        ])
        expect(a.rows[0]?.v).toBe(1)
        expect(b.rows[0]?.v).toBe(2)
      } finally {
        await second.close()
      }
    })
  })
})
