import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

// Validate required environment variables
const requiredEnvVars = ['JWT_SECRET', 'DB_PASSWORD']
const missingVars = requiredEnvVars.filter((varName) => !process.env[varName])

if (missingVars.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missingVars.join(', ')}\n` +
      'Please set these in your .env file or environment.'
  )
}

const config = {
  // Server
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  host: process.env.HOST || '0.0.0.0',

  // Database
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'taskflow',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD, // Required - no fallback
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET, // Required - no fallback
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
