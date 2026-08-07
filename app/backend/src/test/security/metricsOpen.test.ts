import { describe, it, expect, beforeAll } from 'vitest'
import type { Express } from 'express'
import request from 'supertest'

// Counterpart to metrics.test.ts - kept in a separate file/module registry
// so this scenario's testApp import sees METRICS_KEY unset, without needing
// to reset the other file's Config singleton.
describe('Security: /metrics endpoint gating (METRICS_KEY not configured)', () => {
  let app: Express

  beforeAll(async () => {
    delete process.env.METRICS_KEY
    app = (await import('../helpers/testApp.js')).default
  })

  it('stays open (200, no key required) - the local/dev default', async () => {
    const res = await request(app).get('/metrics')
    expect(res.status).toBe(200)
  })
})
