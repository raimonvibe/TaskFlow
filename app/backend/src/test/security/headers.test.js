import { describe, it, expect } from 'vitest'
import request from 'supertest'
import app from '../helpers/testApp.js'

describe('Security: HTTP security headers & CORS', () => {
  describe('helmet defaults', () => {
    it('sends the core helmet security headers and hides the framework fingerprint', async () => {
      const res = await request(app).get('/health')

      expect(res.headers['x-content-type-options']).toBe('nosniff')
      expect(res.headers['x-dns-prefetch-control']).toBe('off')
      expect(res.headers['x-download-options']).toBe('noopen')
      expect(res.headers['strict-transport-security']).toBeDefined()
      // Helmet's hidePoweredBy strips this outright, it doesn't fake it.
      expect(res.headers['x-powered-by']).toBeUndefined()
    })
  })

  describe('CORS allowlist', () => {
    it('reflects Access-Control-Allow-Origin for an allowed origin', async () => {
      const res = await request(app).get('/health').set('Origin', 'http://localhost:5173')

      expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173')
      expect(res.headers['access-control-allow-credentials']).toBe('true')
    })

    it('does not grant CORS access to an arbitrary, non-allowlisted origin', async () => {
      const res = await request(app).get('/health').set('Origin', 'https://evil-attacker.example')

      expect(res.headers['access-control-allow-origin']).not.toBe('https://evil-attacker.example')
    })
  })

  describe('/health does not leak internal details', () => {
    it('only ever returns status, timestamp, and database - nothing else', async () => {
      const res = await request(app).get('/health')

      expect(res.status).toBe(200)
      expect(Object.keys(res.body).sort()).toEqual(['database', 'status', 'timestamp'])
    })
  })

  describe('unknown routes', () => {
    it("returns a generic 404 that doesn't reveal the app's internal route structure", async () => {
      const res = await request(app).get('/api/some-endpoint-that-does-not-exist')

      expect(res.status).toBe(404)
      expect(res.body).not.toHaveProperty('stack')
    })
  })
})
