import { describe, it, expect, vi, beforeEach } from 'vitest'
import jwt from 'jsonwebtoken'

vi.mock('jsonwebtoken')

import { authenticate, generateToken, verifyToken } from './auth.js'

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

    it('should authenticate valid token', () => {
      mockReq.headers.authorization = 'Bearer valid-token'
      const mockDecoded = { id: 1, email: 'test@example.com' }
      vi.mocked(jwt.verify).mockReturnValue(mockDecoded)

      authenticate(mockReq, mockRes, mockNext)

      expect(mockReq.user).toEqual(mockDecoded)
      expect(mockNext).toHaveBeenCalled()
      expect(mockRes.status).not.toHaveBeenCalled()
    })

    it('should return 401 if no token provided', () => {
      authenticate(mockReq, mockRes, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(401)
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'No token provided',
      })
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should return 401 for invalid token', () => {
      mockReq.headers.authorization = 'Bearer invalid-token'
      const error = new Error('Invalid token')
      error.name = 'JsonWebTokenError'
      vi.mocked(jwt.verify).mockImplementation(() => {
        throw error
      })

      authenticate(mockReq, mockRes, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(401)
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Invalid token',
      })
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should handle token without Bearer prefix', () => {
      mockReq.headers.authorization = 'invalid-format'

      authenticate(mockReq, mockRes, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(401)
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'No token provided',
      })
    })
  })
})
