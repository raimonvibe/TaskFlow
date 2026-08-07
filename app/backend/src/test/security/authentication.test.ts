import { describe, it, expect, afterAll } from 'vitest'
import request from 'supertest'
import jwt from 'jsonwebtoken'
import app from '../helpers/testApp.js'
import { registerAndLogin, uniqueEmail, cleanupAllTestUsers } from '../helpers/testUser.js'

// Integration tests that hit the real Express app and a real Postgres test
// database (same pattern as models/User.test.js), rather than mocking the
// HTTP layer - the point is to catch regressions in how routes, middleware,
// validation, and the jsonwebtoken library actually compose together, not
// just each unit in isolation.
describe('Security: Authentication', () => {
  afterAll(async () => {
    await cleanupAllTestUsers()
  })

  describe('registration hardening', () => {
    it('rejects passwords shorter than 8 characters', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Test', email: uniqueEmail('short-pw'), password: 'short1' })

      expect(res.status).toBe(400)
      expect(res.body.errors.some((e: { field: string }) => e.field === 'password')).toBe(true)
    })

    it('rejects an invalid email format', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Test', email: 'not-an-email', password: 'ValidPass123' })

      expect(res.status).toBe(400)
    })

    it('rejects a missing name', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: uniqueEmail('no-name'), password: 'ValidPass123' })

      expect(res.status).toBe(400)
    })

    it('never returns the password hash in the response', async () => {
      const email = uniqueEmail('no-hash-leak')
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Test', email, password: 'ValidPass123' })

      expect(res.status).toBe(201)
      expect(res.body.user.password).toBeUndefined()
      // Belt-and-braces: no bcrypt hash anywhere in the payload at all.
      expect(JSON.stringify(res.body)).not.toMatch(/\$2[aby]\$/)
    })

    it('rejects registering the same email twice', async () => {
      const email = uniqueEmail('dup-email')
      await request(app)
        .post('/api/auth/register')
        .send({ name: 'Test', email, password: 'ValidPass123' })

      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Test', email, password: 'ValidPass123' })

      expect(res.status).toBe(409)
    })
  })

  describe('login - no user enumeration', () => {
    it('returns an identical status and body for a wrong password vs. a non-existent email', async () => {
      const { email } = await registerAndLogin({ email: uniqueEmail('enum-check') })

      const wrongPassword = await request(app)
        .post('/api/auth/login')
        .send({ email, password: 'TotallyWrongPass1' })

      const nonExistentUser = await request(app)
        .post('/api/auth/login')
        .send({ email: uniqueEmail('does-not-exist'), password: 'TotallyWrongPass1' })

      expect(wrongPassword.status).toBe(401)
      expect(nonExistentUser.status).toBe(401)
      // A response that differs here (message content, not timing) tells an
      // attacker which emails are registered - both branches in
      // authController.login are written to return an identical body.
      expect(wrongPassword.body).toEqual(nonExistentUser.body)
    })

    it('never returns the password hash on successful login', async () => {
      const { email, password } = await registerAndLogin({ email: uniqueEmail('login-no-hash') })
      const res = await request(app).post('/api/auth/login').send({ email, password })

      expect(res.status).toBe(200)
      expect(res.body.user.password).toBeUndefined()
    })
  })

  describe('JWT verification', () => {
    it('rejects a token with a tampered payload', async () => {
      const { token } = await registerAndLogin({ email: uniqueEmail('tamper') })
      const [header, , signature] = token.split('.')
      const forgedPayload = Buffer.from(
        JSON.stringify({
          id: 999999,
          email: 'attacker@example.com',
          iss: 'taskflow-api',
          aud: 'taskflow-client',
        })
      ).toString('base64url')
      const tamperedToken = `${header}.${forgedPayload}.${signature}`

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${tamperedToken}`)

      expect(res.status).toBe(401)
    })

    it('rejects an "alg: none" token (classic JWT signature-bypass attack)', async () => {
      const forgedHeader = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString(
        'base64url'
      )
      const forgedPayload = Buffer.from(
        JSON.stringify({
          id: 1,
          email: 'attacker@example.com',
          iss: 'taskflow-api',
          aud: 'taskflow-client',
        })
      ).toString('base64url')
      const forgedToken = `${forgedHeader}.${forgedPayload}.`

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${forgedToken}`)

      // authenticate() passes { algorithms: ['HS256'] } to jwt.verify
      // specifically to close this off - jsonwebtoken rejects "none" before
      // it ever gets treated as "no signature required".
      expect(res.status).toBe(401)
    })

    it('rejects a token signed with a different secret', async () => {
      const forged = jwt.sign({ id: 1, email: 'attacker@example.com' }, 'not-the-real-secret', {
        expiresIn: '1h',
        issuer: 'taskflow-api',
        audience: 'taskflow-client',
      })

      const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${forged}`)

      expect(res.status).toBe(401)
    })

    it('rejects requests with no Authorization header', async () => {
      const res = await request(app).get('/api/auth/me')
      expect(res.status).toBe(401)
    })

    it('rejects a malformed Authorization header (missing "Bearer " prefix)', async () => {
      const { token } = await registerAndLogin({ email: uniqueEmail('malformed-header') })
      const res = await request(app).get('/api/auth/me').set('Authorization', token)
      expect(res.status).toBe(401)
    })
  })

  describe('logout revokes the token (Postgres-backed blacklist)', () => {
    it('a token stops working immediately after logout, even though it has not expired', async () => {
      const { token } = await registerAndLogin({ email: uniqueEmail('logout-revoke') })

      const before = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`)
      expect(before.status).toBe(200)

      const logoutRes = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`)
      expect(logoutRes.status).toBe(200)

      const after = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`)
      expect(after.status).toBe(401)
      expect(after.body.message).toBe('Token has been revoked')
    })
  })
})
