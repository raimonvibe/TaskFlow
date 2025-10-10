import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { register, login, getCurrentUser } from './authController.js'
import { User } from '../models/User.js'
import { generateToken } from '../middleware/auth.js'

// Mock dependencies
jest.mock('../models/User.js')
jest.mock('../middleware/auth.js')
jest.mock('../utils/metrics.js', () => ({
  authAttempts: { inc: jest.fn() },
}))
jest.mock('../utils/logger.js', () => ({
  default: { info: jest.fn(), error: jest.fn() },
}))

describe('Auth Controller', () => {
  let mockReq, mockRes, mockNext

  beforeEach(() => {
    mockReq = {
      body: {},
      user: {},
    }
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    }
    mockNext = jest.fn()

    // Clear all mocks
    jest.clearAllMocks()
  })

  describe('register', () => {
    it('should register a new user successfully', async () => {
      mockReq.body = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      }

      const mockUser = {
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
        created_at: new Date(),
      }

      User.findByEmail.mockResolvedValue(null)
      User.create.mockResolvedValue(mockUser)
      generateToken.mockReturnValue('mock-jwt-token')

      await register(mockReq, mockRes, mockNext)

      expect(User.findByEmail).toHaveBeenCalledWith('test@example.com')
      expect(User.create).toHaveBeenCalledWith('Test User', 'test@example.com', 'password123')
      expect(mockRes.status).toHaveBeenCalledWith(201)
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'User created successfully',
        token: 'mock-jwt-token',
        user: {
          id: 1,
          name: 'Test User',
          email: 'test@example.com',
        },
      })
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should return 409 if user already exists', async () => {
      mockReq.body = {
        name: 'Test User',
        email: 'existing@example.com',
        password: 'password123',
      }

      User.findByEmail.mockResolvedValue({ id: 1, email: 'existing@example.com' })

      await register(mockReq, mockRes, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(409)
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'User already exists' })
      expect(User.create).not.toHaveBeenCalled()
    })

    it('should handle errors and call next', async () => {
      mockReq.body = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      }

      const error = new Error('Database error')
      User.findByEmail.mockRejectedValue(error)

      await register(mockReq, mockRes, mockNext)

      expect(mockNext).toHaveBeenCalledWith(error)
    })
  })

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      mockReq.body = {
        email: 'test@example.com',
        password: 'password123',
      }

      const mockUser = {
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
        password: 'hashed-password',
      }

      User.findByEmail.mockResolvedValue(mockUser)
      User.comparePassword.mockResolvedValue(true)
      generateToken.mockReturnValue('mock-jwt-token')

      await login(mockReq, mockRes, mockNext)

      expect(User.findByEmail).toHaveBeenCalledWith('test@example.com')
      expect(User.comparePassword).toHaveBeenCalledWith('password123', 'hashed-password')
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Login successful',
        token: 'mock-jwt-token',
        user: {
          id: 1,
          name: 'Test User',
          email: 'test@example.com',
        },
      })
    })

    it('should return 401 if user not found', async () => {
      mockReq.body = {
        email: 'nonexistent@example.com',
        password: 'password123',
      }

      User.findByEmail.mockResolvedValue(null)

      await login(mockReq, mockRes, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(401)
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Invalid credentials' })
      expect(User.comparePassword).not.toHaveBeenCalled()
    })

    it('should return 401 if password is invalid', async () => {
      mockReq.body = {
        email: 'test@example.com',
        password: 'wrongpassword',
      }

      const mockUser = {
        id: 1,
        email: 'test@example.com',
        password: 'hashed-password',
      }

      User.findByEmail.mockResolvedValue(mockUser)
      User.comparePassword.mockResolvedValue(false)

      await login(mockReq, mockRes, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(401)
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Invalid credentials' })
      expect(generateToken).not.toHaveBeenCalled()
    })

    it('should handle errors and call next', async () => {
      mockReq.body = {
        email: 'test@example.com',
        password: 'password123',
      }

      const error = new Error('Database error')
      User.findByEmail.mockRejectedValue(error)

      await login(mockReq, mockRes, mockNext)

      expect(mockNext).toHaveBeenCalledWith(error)
    })
  })

  describe('getCurrentUser', () => {
    it('should return current user', async () => {
      mockReq.user = { id: 1 }

      const mockUser = {
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
        created_at: new Date(),
      }

      User.findById.mockResolvedValue(mockUser)

      await getCurrentUser(mockReq, mockRes, mockNext)

      expect(User.findById).toHaveBeenCalledWith(1)
      expect(mockRes.json).toHaveBeenCalledWith({ user: mockUser })
    })

    it('should return 404 if user not found', async () => {
      mockReq.user = { id: 999 }

      User.findById.mockResolvedValue(null)

      await getCurrentUser(mockReq, mockRes, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(404)
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'User not found' })
    })

    it('should handle errors and call next', async () => {
      mockReq.user = { id: 1 }

      const error = new Error('Database error')
      User.findById.mockRejectedValue(error)

      await getCurrentUser(mockReq, mockRes, mockNext)

      expect(mockNext).toHaveBeenCalledWith(error)
    })
  })
})
