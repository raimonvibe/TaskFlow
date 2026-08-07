import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const config = {
  // Server
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  host: process.env.HOST || '0.0.0.0',

  // Database
  // If DATABASE_URL is set (e.g. Render's `fromDatabase: connectionString`),
  // it takes priority. Otherwise falls back to discrete DB_* vars (Docker/local dev).
  database: {
    connectionString: process.env.DATABASE_URL || undefined,
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'taskflow',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    // Managed Postgres providers (Render, Heroku, etc.) terminate SSL with certs
    // that aren't in the default CA chain; rejectUnauthorized:false trusts them
    // without requiring a bundled CA. Only applies when connecting via DATABASE_URL.
    ssl:
      process.env.DATABASE_URL && process.env.DB_SSL !== 'false'
        ? { rejectUnauthorized: false }
        : false,
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  },

  // JWT (require explicit secret in production to avoid default-secret vulnerability)
  jwt: {
    secret: (() => {
      const secret = process.env.JWT_SECRET
      if (
        process.env.NODE_ENV === 'production' &&
        (!secret || secret === 'default_secret_change_in_production')
      ) {
        throw new Error(
          'FATAL: JWT_SECRET must be set to a strong random value in production. Do not use default secret.'
        )
      }
      return secret || 'default_secret_change_in_production'
    })(),
    expiresIn: process.env.JWT_EXPIRE || '7d',
  },

  // CORS
  cors: {
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(',')
      : ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },

  // Logging
  log: {
    level: process.env.LOG_LEVEL || 'info',
  },
}

export default config
