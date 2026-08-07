import { describe, it, expect, vi, beforeEach } from 'vitest'
import jwt from 'jsonwebtoken'

vi.mock('jsonwebtoken')

// authenticate() now checks a Postgres-backed blacklist (see
// models/TokenBlacklist.js), so it's mocked out here the same way the DB
// pool itself would be - this file tests the middleware's own logic, not
// the database layer, and it must not need a real Postgres connection to
// run. Without this mock, importing auth.js would transitively import
// config/database.js, which reads config.database at module load time -
// a field the config mock below intentionally doesn't provide.
vi.mock('../models/TokenBlacklist.js', () => ({
  TokenBlacklist: {
    isBlacklisted: vi.fn().mockResolvedValue(false),
    add: vi.fn().mockResolvedValue(undefined),
    deleteExpired: vi.fn().mockResolvedValue(undefined),
  },
}))

import { authenticate, generateToken, verifyToken, blacklistToken } from './auth.js'
import { TokenBlacklist } from '../models/TokenBlacklist.js'

vi.mock('../config/index.js', () => ({
  default: {
    env: 'test',
    jwt: {
      secret: 'test-secret',
      expiresIn: '1h',
    },
    log: {
      level: 'info',
    },
  },
}))

describe('Auth Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('generateToken', () => {
    it('should generate a valid JWT token', () => {
      const payload = { id: 1, email: 'test@example.com' }
      vi.mocked(jwt.sign).mockReturnValue('mock-token')

      const token = generateToken(payload)

      expect(jwt.sign).toHaveBeenCalled()
      expect(token).toBe('mock-token')
    })
  })

  describe('verifyToken', () => {
    it('should verify and decode a valid token', () => {
      const mockDecoded = { id: 1, email: 'test@example.com' }
      vi.mocked(jwt.verify).mockReturnValue(mockDecoded)

      const decoded = verifyToken('valid-token')

      expect(jwt.verify).toHaveBeenCalled()
      expect(decoded).toEqual(mockDecoded)
    })

    it('should return null for invalid token', () => {
      vi.mocked(jwt.verify).mockImplementation(() => {
        throw new Error('Invalid token')
      })

      const result = verifyToken('invalid-token')
      expect(result).toBeNull()
    })
  })

  describe('authenticate middleware', () => {
    let mockReq, mockRes, mockNext

    beforeEach(() => {
      mockReq = {
        headers: {},
        cookies: {},
      }
      mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
      }
      mockNext = vi.fn()
      vi.clearAllMocks()
    })

    it('should authenticate valid token', async () => {
      mockReq.headers.authorization = 'Bearer valid-token'
      const mockDecoded = { id: 1, email: 'test@example.com' }
      vi.mocked(jwt.verify).mockReturnValue(mockDecoded)

      await authenticate(mockReq, mockRes, mockNext)

      expect(mockReq.user).toEqual(mockDecoded)
      expect(mockNext).toHaveBeenCalled()
      expect(mockRes.status).not.toHaveBeenCalled()
    })

    it('should return 401 if no token provided', async () => {
      await authenticate(mockReq, mockRes, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(401)
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'No token provided',
      })
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should return 401 for invalid token', async () => {
      mockReq.headers.authorization = 'Bearer invalid-token'
      const error = new Error('Invalid token')
      error.name = 'JsonWebTokenError'
      vi.mocked(jwt.verify).mockImplementation(() => {
        throw error
      })

      await authenticate(mockReq, mockRes, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(401)
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Invalid token',
      })
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should handle token without Bearer prefix', async () => {
      mockReq.headers.authorization = 'invalid-format'

      await authenticate(mockReq, mockRes, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(401)
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'No token provided',
      })
    })

    it('should return 401 for a blacklisted (revoked) token without calling jwt.verify', async () => {
      mockReq.headers.authorization = 'Bearer revoked-token'
      vi.mocked(TokenBlacklist.isBlacklisted).mockResolvedValueOnce(true)

      await authenticate(mockReq, mockRes, mockNext)

      expect(TokenBlacklist.isBlacklisted).toHaveBeenCalled()
      expect(jwt.verify).not.toHaveBeenCalled()
      expect(mockRes.status).toHaveBeenCalledWith(401)
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Token has been revoked',
      })
      expect(mockNext).not.toHaveBeenCalled()
    })
  })

  describe('blacklistToken', () => {
    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('should record the token hash in the blacklist, keyed to its own expiry', async () => {
      const futureExp = Math.floor(Date.now() / 1000) + 3600
      vi.mocked(jwt.decode).mockReturnValue({ exp: futureExp })

      await blacklistToken('some-token')

      expect(TokenBlacklist.add).toHaveBeenCalledTimes(1)
      const [tokenHash, expiresAt] = vi.mocked(TokenBlacklist.add).mock.calls[0]
      expect(tokenHash).toMatch(/^[a-f0-9]{64}$/) // sha256 hex digest
      expect(expiresAt).toEqual(new Date(futureExp * 1000))
    })

    it('should fall back to a 7-day expiry if the token has no exp claim', async () => {
      vi.mocked(jwt.decode).mockReturnValue(null)

      await blacklistToken('some-token')

      const [, expiresAt] = vi.mocked(TokenBlacklist.add).mock.calls[0]
      const sevenDaysFromNow = Date.now() + 7 * 24 * 60 * 60 * 1000
      expect(expiresAt.getTime()).toBeGreaterThan(Date.now())
      expect(expiresAt.getTime()).toBeLessThanOrEqual(sevenDaysFromNow + 1000)
    })
  })
})
