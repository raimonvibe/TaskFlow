import jwt from 'jsonwebtoken'
import config from '../config/index.js'
import logger from '../utils/logger.js'
import crypto from 'crypto'

// Token blacklist with expiration tracking
// IMPORTANT: In production, use Redis or another persistent store for:
// - Persistence across server restarts
// - Distributed systems support
// - Better memory management
const tokenBlacklist = new Map() // Map<tokenHash, expirationTimestamp>
const MAX_BLACKLIST_SIZE = 10000 // Prevent unbounded memory growth

// Periodic cleanup of expired tokens (runs every hour)
setInterval(() => {
  const now = Date.now()
  let cleanedCount = 0

  for (const [hash, expiration] of tokenBlacklist.entries()) {
    if (expiration < now) {
      tokenBlacklist.delete(hash)
      cleanedCount++
    }
  }

  if (cleanedCount > 0) {
    logger.info('Cleaned up expired blacklisted tokens', { count: cleanedCount })
  }
}, 60 * 60 * 1000) // Run every hour

export const authenticate = (req, res, next) => {
  try {
    // Get token from httpOnly cookie (preferred) or Authorization header (fallback)
    let token = req.cookies?.auth_token

    // Fallback to Authorization header for backward compatibility
    if (!token) {
      const authHeader = req.headers.authorization
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'No token provided' })
      }
      token = authHeader.substring(7) // Remove 'Bearer ' prefix
    }

    // Check if token is blacklisted
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
    const blacklistExpiration = tokenBlacklist.get(tokenHash)

    if (blacklistExpiration) {
      // Check if blacklist entry is still valid (not expired)
      if (blacklistExpiration > Date.now()) {
        logger.warn('Blacklisted token used', { ip: req.ip })
        return res.status(401).json({ message: 'Token has been revoked' })
      } else {
        // Clean up expired entry
        tokenBlacklist.delete(tokenHash)
      }
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

  // Prevent unbounded growth - remove oldest entries if at limit
  if (tokenBlacklist.size >= MAX_BLACKLIST_SIZE) {
    const firstKey = tokenBlacklist.keys().next().value
    tokenBlacklist.delete(firstKey)
    logger.warn('Blacklist size limit reached, removed oldest entry', {
      size: tokenBlacklist.size,
    })
  }

  // Calculate expiration based on JWT token expiration (7 days)
  const expirationTime = Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days

  tokenBlacklist.set(tokenHash, expirationTime)
  logger.info('Token blacklisted', {
    tokenHash: tokenHash.substring(0, 10),
    expiresAt: new Date(expirationTime).toISOString(),
  })
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
