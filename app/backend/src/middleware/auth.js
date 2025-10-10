import jwt from 'jsonwebtoken'
import config from '../config/index.js'
import logger from '../utils/logger.js'
import crypto from 'crypto'

// Token blacklist (in production, use Redis)
const tokenBlacklist = new Set()

export const authenticate = (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' })
    }

    const token = authHeader.substring(7) // Remove 'Bearer ' prefix

    // Check if token is blacklisted
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
    if (tokenBlacklist.has(tokenHash)) {
      logger.warn('Blacklisted token used', { ip: req.ip })
      return res.status(401).json({ message: 'Token has been revoked' })
    }

    // Verify token with additional checks
    const decoded = jwt.verify(token, config.jwt.secret, {
      algorithms: ['HS256'], // Explicitly specify algorithm to prevent none attack
      issuer: 'taskflow-api', // Verify issuer
      audience: 'taskflow-client', // Verify audience
    })

    // Additional validation
    if (!decoded.id || !decoded.email) {
      logger.warn('Invalid token payload', { ip: req.ip })
      return res.status(401).json({ message: 'Invalid token payload' })
    }

    // Check token freshness (prevent token reuse after password change)
    // In production, verify against user's last password change timestamp
    const tokenAge = Date.now() / 1000 - decoded.iat
    const maxTokenAge = 7 * 24 * 60 * 60 // 7 days
    if (tokenAge > maxTokenAge) {
      logger.warn('Token too old', { userId: decoded.id, tokenAge })
      return res.status(401).json({ message: 'Token expired, please login again' })
    }

    req.user = decoded
    req.token = token // Store token for potential blacklisting
    next()
  } catch (error) {
    logger.warn('Authentication failed', {
      error: error.message,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    })

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' })
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' })
    }
    if (error.name === 'NotBeforeError') {
      return res.status(401).json({ message: 'Token not yet valid' })
    }
    return res.status(401).json({ message: 'Authentication failed' })
  }
}

export const generateToken = payload => {
  // Add additional claims for security
  const tokenPayload = {
    ...payload,
    iss: 'taskflow-api', // Issuer
    aud: 'taskflow-client', // Audience
    jti: crypto.randomUUID(), // Unique token ID
  }

  return jwt.sign(tokenPayload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
    algorithm: 'HS256',
  })
}

// Verify token without throwing error (for optional auth)
export const verifyToken = token => {
  try {
    return jwt.verify(token, config.jwt.secret, {
      algorithms: ['HS256'],
      issuer: 'taskflow-api',
      audience: 'taskflow-client',
    })
  } catch (error) {
    return null
  }
}

// Blacklist token (logout functionality)
export const blacklistToken = token => {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
  tokenBlacklist.add(tokenHash)
  logger.info('Token blacklisted', { tokenHash: tokenHash.substring(0, 10) })

  // In production, set TTL to token expiration time
  // Clean up after token would have expired anyway
  setTimeout(() => {
    tokenBlacklist.delete(tokenHash)
  }, 7 * 24 * 60 * 60 * 1000) // 7 days
}

// Optional authentication (don't fail if no token)
export const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next() // Continue without user
  }

  const token = authHeader.substring(7)
  const decoded = verifyToken(token)
  if (decoded) {
    req.user = decoded
  }
  next()
}

// Role-based access control
export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' })
    }

    if (!req.user.role || !roles.includes(req.user.role)) {
      logger.warn('Unauthorized role access attempt', {
        userId: req.user.id,
        userRole: req.user.role,
        requiredRoles: roles,
      })
      return res.status(403).json({ message: 'Insufficient permissions' })
    }

    next()
  }
}

// Refresh token rotation
export const generateRefreshToken = payload => {
  return jwt.sign(
    { ...payload, type: 'refresh' },
    config.jwt.refreshSecret || config.jwt.secret,
    {
      expiresIn: '30d',
      algorithm: 'HS256',
    }
  )
}

export const verifyRefreshToken = token => {
  try {
    const decoded = jwt.verify(
      token,
      config.jwt.refreshSecret || config.jwt.secret,
      { algorithms: ['HS256'] }
    )

    if (decoded.type !== 'refresh') {
      return null
    }

    return decoded
  } catch (error) {
    return null
  }
}
