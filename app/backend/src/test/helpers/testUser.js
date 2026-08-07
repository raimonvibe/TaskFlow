import request from 'supertest'
import app from '../../app.js'
import { query } from '../../config/database.js'

let counter = 0

// Unique per module instance. Vitest gives each test file its own module
// registry, so every file gets its own RUN_ID - which is what lets
// cleanupAllTestUsers() delete only the users *this* file created.
const RUN_ID = `${process.pid}${Math.random().toString(36).slice(2, 8)}`

// All test emails share the "sectest-" marker (so globalSetup can sweep
// leftovers from a crashed run) plus this file's RUN_ID, regardless of which
// sub-scenario ("owner", "attacker", "xss", ...) generated them.
export const uniqueEmail = (tag = 'user') => {
  counter += 1
  return `sectest-${tag}-${RUN_ID}-${counter}@example.com`
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

// Deletes only the users created by *this* test file. Vitest runs test files
// in parallel against one shared database, so a cleanup that matched every
// 'sectest-%' email would delete users another file was still using
// mid-request - the insert that followed hit a foreign-key violation (23503
// -> HTTP 400) or found its task already cascade-deleted (404), which is
// exactly the cross-file flake this scoping prevents.
export const cleanupAllTestUsers = async () => {
  // ON DELETE CASCADE on tasks.user_id takes care of any tasks these users
  // created.
  await query('DELETE FROM users WHERE email LIKE $1', [`sectest-%-${RUN_ID}-%@example.com`])
}
