import { describe, it, expect, afterAll } from 'vitest'
import request from 'supertest'
import app from '../helpers/testApp.js'
import { uniqueEmail, cleanupAllTestUsers } from '../helpers/testUser.js'
import config from '../../config/index.js'

// Separate file from rateLimiting.test.js on purpose - that file deliberately
// exhausts the auth limiter's counter for its app instance, which would make
// this test flaky if it ran against the same in-memory store.
describe('Security: Auth rate limiting - skipSuccessfulRequests', () => {
  afterAll(async () => {
    await cleanupAllTestUsers()
  })

  it('does not count successful registrations toward the auth rate limit', async () => {
    // More successful, unique registrations in a row than the auth limit
    // allows - if skipSuccessfulRequests were broken, this would start
    // returning 429 partway through instead of 201 every time.
    for (let i = 0; i < config.rateLimit.authMax + 2; i++) {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Rate Limit Skip Test',
          email: uniqueEmail(`skip-success-${i}`),
          password: 'ValidPass123',
        })
      expect(res.status).toBe(201)
    }
  })
})
