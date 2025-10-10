import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals'
import { User } from './User.js'
import { query } from '../config/database.js'
import bcrypt from 'bcryptjs'

describe('User Model', () => {
  const testUser = {
    name: 'Test User',
    email: 'test@example.com',
    password: 'testpassword123',
  }

  beforeAll(async () => {
    // Setup test database tables if needed
  })

  afterAll(async () => {
    // Cleanup test data
    await query('DELETE FROM users WHERE email LIKE $1', ['test%@example.com'])
  })

  beforeEach(async () => {
    // Clean up before each test
    await query('DELETE FROM users WHERE email LIKE $1', ['test%@example.com'])
  })

  describe('create', () => {
    it('should create a new user with hashed password', async () => {
      const user = await User.create(testUser.name, testUser.email, testUser.password)

      expect(user).toBeDefined()
      expect(user.id).toBeDefined()
      expect(user.name).toBe(testUser.name)
      expect(user.email).toBe(testUser.email)
      expect(user.password).toBeUndefined() // Password should not be returned
      expect(user.created_at).toBeDefined()
    })

    it('should hash the password before storing', async () => {
      await User.create(testUser.name, testUser.email, testUser.password)
      const result = await query('SELECT password FROM users WHERE email = $1', [testUser.email])

      expect(result.rows[0].password).not.toBe(testUser.password)
      const isHashed = await bcrypt.compare(testUser.password, result.rows[0].password)
      expect(isHashed).toBe(true)
    })

    it('should throw error for duplicate email', async () => {
      await User.create(testUser.name, testUser.email, testUser.password)

      await expect(User.create(testUser.name, testUser.email, testUser.password)).rejects.toThrow()
    })
  })

  describe('findByEmail', () => {
    it('should find user by email', async () => {
      await User.create(testUser.name, testUser.email, testUser.password)
      const user = await User.findByEmail(testUser.email)

      expect(user).toBeDefined()
      expect(user.email).toBe(testUser.email)
      expect(user.name).toBe(testUser.name)
    })

    it('should return undefined for non-existent email', async () => {
      const user = await User.findByEmail('nonexistent@example.com')
      expect(user).toBeUndefined()
    })
  })

  describe('findById', () => {
    it('should find user by ID', async () => {
      const createdUser = await User.create(testUser.name, testUser.email, testUser.password)
      const user = await User.findById(createdUser.id)

      expect(user).toBeDefined()
      expect(user.id).toBe(createdUser.id)
      expect(user.email).toBe(testUser.email)
      expect(user.password).toBeUndefined() // Password should not be returned
    })

    it('should return undefined for non-existent ID', async () => {
      const user = await User.findById(999999)
      expect(user).toBeUndefined()
    })
  })

  describe('comparePassword', () => {
    it('should return true for correct password', async () => {
      await User.create(testUser.name, testUser.email, testUser.password)
      const fullUser = await User.findByEmail(testUser.email)
      const isValid = await User.comparePassword(testUser.password, fullUser.password)

      expect(isValid).toBe(true)
    })

    it('should return false for incorrect password', async () => {
      await User.create(testUser.name, testUser.email, testUser.password)
      const fullUser = await User.findByEmail(testUser.email)
      const isValid = await User.comparePassword('wrongpassword', fullUser.password)

      expect(isValid).toBe(false)
    })
  })

  describe('findAll', () => {
    it('should return all users', async () => {
      await User.create('User 1', 'test1@example.com', 'password123')
      await User.create('User 2', 'test2@example.com', 'password123')

      const users = await User.findAll()

      expect(users).toBeDefined()
      expect(users.length).toBeGreaterThanOrEqual(2)
      users.forEach(user => {
        expect(user.password).toBeUndefined()
      })
    })
  })

  describe('update', () => {
    it('should update user fields', async () => {
      const createdUser = await User.create(testUser.name, testUser.email, testUser.password)
      const updatedUser = await User.update(createdUser.id, { name: 'Updated Name' })

      expect(updatedUser).toBeDefined()
      expect(updatedUser.name).toBe('Updated Name')
      expect(updatedUser.email).toBe(testUser.email)
    })

    it('should hash password when updating', async () => {
      const createdUser = await User.create(testUser.name, testUser.email, testUser.password)
      await User.update(createdUser.id, { password: 'newpassword123' })

      const fullUser = await User.findByEmail(testUser.email)
      const isValid = await bcrypt.compare('newpassword123', fullUser.password)
      expect(isValid).toBe(true)
    })
  })

  describe('delete', () => {
    it('should delete user', async () => {
      const createdUser = await User.create(testUser.name, testUser.email, testUser.password)
      const deletedUser = await User.delete(createdUser.id)

      expect(deletedUser).toBeDefined()
      expect(deletedUser.id).toBe(createdUser.id)

      const user = await User.findById(createdUser.id)
      expect(user).toBeUndefined()
    })

    it('should return undefined for non-existent user', async () => {
      const result = await User.delete(999999)
      expect(result).toBeUndefined()
    })
  })
})
