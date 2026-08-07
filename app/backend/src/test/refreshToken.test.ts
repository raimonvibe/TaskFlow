import { describe, it, expect, afterAll } from 'vitest'
import request from 'supertest'
import app from './helpers/testApp.js'
import { registerAndLogin, uniqueEmail, cleanupAllTestUsers } from './helpers/testUser.js'

/**
 * Refresh-token rotation through the real Express stack + Postgres.
 * Complements RefreshTokenService unit tests by exercising the route,
 * validator, and repository transaction. See docs/NEXT_STEPS.md Option A.
 */
describe('refresh token rotation', () => {
  afterAll(async () => {
    await cleanupAllTestUsers()
  })

  it('login and register responses include refresh_token', async () => {
    const email = uniqueEmail('refresh-shape')
    const registered = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Refresh', email, password: 'ValidPass123' })

    expect(registered.status).toBe(201)
    expect(registered.body.token).toBeTruthy()
    expect(registered.body.refresh_token).toBeTruthy()

    const loggedIn = await request(app)
      .post('/api/auth/login')
      .send({ email, password: 'ValidPass123' })

    expect(loggedIn.status).toBe(200)
    expect(loggedIn.body.refresh_token).toBeTruthy()
  })

  it('POST /api/auth/refresh rotates and rejects reuse of the old token', async () => {
    const user = await registerAndLogin({ email: uniqueEmail('refresh-rotate') })
    expect(user.refreshToken).toBeTruthy()

    const first = await request(app)
      .post('/api/auth/refresh')
      .send({ refresh_token: user.refreshToken })

    expect(first.status).toBe(200)
    expect(first.body.token).toBeTruthy()
    expect(first.body.refresh_token).toBeTruthy()
    expect(first.body.refresh_token).not.toBe(user.refreshToken)

    const reuse = await request(app)
      .post('/api/auth/refresh')
      .send({ refresh_token: user.refreshToken })

    expect(reuse.status).toBe(401)

    // The honest successor is dead after reuse detection.
    const successor = await request(app)
      .post('/api/auth/refresh')
      .send({ refresh_token: first.body.refresh_token })

    expect(successor.status).toBe(401)
  })

  it('logout revokes refresh tokens for the user', async () => {
    const user = await registerAndLogin({ email: uniqueEmail('refresh-logout') })

    const loggedOut = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${user.token}`)

    expect(loggedOut.status).toBe(200)

    const refresh = await request(app)
      .post('/api/auth/refresh')
      .send({ refresh_token: user.refreshToken })

    expect(refresh.status).toBe(401)
  })
})
