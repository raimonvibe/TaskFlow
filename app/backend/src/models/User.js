import { query } from '../config/database.js'
import bcrypt from 'bcryptjs'

export const User = {
  // Create a new user
  create: async (name, email, password) => {
    const hashedPassword = await bcrypt.hash(password, 10)
    const result = await query(
      'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email, created_at',
      [name, email, hashedPassword]
    )
    return result.rows[0]
  },

  // Find user by email
  findByEmail: async email => {
    const result = await query('SELECT * FROM users WHERE email = $1', [email])
    return result.rows[0]
  },

  // Find user by ID
  findById: async id => {
    const result = await query('SELECT id, name, email, created_at FROM users WHERE id = $1', [id])
    return result.rows[0]
  },

  // Compare password
  comparePassword: async (plainPassword, hashedPassword) => {
    return await bcrypt.compare(plainPassword, hashedPassword)
  },

  // Get all users (admin only)
  findAll: async () => {
    const result = await query('SELECT id, name, email, created_at FROM users ORDER BY created_at DESC')
    return result.rows
  },

  // Update user
  update: async (id, updates) => {
    const fields = []
    const values = []
    let paramCount = 1

    Object.entries(updates).forEach(([key, value]) => {
      if (key === 'password') {
        value = bcrypt.hashSync(value, 10)
      }
      fields.push(`${key} = $${paramCount}`)
      values.push(value)
      paramCount++
    })

    values.push(id)
    const result = await query(
      `UPDATE users SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${paramCount} RETURNING id, name, email, updated_at`,
      values
    )
    return result.rows[0]
  },

  // Delete user
  delete: async id => {
    const result = await query('DELETE FROM users WHERE id = $1 RETURNING id', [id])
    return result.rows[0]
  },
}
