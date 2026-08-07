import { describe, it, expect } from 'vitest'
import { HealthService } from './HealthService.js'
import type { DatabaseHealth, PoolStats } from '../ports/IDatabaseHealth.js'
import { FixedClock } from '../../test/fakes/FixedClock.js'
import { RecordingLogger } from '../../test/fakes/RecordingLogger.js'

const NO_POOL: PoolStats = { total: 0, idle: 0, waiting: 0 }
const NOW = new Date('2026-01-01T12:00:00.000Z')

function databaseThat(ping: () => Promise<void>): DatabaseHealth {
  return { ping, getPoolStats: () => NO_POOL }
}

describe('HealthService', () => {
  it('reports healthy when the database answers', async () => {
    const service = new HealthService(
      databaseThat(async () => {}),
      new FixedClock(NOW),
      new RecordingLogger()
    )

    expect(await service.check()).toEqual({
      healthy: true,
      timestamp: NOW.toISOString(),
      database: 'connected',
    })
  })

  it('reports unhealthy instead of throwing when the database is unreachable', async () => {
    const service = new HealthService(
      databaseThat(() => Promise.reject(new Error('ECONNREFUSED 10.0.0.4:5432'))),
      new FixedClock(NOW),
      new RecordingLogger()
    )

    // The endpoint's whole job is to answer when things are broken, so a
    // dead database is a report, not an exception.
    expect(await service.check()).toEqual({
      healthy: false,
      timestamp: NOW.toISOString(),
      database: 'disconnected',
    })
  })

  it('keeps the driver error out of the report but logs it server-side', async () => {
    const logger = new RecordingLogger()
    const service = new HealthService(
      databaseThat(() => Promise.reject(new Error('ECONNREFUSED 10.0.0.4:5432'))),
      new FixedClock(NOW),
      logger
    )

    // /health is public and unauthenticated - a driver message names the
    // host, the port, and the database.
    const report = await service.check()
    expect(JSON.stringify(report)).not.toContain('10.0.0.4')

    expect(logger.lines).toContainEqual({
      level: 'error',
      message: 'Health check failed',
      meta: { error: 'ECONNREFUSED 10.0.0.4:5432' },
    })
  })
})
