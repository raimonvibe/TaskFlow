import { describe, it, expect, afterAll } from 'vitest'
import request from 'supertest'
import app from '../helpers/testApp.js'
import { uniqueEmail, cleanupAllTestUsers } from '../helpers/testUser.js'
import config from '../../config/index.js'

// Kept in its own file, deliberately: express-rate-limit's default store is
// an in-memory Map scoped to this one Express app instance/process. Vitest
// gives each test file its own module registry (a fresh import of app.js),
// so hammering /api/auth/login here can't bleed 429s into the unrelated
// assertions in authentication.test.js or authorization.test.js.
describe('Security: Auth rate limiting', () => {
  afterAll(async () => {
    await cleanupAllTestUsers()
  })

  it(`locks out further attempts after ${config.rateLimit.authMax} failed logins from the same IP`, async () => {
    const email = uniqueEmail('lockout')
    // Register for real so we're hammering the "wrong password" branch of a
    // legitimate account, not the "unknown email" branch.
    await request(app)
      .post('/api/auth/register')
      .send({ name: 'Rate Limit Test', email, password: 'ValidPass123' })

    for (let i = 0; i < config.rateLimit.authMax; i++) {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email, password: 'WrongPassword1' })
      // skipSuccessfulRequests only ignores 2xx responses - every one of
      // these 401s should be counted toward the limit.
      expect(res.status).toBe(401)
    }

    const blocked = await request(app)
      .post('/api/auth/login')
      .send({ email, password: 'WrongPassword1' })

    expect(blocked.status).toBe(429)
    expect(blocked.body.message).toMatch(/too many attempts/i)
    // standardHeaders: true / legacyHeaders: false in authRoutes.js.
    expect(blocked.headers).toHaveProperty('ratelimit-limit')
    expect(blocked.headers).not.toHaveProperty('x-ratelimit-limit')
  })
})
