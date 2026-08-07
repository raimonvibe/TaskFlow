import {
  AuthAttemptFailedEvent,
  UserAuthenticatedEvent,
  UserLoggedOutEvent,
  UserRegisteredEvent,
} from '../../domain/events/AuthEvents.js'
import type { EventBus } from '../ports/IEventBus.js'
import type { Logger } from '../ports/ILogger.js'

/**
 * Writes the auth audit trail. Log lines and their structured fields match
 * what `authController.js` emits today ("User registered", "User logged in",
 * "User logged out", each with userId and email), so existing log-based
 * dashboards and greps keep working.
 *
 * Failed attempts are logged at warn with the reason - new, and the reason
 * this subscriber is worth having separately from the metrics one: a
 * counter tells you failures are happening, this tells you what they were.
 * The email is included because it is already in the request the attempt
 * came from; passwords are never part of any event, so there is nothing
 * sensitive here to leak into logs.
 */
export class AuditLogSubscriber {
  constructor(private readonly logger: Logger) {}

  register(events: EventBus): void {
    events.subscribe<UserRegisteredEvent>(UserRegisteredEvent.NAME, event => {
      this.logger.info('User registered', { userId: event.userId, email: event.email })
    })

    events.subscribe<UserAuthenticatedEvent>(UserAuthenticatedEvent.NAME, event => {
      this.logger.info('User logged in', { userId: event.userId, email: event.email })
    })

    events.subscribe<UserLoggedOutEvent>(UserLoggedOutEvent.NAME, event => {
      this.logger.info('User logged out', { userId: event.userId })
    })

    events.subscribe<AuthAttemptFailedEvent>(AuthAttemptFailedEvent.NAME, event => {
      this.logger.warn('Auth attempt failed', {
        type: event.type,
        reason: event.reason,
        email: event.email,
      })
    })
  }
}
