import request from 'supertest'
import app from '../../app.js'
import { query } from '../../config/database.js'

let counter = 0

// All test emails share the "sectest-" marker so every security test file
// can clean up after itself (and after a crashed previous run) with one
// LIKE query, regardless of which sub-scenario ("owner", "attacker", "xss",
// ...) generated them.
export const uniqueEmail = (tag = 'user') => {
  counter += 1
  return `sectest-${tag}-${Date.now()}-${counter}@example.com`
}

// Registers a fresh user through the real HTTP API (not User.create called
// directly) so every security test exercises the exact same code path a
// real client would - validation, rate limiting, hashing, token issuance
// included.
export const registerAndLogin = async (overrides = {}) => {
  const email = overrides.email || uniqueEmail()
  const password = overrides.password || 'ValidPass123'
  const name = overrides.name || 'Security Test User'

  const res = await request(app).post('/api/auth/register').send({ name, email, password })

  if (res.status !== 201) {
    throw new Error(`Failed to register test user: ${res.status} ${JSON.stringify(res.body)}`)
  }

  return { token: res.body.token, user: res.body.user, email, password }
}

export const cleanupAllTestUsers = async () => {
  // ON DELETE CASCADE on tasks.user_id takes care of any tasks these users
  // created.
  await query('DELETE FROM users WHERE email LIKE $1', ['sectest-%@example.com'])
}
