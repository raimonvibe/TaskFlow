import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSign = vi.fn()
const mockVerify = vi.fn()

vi.mock('jsonwebtoken', () => ({
  default: {
    sign: mockSign,
    verify: mockVerify,
  },
  sign: mockSign,
  verify: mockVerify,
}))

import { authenticate, generateToken, verifyToken } from './auth.js'

vi.mock('../config/index.js', () => ({
  default: {
    jwtSecret: 'test-secret',
    jwtExpiresIn: '1h',
  },
}))

describe('Auth Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('generateToken', () => {
    it('should generate a valid JWT token', () => {
      const payload = { id: 1, email: 'test@example.com' }
      mockSign.mockReturnValue('mock-token')

      const token = generateToken(payload)

      expect(mockSign).toHaveBeenCalledWith(payload, 'test-secret', {
        expiresIn: '1h',
      })
      expect(token).toBe('mock-token')
    })
  })

  describe('verifyToken', () => {
    it('should verify and decode a valid token', () => {
      const mockDecoded = { id: 1, email: 'test@example.com' }
      mockVerify.mockReturnValue(mockDecoded)

      const decoded = verifyToken('valid-token')

      expect(mockVerify).toHaveBeenCalledWith('valid-token', 'test-secret')
      expect(decoded).toEqual(mockDecoded)
    })

    it('should throw error for invalid token', () => {
      mockVerify.mockImplementation(() => {
        throw new Error('Invalid token')
      })

      expect(() => verifyToken('invalid-token')).toThrow('Invalid token')
    })
  })

  describe('authenticate middleware', () => {
    let mockReq, mockRes, mockNext

    beforeEach(() => {
      mockReq = {
        headers: {},
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
      mockVerify.mockReturnValue(mockDecoded)

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
      mockVerify.mockImplementation(() => {
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
