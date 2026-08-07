import { describe, it, expect, afterEach } from 'vitest'
import { Config } from './Config.js'

describe('Config', () => {
  afterEach(() => {
    Config.resetInstance()
  })

  describe('defaults', () => {
    it('applies sensible defaults when given an empty env', () => {
      const config = new Config({})

      expect(config.env).toBe('development')
      expect(config.port).toBe(3000)
      expect(config.host).toBe('0.0.0.0')
      expect(config.database.host).toBe('localhost')
      expect(config.database.port).toBe(5432)
      expect(config.database.database).toBe('taskflow')
      expect(config.database.ssl).toBe(false)
      expect(config.jwt.expiresIn).toBe('15m')
      expect(config.jwt.refreshSecret).toBe('default_refresh_secret_change_in_production')
      expect(config.jwt.refreshExpiresIn).toBe('7d')
      expect(config.cors.origin).toEqual(['http://localhost:5173', 'http://localhost:3000'])
      expect(config.rateLimit.windowMs).toBe(900000)
      expect(config.rateLimit.max).toBe(100)
      expect(config.rateLimit.authMax).toBe(10)
      expect(config.log.level).toBe('info')
      expect(config.metrics.key).toBeNull()
      // Outside production, a missing JWT_SECRET falls back to the known
      // placeholder rather than throwing - same as `config/index.js` did.
      expect(config.jwt.secret).toBe('default_secret_change_in_production')
    })
  })

  describe('env var overrides', () => {
    it('reads every value from the provided env source, not process.env', () => {
      const config = new Config({
        NODE_ENV: 'staging',
        PORT: '4000',
        HOST: '127.0.0.1',
        DB_HOST: 'db.internal',
        DB_PORT: '5433',
        DB_NAME: 'custom_db',
        JWT_SECRET: 'a-real-secret',
        JWT_EXPIRE: '1h',
        JWT_REFRESH_SECRET: 'a-refresh-secret',
        JWT_REFRESH_EXPIRE: '30d',
        CORS_ORIGIN: 'https://a.example.com,https://b.example.com',
        RATE_LIMIT_MAX_REQUESTS: '50',
        AUTH_RATE_LIMIT_MAX_REQUESTS: '5',
        LOG_LEVEL: 'debug',
        METRICS_KEY: 'shh',
      })

      expect(config.env).toBe('staging')
      expect(config.port).toBe(4000)
      expect(config.host).toBe('127.0.0.1')
      expect(config.database.host).toBe('db.internal')
      expect(config.database.port).toBe(5433)
      expect(config.database.database).toBe('custom_db')
      expect(config.jwt.secret).toBe('a-real-secret')
      expect(config.jwt.expiresIn).toBe('1h')
      expect(config.jwt.refreshSecret).toBe('a-refresh-secret')
      expect(config.jwt.refreshExpiresIn).toBe('30d')
      expect(config.cors.origin).toEqual(['https://a.example.com', 'https://b.example.com'])
      expect(config.rateLimit.max).toBe(50)
      expect(config.rateLimit.authMax).toBe(5)
      expect(config.log.level).toBe('debug')
      expect(config.metrics.key).toBe('shh')
    })

    it('enables SSL (with rejectUnauthorized: false) when DATABASE_URL is set', () => {
      const config = new Config({ DATABASE_URL: 'postgres://user:pass@host/db' })
      expect(config.database.ssl).toEqual({ rejectUnauthorized: false })
      expect(config.database.connectionString).toBe('postgres://user:pass@host/db')
    })

    it('DB_SSL=false disables SSL even with a DATABASE_URL present', () => {
      const config = new Config({
        DATABASE_URL: 'postgres://user:pass@host/db',
        DB_SSL: 'false',
      })
      expect(config.database.ssl).toBe(false)
    })
  })

  describe('JWT secret fail-fast in production', () => {
    it('throws when NODE_ENV=production and JWT_SECRET is missing', () => {
      expect(() => new Config({ NODE_ENV: 'production' })).toThrow(/FATAL: JWT_SECRET/)
    })

    it('throws when NODE_ENV=production and JWT_SECRET is still the default placeholder', () => {
      expect(
        () =>
          new Config({
            NODE_ENV: 'production',
            JWT_SECRET: 'default_secret_change_in_production',
          })
      ).toThrow(/FATAL: JWT_SECRET/)
    })

    it('boots fine in production with distinct JWT_SECRET and JWT_REFRESH_SECRET', () => {
      const config = new Config({
        NODE_ENV: 'production',
        JWT_SECRET: 'a-real-strong-secret',
        JWT_REFRESH_SECRET: 'a-different-refresh-secret',
      })
      expect(config.jwt.secret).toBe('a-real-strong-secret')
      expect(config.jwt.refreshSecret).toBe('a-different-refresh-secret')
    })

    it('throws in production when JWT_REFRESH_SECRET is missing', () => {
      expect(
        () =>
          new Config({
            NODE_ENV: 'production',
            JWT_SECRET: 'a-real-strong-secret',
          })
      ).toThrow(/FATAL: JWT_REFRESH_SECRET/)
    })

    it('throws in production when JWT_REFRESH_SECRET equals JWT_SECRET', () => {
      expect(
        () =>
          new Config({
            NODE_ENV: 'production',
            JWT_SECRET: 'same-secret',
            JWT_REFRESH_SECRET: 'same-secret',
          })
      ).toThrow(/FATAL: JWT_REFRESH_SECRET/)
    })

    it('does not throw outside production even without JWT_SECRET', () => {
      expect(() => new Config({ NODE_ENV: 'test' })).not.toThrow()
      expect(() => new Config({ NODE_ENV: 'development' })).not.toThrow()
    })
  })

  describe('getInstance (Singleton)', () => {
    it('returns the same instance on repeated calls', () => {
      const first = Config.getInstance({ NODE_ENV: 'test' })
      const second = Config.getInstance({ NODE_ENV: 'test' })
      expect(first).toBe(second)
    })

    it('resetInstance() forces the next getInstance() to build a fresh Config', () => {
      const first = Config.getInstance({ PORT: '1111' })
      expect(first.port).toBe(1111)

      Config.resetInstance()

      const second = Config.getInstance({ PORT: '2222' })
      expect(second.port).toBe(2222)
      expect(second).not.toBe(first)
    })
  })
})
