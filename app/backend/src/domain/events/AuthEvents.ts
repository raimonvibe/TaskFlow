import { DomainEvent } from './DomainEvent.js'

/** Which credential flow an attempt belongs to. Matches the `type` label on
 * the existing `auth_attempts_total` Prometheus counter, so the metric's
 * cardinality and label values are unchanged by this rewrite. */
export type AuthAttemptType = 'register' | 'login'

export class UserRegisteredEvent extends DomainEvent {
  constructor(
    readonly userId: number,
    readonly email: string,
    occurredAt?: Date
  ) {
    super(occurredAt)
  }

  static readonly NAME = 'user.registered'

  get eventName(): string {
    return UserRegisteredEvent.NAME
  }
}

export class UserAuthenticatedEvent extends DomainEvent {
  constructor(
    readonly userId: number,
    readonly email: string,
    occurredAt?: Date
  ) {
    super(occurredAt)
  }

  static readonly NAME = 'user.authenticated'

  get eventName(): string {
    return UserAuthenticatedEvent.NAME
  }
}

/**
 * One event for every way a register/login attempt can fail, carrying which
 * flow failed and why.
 *
 * Deliberately not split into a class per reason: the metric these feed
 * (`auth_attempts_total{type,status}`) only distinguishes register from
 * login, and today's `authController.js` increments the failure counter
 * identically for "user already exists", "invalid credentials", and "the
 * database threw". Keeping one event preserves those counts exactly, and
 * `reason` is there for the audit log, which is the only subscriber that
 * cares why.
 */
export class AuthAttemptFailedEvent extends DomainEvent {
  constructor(
    readonly type: AuthAttemptType,
    readonly reason: string,
    readonly email?: string,
    occurredAt?: Date
  ) {
    super(occurredAt)
  }

  static readonly NAME = 'auth.attempt_failed'

  get eventName(): string {
    return AuthAttemptFailedEvent.NAME
  }
}

export class UserLoggedOutEvent extends DomainEvent {
  constructor(
    readonly userId: number,
    occurredAt?: Date
  ) {
    super(occurredAt)
  }

  static readonly NAME = 'user.logged_out'

  get eventName(): string {
    return UserLoggedOutEvent.NAME
  }
}
