/**
 * Base class for things that happened in the domain that other parts of the
 * app might care about - a user registered, a task was deleted, and so on.
 *
 * This is what lets metrics recording and audit logging move out of the
 * controllers/services that cause them (`authController.js` called
 * `authAttempts.inc(...)` and `logger.info(...)` directly, inline, in the
 * middle of `register()`/`login()`) and into independent subscribers
 * (`MetricsSubscriber`, `AuditLogSubscriber` - see
 * docs/BACKEND_REWRITE_PLAN.md §3, Observer pattern). A service publishes
 * "what happened"; it doesn't need to know who's listening or why.
 *
 * Resource-specific events (`UserRegisteredEvent`, `TaskCreatedEvent`, ...)
 * are added per-slice in Phase 3/4, each extending this base class.
 */
export abstract class DomainEvent {
  readonly occurredAt: Date

  constructor(occurredAt: Date = new Date()) {
    this.occurredAt = occurredAt
  }

  /** Stable string name subscribers filter on - e.g. "user.registered". */
  abstract get eventName(): string
}
