import type { DomainEvent } from '../../domain/events/DomainEvent.js'
import type { EventBus, EventHandler } from '../../application/ports/IEventBus.js'
import type { Logger } from '../../application/ports/ILogger.js'

/**
 * Simple synchronous, in-process pub/sub. This is the only `EventBus`
 * implementation for now - no queue, no persistence, no cross-process
 * delivery. That's a deliberate, stated limitation (see
 * docs/BACKEND_REWRITE_PLAN.md §3): if a subscriber needs guaranteed
 * delivery or to survive a process restart, this isn't it. Swapping in a
 * real message queue later only means writing a new `EventBus`
 * implementation - nothing that calls `publish`/`subscribe` needs to
 * change.
 *
 * A subscriber throwing is logged and swallowed, not re-thrown - metrics
 * recording or audit logging failing must never take down the request that
 * triggered them (e.g. a registration succeeding shouldn't 500 because a
 * Prometheus counter threw). The logger is injected (constructor
 * injection, same as everything else in this rewrite) rather than
 * hardcoded, so this class stays testable without pulling in Winston.
 */
export class InMemoryEventBus implements EventBus {
  private readonly handlers = new Map<string, Array<EventHandler<never>>>()

  constructor(private readonly logger?: Logger) {}

  subscribe<T extends DomainEvent>(eventName: string, handler: EventHandler<T>): void {
    const existing = this.handlers.get(eventName) ?? []
    existing.push(handler as EventHandler<never>)
    this.handlers.set(eventName, existing)
  }

  async publish(event: DomainEvent): Promise<void> {
    const handlers = this.handlers.get(event.eventName) ?? []

    await Promise.all(
      handlers.map(async handler => {
        try {
          await handler(event as never)
        } catch (error) {
          this.logger?.error('Event subscriber threw', {
            eventName: event.eventName,
            error: error instanceof Error ? error.message : String(error),
          })
        }
      })
    )
  }

  /** Test/debug helper - not part of the `EventBus` interface. */
  handlerCount(eventName: string): number {
    return this.handlers.get(eventName)?.length ?? 0
  }
}
