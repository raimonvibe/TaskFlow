import { describe, it, expect, beforeAll } from 'vitest'
import request from 'supertest'

// app.js (and transitively config/index.js) reads process.env.METRICS_KEY at
// import time, so METRICS_KEY has to be set *before* app.js is first
// imported in this file - a dynamic import() in beforeAll, not a static
// top-level import (which ES modules hoist above everything else, including
// the env var assignment). See metricsOpen.test.js for the "key not
// configured" counterpart - kept in its own file rather than reusing this
// module (via vi.resetModules() + re-import) because prom-client's Registry
// doesn't tolerate being torn down and rebuilt more than once per process.
describe('Security: /metrics endpoint gating (METRICS_KEY configured)', () => {
  let app

  beforeAll(async () => {
    process.env.METRICS_KEY = 'test-metrics-secret'
    app = (await import('../../app.js')).default
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
