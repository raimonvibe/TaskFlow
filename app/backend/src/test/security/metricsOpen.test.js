import { describe, it, expect, beforeAll } from 'vitest'
import request from 'supertest'

// Counterpart to metrics.test.js - kept in a separate file/module registry
// so this scenario's app.js import sees METRICS_KEY unset, without needing
// to tear down and rebuild the other file's prom-client Registry.
describe('Security: /metrics endpoint gating (METRICS_KEY not configured)', () => {
  let app

  beforeAll(async () => {
    delete process.env.METRICS_KEY
    app = (await import('../helpers/testApp.js')).default
  })

  it('stays open (200, no key required) - the local/dev default', async () => {
    const res = await request(app).get('/metrics')
    expect(res.status).toBe(200)
  })
})
