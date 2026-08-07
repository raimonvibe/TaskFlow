import { describe, it, expect, beforeAll } from 'vitest'
import type { Express } from 'express'
import request from 'supertest'

// testApp.ts builds its container - and therefore reads METRICS_KEY through
// Config - at import time, so METRICS_KEY has to be set *before* that first
// import. Hence a dynamic import() in beforeAll rather than a static
// top-level one, which ES modules hoist above everything else including the
// env var assignment. metricsOpen.test.ts is the "key not configured"
// counterpart, in its own file so that each scenario gets its own module
// registry and its own Config singleton.
describe('Security: /metrics endpoint gating (METRICS_KEY configured)', () => {
  let app: Express

  beforeAll(async () => {
    process.env.METRICS_KEY = 'test-metrics-secret'
    app = (await import('../helpers/testApp.js')).default
  })

  it('returns 404 (not 401/403) with no key', async () => {
    const res = await request(app).get('/metrics')
    // 404, not 401/403 - the endpoint's existence isn't confirmed to an
    // unauthenticated caller either way.
    expect(res.status).toBe(404)
  })

  it('returns 404 with the wrong key', async () => {
    const res = await request(app).get('/metrics').set('X-Metrics-Key', 'guess')
    expect(res.status).toBe(404)
  })

  it('returns Prometheus-format metrics with the correct key', async () => {
    const res = await request(app).get('/metrics').set('X-Metrics-Key', 'test-metrics-secret')
    expect(res.status).toBe(200)
    expect(res.text).toContain('http_requests_total')
  })
})
