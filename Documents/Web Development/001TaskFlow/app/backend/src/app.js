import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import cookieParser from 'cookie-parser'
import rateLimit from 'express-rate-limit'
import config from './config/index.js'
import { requestLogger } from './middleware/requestLogger.js'
import { errorHandler, notFound } from './middleware/errorHandler.js'
import { csrfProtection } from './middleware/security.js'
import authRoutes from './routes/authRoutes.js'
import taskRoutes from './routes/taskRoutes.js'
import healthRoutes from './routes/healthRoutes.js'

const app = express()

// Security middleware
app.use(helmet())

// CORS
app.use(cors(config.cors))

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
})
app.use('/api/', limiter)

// Body parser with size limits (prevent DoS via large payloads)
app.use(express.json({ limit: '100kb' }))
app.use(express.urlencoded({ extended: true, limit: '100kb' }))

// Cookie parser for httpOnly authentication cookies
app.use(cookieParser())

// CSRF Protection for all API routes
app.use('/api/', csrfProtection)

// Compression
app.use(compression())

// Request logging
app.use(requestLogger)

// Health and metrics (no auth required, no CSRF needed)
app.use('/', healthRoutes)

// API routes (protected by CSRF)
app.use('/api/auth', authRoutes)
app.use('/api/tasks', taskRoutes)

// 404 handler
app.use(notFound)

// Error handler
app.use(errorHandler)

export default app
