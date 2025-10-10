import { describe, it, expect, vi, beforeEach } from 'vitest'
import { login, register, getCurrentUser } from './auth'
import axios from './axios'

vi.mock('./axios')

describe('Auth API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('login', () => {
    it('should call login endpoint with credentials', async () => {
      const credentials = { email: 'test@example.com', password: 'password123' }
      const mockResponse = {
        data: {
          token: 'mock-token',
          user: { id: 1, email: 'test@example.com' },
        },
      }

      axios.post.mockResolvedValue(mockResponse)

      const result = await login(credentials)

      expect(axios.post).toHaveBeenCalledWith('/auth/login', credentials)
      expect(result).toEqual(mockResponse.data)
    })

    it('should handle login errors', async () => {
      const credentials = { email: 'test@example.com', password: 'wrong' }
      const error = new Error('Invalid credentials')

      axios.post.mockRejectedValue(error)

      await expect(login(credentials)).rejects.toThrow('Invalid credentials')
    })
  })

  describe('register', () => {
    it('should call register endpoint with user data', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      }
      const mockResponse = {
        data: {
          token: 'mock-token',
          user: { id: 1, name: 'Test User', email: 'test@example.com' },
        },
      }

      axios.post.mockResolvedValue(mockResponse)

      const result = await register(userData)

      expect(axios.post).toHaveBeenCalledWith('/auth/register', userData)
      expect(result).toEqual(mockResponse.data)
    })

    it('should handle registration errors', async () => {
      const userData = { email: 'existing@example.com', password: 'password123' }
      const error = new Error('User already exists')

      axios.post.mockRejectedValue(error)

      await expect(register(userData)).rejects.toThrow('User already exists')
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

      const result = await getCurrentUser()

      expect(axios.get).toHaveBeenCalledWith('/auth/me')
      expect(result).toEqual(mockResponse.data)
    })

    it('should handle errors when fetching user', async () => {
      const error = new Error('Unauthorized')

      axios.get.mockRejectedValue(error)

      await expect(getCurrentUser()).rejects.toThrow('Unauthorized')
    })
  })
})
