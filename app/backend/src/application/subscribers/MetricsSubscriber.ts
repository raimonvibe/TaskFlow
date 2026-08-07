import {
  AuthAttemptFailedEvent,
  UserAuthenticatedEvent,
  UserRegisteredEvent,
} from '../../domain/events/AuthEvents.js'
import type { EventBus } from '../ports/IEventBus.js'
import type { MetricsRegistry } from '../ports/IMetricsRegistry.js'

/**
 * Translates auth domain events into the `auth_attempts_total` counter.
 *
 * This is the code that currently sits inline in `authController.js` as six
 * separate `authAttempts.inc({ type, status })` calls scattered through the
 * success and failure branches of `register` and `login`. Collecting them
 * here means the counter's behavior is readable in one place, and the
 * service that triggers it no longer imports prom-client at all.
 */
export class MetricsSubscriber {
  constructor(private readonly metrics: MetricsRegistry) {}

  register(events: EventBus): void {
    events.subscribe<UserRegisteredEvent>(UserRegisteredEvent.NAME, () => {
      this.metrics.recordAuthAttempt('register', 'success')
    })

    events.subscribe<UserAuthenticatedEvent>(UserAuthenticatedEvent.NAME, () => {
      this.metrics.recordAuthAttempt('login', 'success')
    })

    events.subscribe<AuthAttemptFailedEvent>(AuthAttemptFailedEvent.NAME, event => {
      this.metrics.recordAuthAttempt(event.type, 'failure')
    })
  }
}
