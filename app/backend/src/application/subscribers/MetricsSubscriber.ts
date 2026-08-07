import {
  AuthAttemptFailedEvent,
  UserAuthenticatedEvent,
  UserRegisteredEvent,
} from '../../domain/events/AuthEvents.js'
import {
  TaskCreatedEvent,
  TaskDeletedEvent,
  TaskUpdatedEvent,
} from '../../domain/events/TaskEvents.js'
import type { EventBus } from '../ports/IEventBus.js'
import type { MetricsRegistry } from '../ports/IMetricsRegistry.js'

/**
 * Translates domain events into the `auth_attempts_total` counter and the
 * `tasks_by_status` gauge.
 *
 * This is the code that currently sits inline in `authController.js` as six
 * separate `authAttempts.inc({ type, status })` calls, and in
 * `taskController.js` as `tasksByStatus.inc`/`.dec` calls interleaved with
 * the update logic. Collecting them here means each metric's behavior is
 * readable in one place, and the services that trigger them no longer
 * import prom-client at all.
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

    events.subscribe<TaskCreatedEvent>(TaskCreatedEvent.NAME, event => {
      this.metrics.recordTaskCreated(event.status)
    })

    events.subscribe<TaskUpdatedEvent>(TaskUpdatedEvent.NAME, event => {
      this.metrics.recordTaskStatusChanged(event.previousStatus, event.status)
    })

    events.subscribe<TaskDeletedEvent>(TaskDeletedEvent.NAME, event => {
      this.metrics.recordTaskDeleted(event.status)
    })
  }
}
