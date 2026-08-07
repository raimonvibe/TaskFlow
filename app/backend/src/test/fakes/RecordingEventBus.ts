import type { DomainEvent } from '../../domain/events/DomainEvent.js'
import type { EventBus, EventHandler } from '../../application/ports/IEventBus.js'

/**
 * `EventBus` that records everything published (and still delivers to
 * subscribers), so a test can assert "registering published exactly one
 * UserRegisteredEvent" without wiring up real subscribers.
 */
export class RecordingEventBus implements EventBus {
  readonly published: DomainEvent[] = []
  private readonly handlers = new Map<string, Array<EventHandler<never>>>()

  subscribe<T extends DomainEvent>(eventName: string, handler: EventHandler<T>): void {
    const existing = this.handlers.get(eventName) ?? []
    existing.push(handler as EventHandler<never>)
    this.handlers.set(eventName, existing)
  }

  async publish(event: DomainEvent): Promise<void> {
    this.published.push(event)
    for (const handler of this.handlers.get(event.eventName) ?? []) {
      await handler(event as never)
    }
  }

  /** All published events of a given type, narrowed. */
  ofType<T extends DomainEvent>(type: new (...args: never[]) => T): T[] {
    return this.published.filter((event): event is T => event instanceof type)
  }

  names(): string[] {
    return this.published.map(event => event.eventName)
  }
}
