import { describe, it, expect, vi } from 'vitest'
import { InMemoryEventBus } from './InMemoryEventBus.js'
import { DomainEvent } from '../../domain/events/DomainEvent.js'
import type { Logger } from '../../application/ports/ILogger.js'

class TestEvent extends DomainEvent {
  constructor(readonly payload: string) {
    super()
  }
  get eventName(): string {
    return 'test.event'
  }
}

class OtherEvent extends DomainEvent {
  get eventName(): string {
    return 'other.event'
  }
}

const makeLogger = (): Logger => ({
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
})

describe('InMemoryEventBus', () => {
  it('delivers a published event to a subscriber of the same eventName', async () => {
    const bus = new InMemoryEventBus()
    const handler = vi.fn()
    bus.subscribe('test.event', handler)

    const event = new TestEvent('hello')
    await bus.publish(event)

    expect(handler).toHaveBeenCalledExactlyOnceWith(event)
  })

  it('delivers to every subscriber of that event, in subscription order', async () => {
    const bus = new InMemoryEventBus()
    const calls: string[] = []
    bus.subscribe('test.event', () => {
      calls.push('first')
    })
    bus.subscribe('test.event', () => {
      calls.push('second')
    })

    await bus.publish(new TestEvent('x'))

    expect(calls).toEqual(['first', 'second'])
  })

  it('does not deliver to subscribers of a different eventName', async () => {
    const bus = new InMemoryEventBus()
    const testHandler = vi.fn()
    const otherHandler = vi.fn()
    bus.subscribe('test.event', testHandler)
    bus.subscribe('other.event', otherHandler)

    await bus.publish(new TestEvent('x'))

    expect(testHandler).toHaveBeenCalledTimes(1)
    expect(otherHandler).not.toHaveBeenCalled()
  })

  it('publishing an event nobody subscribed to is a no-op, not an error', async () => {
    const bus = new InMemoryEventBus()
    await expect(bus.publish(new OtherEvent())).resolves.toBeUndefined()
  })

  it('waits for async handlers to settle before publish() resolves', async () => {
    const bus = new InMemoryEventBus()
    let resolved = false
    bus.subscribe('test.event', async () => {
      await new Promise(resolve => setTimeout(resolve, 10))
      resolved = true
    })

    await bus.publish(new TestEvent('x'))

    expect(resolved).toBe(true)
  })

  it('a subscriber throwing does not reject publish() or block other subscribers', async () => {
    const bus = new InMemoryEventBus()
    const goodHandler = vi.fn()
    bus.subscribe('test.event', () => {
      throw new Error('boom')
    })
    bus.subscribe('test.event', goodHandler)

    await expect(bus.publish(new TestEvent('x'))).resolves.toBeUndefined()
    expect(goodHandler).toHaveBeenCalledTimes(1)
  })

  it('logs a failing subscriber via the injected logger, when one is provided', async () => {
    const logger = makeLogger()
    const bus = new InMemoryEventBus(logger)
    bus.subscribe('test.event', () => {
      throw new Error('boom')
    })

    await bus.publish(new TestEvent('x'))

    expect(logger.error).toHaveBeenCalledExactlyOnceWith(
      'Event subscriber threw',
      expect.objectContaining({ eventName: 'test.event', error: 'boom' })
    )
  })

  it('works fine with no logger injected (logger is optional)', async () => {
    const bus = new InMemoryEventBus()
    bus.subscribe('test.event', () => {
      throw new Error('boom')
    })

    await expect(bus.publish(new TestEvent('x'))).resolves.toBeUndefined()
  })

  it('handlerCount reflects the number of subscribers for an eventName', () => {
    const bus = new InMemoryEventBus()
    expect(bus.handlerCount('test.event')).toBe(0)
    bus.subscribe('test.event', () => {})
    bus.subscribe('test.event', () => {})
    expect(bus.handlerCount('test.event')).toBe(2)
  })
})
