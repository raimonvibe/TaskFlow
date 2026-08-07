import type { DomainEvent } from '../../domain/events/DomainEvent.js'

export type EventHandler<T extends DomainEvent = DomainEvent> = (event: T) => void | Promise<void>

/**
 * Publish/subscribe port for domain events (Observer pattern - see
 * docs/BACKEND_REWRITE_PLAN.md §3). Application services depend on this
 * interface only; `InMemoryEventBus` (infrastructure/) is the concrete
 * implementation used everywhere for now. Swapping it for something
 * backed by a real message queue later wouldn't require touching any
 * service.
 */
export interface EventBus {
  publish(event: DomainEvent): void | Promise<void>

  /** `eventName` matches `DomainEvent#eventName` (e.g. "user.registered"). */
  subscribe<T extends DomainEvent>(eventName: string, handler: EventHandler<T>): void
}
