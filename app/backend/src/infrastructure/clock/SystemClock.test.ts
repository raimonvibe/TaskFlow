import { describe, it, expect } from 'vitest'
import { SystemClock } from './SystemClock.js'

describe('SystemClock', () => {
  it('returns the current time', () => {
    const clock = new SystemClock()
    const before = Date.now()
    const now = clock.now()
    const after = Date.now()

    expect(now.getTime()).toBeGreaterThanOrEqual(before)
    expect(now.getTime()).toBeLessThanOrEqual(after)
  })

  it('returns a fresh Date each call', async () => {
    const clock = new SystemClock()
    const first = clock.now()
    await new Promise(resolve => setTimeout(resolve, 5))
    const second = clock.now()

    expect(second.getTime()).toBeGreaterThan(first.getTime())
  })
})
