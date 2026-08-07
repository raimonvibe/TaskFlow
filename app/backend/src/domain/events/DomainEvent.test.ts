import { describe, it, expect } from 'vitest'
import { DomainEvent } from './DomainEvent.js'

class TestEvent extends DomainEvent {
  get eventName(): string {
    return 'test.event'
  }
}

describe('DomainEvent', () => {
  it('defaults occurredAt to "now" when not given one', () => {
    const before = Date.now()
    const event = new TestEvent()
    const after = Date.now()

    expect(event.occurredAt.getTime()).toBeGreaterThanOrEqual(before)
    expect(event.occurredAt.getTime()).toBeLessThanOrEqual(after)
  })

  it('accepts an explicit occurredAt (useful for tests and replays)', () => {
    const fixed = new Date('2026-01-01T00:00:00.000Z')
    const event = new TestEvent(fixed)
    expect(event.occurredAt).toBe(fixed)
  })

  it('subclasses expose a stable eventName', () => {
    expect(new TestEvent().eventName).toBe('test.event')
  })
})
