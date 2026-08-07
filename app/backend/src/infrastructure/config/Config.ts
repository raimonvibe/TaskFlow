/**
 * Validated, fail-fast application configuration.
 *
 * Carries over `config/index.js`'s values and defaults exactly - this was a
 * structural rewrite, not a behavior change. Two real differences from the
 * module it replaced:
 *
 * 1. It's a class you construct, not a module-level object built once at
 *    import time. The constructor takes an optional `env` source
 *    (defaulting to `process.env`), so tests can build a `Config` from a
 *    plain object (`new Config({ NODE_ENV: 'production' })`) instead of
 *    mutating the real `process.env` and hoping nothing else read it first.
 * 2. Loading a `.env` file (`dotenv.config()`) is *not* done here - that's
 *    a bootstrap concern, handled by `main.ts` and `scriptContext.ts`, not
 *    something a config value object should have as a side effect of
 *    merely being constructed.
 *
 * `getInstance()` provides the actual Singleton for the rest of the app to
 * share (same one `Config` for the lifetime of the process) - the same
 * thing `config/index.js` got implicitly from module caching, just explicit
 * now.
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
  /** Access-token lifetime (jsonwebtoken form, e.g. `15m`). Short on purpose
   * once refresh-token rotation is in place. */
  readonly expiresIn: string
  /** HMAC key for hashing opaque refresh tokens before persistence. */
  readonly refreshSecret: string
  /** Refresh-token lifetime (e.g. `7d`). */
  readonly refreshExpiresIn: string
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

/** Which `PasswordPolicy` strategy is in force. Named here rather than in
 * the domain so the domain does not have to know it is selectable by
 * environment variable; the composition root maps this to an instance. */
export type PasswordPolicyName = 'length' | 'strong'

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
  readonly password: { readonly policy: PasswordPolicyName }

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
      // Short access token: the refresh token is what keeps the session alive.
      expiresIn: env.JWT_EXPIRE || '15m',
      refreshSecret: this.resolveRefreshSecret(env),
      refreshExpiresIn: env.JWT_REFRESH_EXPIRE || '7d',
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

    // Defaults to the rule this app has always enforced. An unrecognized
    // value falls back rather than throwing: getting a typo'd
    // PASSWORD_POLICY wrong should not take a deployment down, and the
    // fallback is the safe direction (it never silently weakens 'strong'
    // into nothing, it only declines to strengthen).
    this.password = { policy: env.PASSWORD_POLICY === 'strong' ? 'strong' : 'length' }
  }

  /** Require an explicit JWT_SECRET in production - refuses to boot with
   * the default placeholder value rather than silently signing tokens
   * anyone could forge. Same rule `config/index.js` had, just named and
   * callable on its own instead of buried in an IIFE inside an object
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

  /** Same fail-fast rule as `JWT_SECRET`: in production the refresh HMAC
   * key must be set and must not equal the access-token secret. */
  private resolveRefreshSecret(env: NodeJS.ProcessEnv): string {
    const secret = env.JWT_REFRESH_SECRET
    const accessSecret = this.resolveJwtSecret(env)
    const isProduction = env.NODE_ENV === 'production'
    const isMissing = !secret
    const matchesAccess = secret === accessSecret

    if (isProduction && (isMissing || matchesAccess)) {
      throw new Error(
        'FATAL: JWT_REFRESH_SECRET must be set to a strong random value distinct from JWT_SECRET in production.'
      )
    }

    return secret || 'default_refresh_secret_change_in_production'
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
