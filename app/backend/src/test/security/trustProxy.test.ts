import { describe, it, expect, afterEach } from 'vitest'
import request from 'supertest'
import type { Express } from 'express'
import { Config } from '../../infrastructure/config/Config.js'
import { createContainer, type Container } from '../../composition/container.js'
import { createApp } from '../../presentation/http/app.js'

/**
 * Own Express app, not the shared testApp: express-rate-limit's store is
 * per process/app, and these assertions need a tiny max plus an explicit
 * trust-proxy setting that the rest of the suite must not inherit.
 *
 * Hits /api/nope so the generic /api/ limiter is the only thing that
 * counts - no auth, no database.
 */
let container: Container | undefined

function appWith(env: NodeJS.ProcessEnv): Express {
  const config = new Config({
    ...process.env,
    NODE_ENV: 'test',
    RATE_LIMIT_WINDOW_MS: '60000',
    RATE_LIMIT_MAX_REQUESTS: '3',
    AUTH_RATE_LIMIT_MAX_REQUESTS: '100',
    ...env,
  })
  container = createContainer({ config })
  return createApp(container)
}

describe('Security: trust proxy and rate-limit identity', () => {
  afterEach(async () => {
    await container?.db.close()
    container = undefined
  })

  it('keys the limiter by X-Forwarded-For when trust proxy is on', async () => {
    const app = appWith({ TRUST_PROXY: '1' })

    for (let i = 0; i < 3; i++) {
      const res = await request(app).get('/api/nope').set('X-Forwarded-For', '203.0.113.10')
      expect(res.status).toBe(404)
    }

    const blocked = await request(app).get('/api/nope').set('X-Forwarded-For', '203.0.113.10')
    expect(blocked.status).toBe(429)

    // A different forwarded client still has its own budget - which is the
    // whole point of trusting the proxy hop, rather than collapsing
    // everyone onto Render's edge IP.
    const other = await request(app).get('/api/nope').set('X-Forwarded-For', '203.0.113.11')
    expect(other.status).toBe(404)
  })

  it('does not 500 when a reverse proxy sets X-Forwarded-For', async () => {
    const app = appWith({ TRUST_PROXY: '1' })

    const res = await request(app).get('/api/nope').set('X-Forwarded-For', '198.51.100.7')

    expect(res.status).toBe(404)
    expect(res.body.message).not.toMatch(/X-Forwarded-For/i)
  })
})
