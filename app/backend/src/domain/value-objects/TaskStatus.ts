import { ValidationError } from '../errors/ValidationError.js'

export type TaskStatusValue = 'todo' | 'in_progress' | 'completed'

/**
 * The set of states a task can be in.
 *
 * Today this concept is a bare string that has to be re-validated wherever
 * it turns up: `isIn([...])` in taskRoutes.js, a hand-written list in the
 * frontend, and the `task_status` enum in Postgres. Nothing in the backend
 * owns the answer to "what is a valid status", so adding a fourth state
 * means finding every one of those places (docs/BACKEND_REWRITE_PLAN.md §1).
 *
 * The instances are interned - `create('todo')` always returns the same
 * object as `TaskStatus.TODO` - so identity comparison works and there is
 * no way to hold a `TaskStatus` whose value was never checked.
 */
export class TaskStatus {
  static readonly TODO = new TaskStatus('todo')
  static readonly IN_PROGRESS = new TaskStatus('in_progress')
  static readonly COMPLETED = new TaskStatus('completed')

  /** What the `status` column defaults to, matching schema.sql. */
  static readonly DEFAULT = TaskStatus.TODO

  private static readonly ALL: readonly TaskStatus[] = [
    TaskStatus.TODO,
    TaskStatus.IN_PROGRESS,
    TaskStatus.COMPLETED,
  ]

  private constructor(readonly value: TaskStatusValue) {}

  static create(raw: string): TaskStatus {
    const match = TaskStatus.ALL.find(status => status.value === raw)

    if (!match) {
      throw new ValidationError('Invalid status', [{ field: 'status', message: 'Invalid status' }])
    }

    return match
  }

  /** For route validators and tests that need to enumerate the states. */
  static values(): readonly TaskStatusValue[] {
    return TaskStatus.ALL.map(status => status.value)
  }

  static all(): readonly TaskStatus[] {
    return TaskStatus.ALL
  }

  equals(other: TaskStatus): boolean {
    return this.value === other.value
  }

  toString(): string {
    return this.value
  }

  toJSON(): string {
    return this.value
  }
}
