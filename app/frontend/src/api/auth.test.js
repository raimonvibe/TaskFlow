import { describe, it, expect, vi, beforeEach } from 'vitest'
import { authAPI } from './auth'
import axios from './axios'

vi.mock('./axios')

describe('Auth API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('login', () => {
    it('should call login endpoint with credentials', async () => {
      const email = 'test@example.com'
      const password = 'password123'
      const mockResponse = {
        data: {
          token: 'mock-token',
          user: { id: 1, email: 'test@example.com' },
        },
      }

      axios.post.mockResolvedValue(mockResponse)

      const result = await authAPI.login(email, password)

      expect(axios.post).toHaveBeenCalledWith('/api/auth/login', { email, password })
      expect(result).toEqual(mockResponse.data)
    })

    it('should handle login errors', async () => {
      const email = 'test@example.com'
      const password = 'wrong'
      const error = new Error('Invalid credentials')

      axios.post.mockRejectedValue(error)

      await expect(authAPI.login(email, password)).rejects.toThrow('Invalid credentials')
    })
  })

  describe('register', () => {
    it('should call register endpoint with user data', async () => {
      const name = 'Test User'
      const email = 'test@example.com'
      const password = 'password123'
      const mockResponse = {
        data: {
          token: 'mock-token',
          user: { id: 1, name: 'Test User', email: 'test@example.com' },
        },
      }

      axios.post.mockResolvedValue(mockResponse)

      const result = await authAPI.register(name, email, password)

      expect(axios.post).toHaveBeenCalledWith('/api/auth/register', { name, email, password })
      expect(result).toEqual(mockResponse.data)
    })

    it('should handle registration errors', async () => {
      const name = 'Test User'
      const email = 'existing@example.com'
      const password = 'password123'
      const error = new Error('User already exists')

      axios.post.mockRejectedValue(error)

      await expect(authAPI.register(name, email, password)).rejects.toThrow('User already exists')
    })
  })

  describe('getCurrentUser', () => {
    it('should fetch current user data', async () => {
      const mockResponse = {
        data: {
          user: { id: 1, name: 'Test User', email: 'test@example.com' },
        },
      }

      axios.get.mockResolvedValue(mockResponse)

      const result = await authAPI.getCurrentUser()

      expect(axios.get).toHaveBeenCalledWith('/api/auth/me')
      expect(result).toEqual(mockResponse.data)
    })

    it('should handle errors when fetching user', async () => {
      const error = new Error('Unauthorized')

      axios.get.mockRejectedValue(error)

      await expect(authAPI.getCurrentUser()).rejects.toThrow('Unauthorized')
    })
  })
})
