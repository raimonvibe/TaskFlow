/**
 * Validated, fail-fast application configuration.
 *
 * Mirrors `config/index.js`'s current values and defaults exactly (see that
 * file) - this is a structural rewrite, not a behavior change. Two real
 * differences from the current module:
 *
 * 1. It's a class you construct, not a module-level object built once at
 *    import time. The constructor takes an optional `env` source
 *    (defaulting to `process.env`), so tests can build a `Config` from a
 *    plain object (`new Config({ NODE_ENV: 'production' })`) instead of
 *    mutating the real `process.env` and hoping nothing else read it first.
 * 2. Loading a `.env` file (`dotenv.config()`) is *not* done here - that's
 *    a startup/bootstrap concern for the future `main.ts` entrypoint
 *    (Phase 3+), not something a config value object should have as a side
 *    effect of merely being constructed.
 *
 * `getInstance()` provides the actual Singleton for the rest of the app to
 * share (same one `Config` for the lifetime of the process), matching how
 * `config/index.js` is already, in effect, a singleton today - just
 * explicit now instead of implicit in module caching.
 */
export interface DatabaseConfig {
  readonly connectionString?: string
  readonly host: string
  readonly port: number
  readonly database: string
  readonly user: string
  readonly password: string
  readonly ssl: false | { rejectUnauthorized: boolean }
  readonly max: number
  readonly idleTimeoutMillis: number
  readonly connectionTimeoutMillis: number
}

export interface JwtConfig {
  readonly secret: string
  readonly expiresIn: string
  readonly refreshSecret?: string
}

export interface CorsConfig {
  readonly origin: string[]
  readonly credentials: boolean
}

export interface RateLimitConfig {
  readonly windowMs: number
  readonly max: number
  readonly authWindowMs: number
  readonly authMax: number
}

export class Config {
  readonly env: string
  readonly port: number
  readonly host: string
  readonly database: DatabaseConfig
  readonly jwt: JwtConfig
  readonly cors: CorsConfig
  readonly rateLimit: RateLimitConfig
  readonly log: { readonly level: string }
  readonly metrics: { readonly key: string | null }

  private static instance: Config | undefined

  constructor(env: NodeJS.ProcessEnv = process.env) {
    this.env = env.NODE_ENV || 'development'
    this.port = parseInt(env.PORT || '3000', 10)
    this.host = env.HOST || '0.0.0.0'

    this.database = {
      connectionString: env.DATABASE_URL || undefined,
      host: env.DB_HOST || 'localhost',
      port: parseInt(env.DB_PORT || '5432', 10),
      database: env.DB_NAME || 'taskflow',
      user: env.DB_USER || 'postgres',
      password: env.DB_PASSWORD || 'postgres',
      ssl: env.DATABASE_URL && env.DB_SSL !== 'false' ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    }

    this.jwt = {
      secret: this.resolveJwtSecret(env),
      expiresIn: env.JWT_EXPIRE || '7d',
      refreshSecret: env.JWT_REFRESH_SECRET || undefined,
    }

    this.cors = {
      origin: env.CORS_ORIGIN
        ? env.CORS_ORIGIN.split(',')
        : ['http://localhost:5173', 'http://localhost:3000'],
      credentials: true,
    }

    this.rateLimit = {
      windowMs: parseInt(env.RATE_LIMIT_WINDOW_MS || '900000', 10),
      max: parseInt(env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
      authWindowMs: parseInt(env.AUTH_RATE_LIMIT_WINDOW_MS || '900000', 10),
      authMax: parseInt(env.AUTH_RATE_LIMIT_MAX_REQUESTS || '10', 10),
    }

    this.log = { level: env.LOG_LEVEL || 'info' }

    this.metrics = { key: env.METRICS_KEY || null }
  }

  /** Require an explicit JWT_SECRET in production - refuses to boot with
   * the default placeholder value rather than silently signing tokens
   * anyone could forge. Same rule as today's config/index.js, just named
   * and callable on its own instead of buried in an IIFE inside an object
   * literal. */
  private resolveJwtSecret(env: NodeJS.ProcessEnv): string {
    const secret = env.JWT_SECRET
    const isProduction = env.NODE_ENV === 'production'
    const isDefaultOrMissing = !secret || secret === 'default_secret_change_in_production'

    if (isProduction && isDefaultOrMissing) {
      throw new Error(
        'FATAL: JWT_SECRET must be set to a strong random value in production. Do not use default secret.'
      )
    }

    return secret || 'default_secret_change_in_production'
  }

  static getInstance(env?: NodeJS.ProcessEnv): Config {
    if (!Config.instance) {
      Config.instance = new Config(env)
    }
    return Config.instance
  }

  /** Test-only: clears the shared instance so the next `getInstance()` call
   * builds a fresh `Config` (e.g. after changing env vars mid-test-suite). */
  static resetInstance(): void {
    Config.instance = undefined
  }
}
