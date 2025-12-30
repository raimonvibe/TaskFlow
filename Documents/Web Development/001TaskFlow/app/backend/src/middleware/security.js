import rateLimit from 'express-rate-limit'
import slowDown from 'express-slow-down'
import mongoSanitize from 'express-mongo-sanitize'
import { body, validationResult } from 'express-validator'
import crypto from 'crypto'
import logger from '../utils/logger.js'

// Strict rate limiter for authentication endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: 'Too many authentication attempts, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  handler: (req, res) => {
    logger.warn('Rate limit exceeded for auth endpoint', {
      ip: req.ip,
      path: req.path,
    })
    res.status(429).json({
      error: 'Too many authentication attempts',
      retryAfter: req.rateLimit.resetTime,
    })
  },
})

// Stricter rate limiter for password reset
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 requests per hour
  message: 'Too many password reset attempts',
  skipSuccessfulRequests: true,
})

// General API rate limiter
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
})

// Speed limiter for progressive delays
export const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 50, // Start delaying after 50 requests
  delayMs: 500, // Add 500ms delay per request above threshold
  maxDelayMs: 20000, // Maximum delay of 20 seconds
})

// Sanitize request data to prevent NoSQL injection
export const sanitizeInput = (req, res, next) => {
  mongoSanitize.sanitize(req.body)
  mongoSanitize.sanitize(req.query)
  mongoSanitize.sanitize(req.params)
  next()
}

// Content Security Policy middleware
// NOTE: If your frontend uses inline scripts/styles, consider using nonces or hashes
// instead of unsafe-inline. See: https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP
export const contentSecurityPolicy = (req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; " +
      "script-src 'self'; " + // Removed unsafe-inline and unsafe-eval for security
      "style-src 'self'; " + // Removed unsafe-inline - use external stylesheets
      "img-src 'self' data: https:; " +
      "font-src 'self' data:; " +
      "connect-src 'self'; " +
      "frame-ancestors 'none'; " +
      "base-uri 'self'; " +
      "form-action 'self'"
  )
  next()
}

// Strict Transport Security
export const strictTransportSecurity = (req, res, next) => {
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
  next()
}

// Prevent clickjacking
export const preventClickjacking = (req, res, next) => {
  res.setHeader('X-Frame-Options', 'DENY')
  next()
}

// XSS Protection
export const xssProtection = (req, res, next) => {
  res.setHeader('X-XSS-Protection', '1; mode=block')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  next()
}

// CSRF Protection Middleware
// Generates and validates CSRF tokens for state-changing operations
export const csrfProtection = (req, res, next) => {
  // GET, HEAD, OPTIONS are safe methods - no CSRF protection needed
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    // Generate and set CSRF token in a readable cookie for client to use
    if (!req.cookies?.csrf_token) {
      const csrfToken = crypto.randomBytes(32).toString('hex')
      res.cookie('csrf_token', csrfToken, {
        httpOnly: false, // Must be readable by JavaScript
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      })
    }
    return next()
  }

  // For state-changing methods (POST, PUT, DELETE, PATCH), validate CSRF token
  const csrfTokenFromCookie = req.cookies?.csrf_token
  const csrfTokenFromHeader = req.headers['x-csrf-token']

  if (!csrfTokenFromCookie || !csrfTokenFromHeader) {
    logger.warn('CSRF token missing', {
      ip: req.ip,
      path: req.path,
      method: req.method,
    })
    return res.status(403).json({ error: 'CSRF token missing' })
  }

  // Use constant-time comparison to prevent timing attacks
  if (!crypto.timingSafeEqual(Buffer.from(csrfTokenFromCookie), Buffer.from(csrfTokenFromHeader))) {
    logger.warn('CSRF token mismatch', {
      ip: req.ip,
      path: req.path,
      method: req.method,
    })
    return res.status(403).json({ error: 'CSRF token invalid' })
  }

  next()
}

// CORS validation middleware
export const validateCorsOrigin = allowedOrigins => {
  return (req, res, next) => {
    const origin = req.headers.origin
    if (origin && !allowedOrigins.includes(origin)) {
      logger.warn('Blocked request from unauthorized origin', { origin, ip: req.ip })
      return res.status(403).json({ error: 'Forbidden - Invalid origin' })
    }
    next()
  }
}

// Request validation helper
export const validate = validations => {
  return async (req, res, next) => {
    await Promise.all(validations.map(validation => validation.run(req)))

    const errors = validationResult(req)
    if (errors.isEmpty()) {
      return next()
    }

    logger.warn('Request validation failed', {
      errors: errors.array(),
      path: req.path,
      ip: req.ip,
    })

    res.status(400).json({
      error: 'Validation failed',
      details: errors.array().map(err => ({
        field: err.param,
        message: err.msg,
      })),
    })
  }
}

