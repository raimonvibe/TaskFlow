import { DomainEvent } from './DomainEvent.js'
import type { TaskStatusValue } from '../value-objects/TaskStatus.js'

/**
 * The three things that can happen to a task, published by `TaskService`.
 *
 * They carry the status values as plain strings rather than `TaskStatus`
 * instances, for the same reason `AuthEvents` carries a plain email: an
 * event is a statement of fact about the past, and the subscribers that
 * consume these (a Prometheus gauge, an audit log line) want the value, not
 * an object with behavior. Keeping events primitive also means they stay
 * serializable if the in-memory bus is ever swapped for a real queue.
 */
export class TaskCreatedEvent extends DomainEvent {
  constructor(
    readonly taskId: number,
    readonly userId: number,
    readonly status: TaskStatusValue,
    occurredAt?: Date
  ) {
    super(occurredAt)
  }

  static readonly NAME = 'task.created'

  get eventName(): string {
    return TaskCreatedEvent.NAME
  }
}

/**
 * Carries both statuses because the `tasks_by_status` gauge needs the pair
 * to move a task from one bucket to the other. `previousStatus` equal to
 * `status` means the update did not touch the status, which is exactly the
 * condition `taskController.js` checks inline today before adjusting the
 * gauge - now the subscriber's business, not the service's.
 */
export class TaskUpdatedEvent extends DomainEvent {
  constructor(
    readonly taskId: number,
    readonly userId: number,
    readonly previousStatus: TaskStatusValue,
    readonly status: TaskStatusValue,
    occurredAt?: Date
  ) {
    super(occurredAt)
  }

  static readonly NAME = 'task.updated'

  get eventName(): string {
    return TaskUpdatedEvent.NAME
  }
}

export class TaskDeletedEvent extends DomainEvent {
  constructor(
    readonly taskId: number,
    readonly userId: number,
    readonly status: TaskStatusValue,
    occurredAt?: Date
  ) {
    super(occurredAt)
  }

  static readonly NAME = 'task.deleted'

  get eventName(): string {
    return TaskDeletedEvent.NAME
  }
}