// Input validation schemas
export const validationSchemas = {
  register: [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 8, max: 128 })
      .withMessage('Password must be between 8 and 128 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Password must contain uppercase, lowercase, number and special character'),
    body('name')
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Name must be between 2 and 100 characters')
      .matches(/^[a-zA-Z\s]+$/)
      .withMessage('Name can only contain letters and spaces'),
  ],

  login: [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],

  createTask: [
    body('title')
      .trim()
      .isLength({ min: 1, max: 255 })
      .withMessage('Title must be between 1 and 255 characters')
      .escape(),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 2000 })
      .withMessage('Description must not exceed 2000 characters')
      .escape(),
    body('status')
      .optional()
      .isIn(['todo', 'in_progress', 'completed'])
      .withMessage('Invalid status'),
    body('priority')
      .optional()
      .isIn(['low', 'medium', 'high'])
      .withMessage('Invalid priority'),
    body('due_date').optional().isISO8601().toDate().withMessage('Invalid date format'),
  ],

  updateTask: [
    body('title')
      .optional()
      .trim()
      .isLength({ min: 1, max: 255 })
      .withMessage('Title must be between 1 and 255 characters')
      .escape(),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 2000 })
      .withMessage('Description must not exceed 2000 characters')
      .escape(),
    body('status')
      .optional()
      .isIn(['todo', 'in_progress', 'completed'])
      .withMessage('Invalid status'),
    body('priority')
      .optional()
      .isIn(['low', 'medium', 'high'])
      .withMessage('Invalid priority'),
    body('due_date').optional().isISO8601().toDate().withMessage('Invalid date format'),
  ],
}

// Request sanitization for SQL injection prevention
export const sanitizeSqlInput = (req, res, next) => {
  const sqlInjectionPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|DECLARE)\b)/gi,
    /(--|;|\/\*|\*\/|xp_|sp_)/gi,
    /('|(\\')|(")|(\\"))/gi,
  ]

  const checkValue = value => {
    if (typeof value === 'string') {
      for (const pattern of sqlInjectionPatterns) {
        if (pattern.test(value)) {
          return true
        }
      }
    }
    return false
  }

  const scanObject = obj => {
    for (const key in obj) {
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        if (scanObject(obj[key])) return true
      } else if (checkValue(obj[key])) {
        return true
      }
    }
    return false
  }

  // Helper to sanitize sensitive fields from logging
  const sanitizeForLogging = obj => {
    const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'api_key', 'authorization']
    const sanitized = { ...obj }

    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]'
      }
    }

    return sanitized
  }

  if (scanObject(req.body) || scanObject(req.query) || scanObject(req.params)) {
    logger.warn('Potential SQL injection attempt detected', {
      ip: req.ip,
      path: req.path,
      method: req.method,
      body: sanitizeForLogging(req.body),
      query: sanitizeForLogging(req.query),
      // Don't log full objects, just indicate detection
    })
    return res.status(400).json({ error: 'Invalid input detected' })
  }

  next()
}

// IP whitelist/blacklist middleware
export const ipFilter = (whitelist = [], blacklist = []) => {
  return (req, res, next) => {
    const clientIp = req.ip || req.connection.remoteAddress

    // Check blacklist first
    if (blacklist.length > 0 && blacklist.includes(clientIp)) {
      logger.warn('Blocked request from blacklisted IP', { ip: clientIp })
      return res.status(403).json({ error: 'Access denied' })
    }

    // Check whitelist if configured
    if (whitelist.length > 0 && !whitelist.includes(clientIp)) {
      logger.warn('Blocked request from non-whitelisted IP', { ip: clientIp })
      return res.status(403).json({ error: 'Access denied' })
    }

    next()
  }
}

// Require HTTPS in production
export const requireHttps = (req, res, next) => {
  if (process.env.NODE_ENV === 'production' && !req.secure && req.get('x-forwarded-proto') !== 'https') {
    logger.warn('HTTP request in production environment', {
      ip: req.ip,
      path: req.path,
    })
    return res.redirect(301, `https://${req.headers.host}${req.url}`)
  }
  next()
}

// Prevent parameter pollution
export const preventParameterPollution = (req, res, next) => {
  // Convert array parameters to single values (use first value)
  const cleanParams = obj => {
    for (const key in obj) {
      if (Array.isArray(obj[key]) && obj[key].length > 1) {
        logger.warn('Parameter pollution detected', {
          param: key,
          values: obj[key],
          ip: req.ip,
        })
        obj[key] = obj[key][0] // Use first value only
      }
    }
  }

  cleanParams(req.query)
  cleanParams(req.body)
  next()
}

// Session timeout tracking
export const sessionTimeout = (timeoutMs = 3600000) => {
  // 1 hour default
  return (req, res, next) => {
    if (req.user && req.user.iat) {
      const tokenAge = Date.now() - req.user.iat * 1000
      if (tokenAge > timeoutMs) {
        logger.warn('Session timeout', { userId: req.user.id })
        return res.status(401).json({ error: 'Session expired, please login again' })
      }
    }
    next()
  }
}

// Audit logging for sensitive operations
export const auditLog = action => {
  return (req, res, next) => {
    logger.info('Audit log', {
      action,
      userId: req.user?.id,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      path: req.path,
      method: req.method,
      timestamp: new Date().toISOString(),
    })
    next()
  }
}
