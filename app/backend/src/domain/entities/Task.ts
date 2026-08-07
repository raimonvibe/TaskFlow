import type { TaskPriority } from '../value-objects/TaskPriority.js'
import type { TaskStatus } from '../value-objects/TaskStatus.js'

export interface TaskProps {
  readonly id: number
  readonly userId: number
  readonly title: string
  readonly description: string | null
  readonly status: TaskStatus
  readonly priority: TaskPriority
  readonly dueDate: Date | null
  readonly createdAt: Date | null
  readonly updatedAt: Date | null
}

/**
 * A task belonging to exactly one user.
 *
 * Replaces the `SELECT *` row object `models/Task.js` returns today. Two
 * things change by having a real entity:
 *
 *  1. `status` and `priority` are value objects, so a `Task` cannot exist
 *     holding a status the application does not recognize - the check
 *     happens once, where the data enters, instead of at every route that
 *     re-runs `isIn([...])`.
 *  2. Ownership is a property of the task with a name (`isOwnedBy`) rather
 *     than an `AND user_id = $2` that each query has to remember. The
 *     queries still carry it, because filtering in SQL is what keeps
 *     another user's rows from being read at all - but the rule is now
 *     something the domain can state and a test can assert directly.
 *
 * Column names stay snake_case on the wire; the mapping to `user_id` and
 * `due_date` happens in presentation/http/dto/taskResponse.ts, so the
 * frontend sees exactly what it sees today.
 */
export class Task {
  readonly id: number
  readonly userId: number
  readonly title: string
  readonly description: string | null
  readonly status: TaskStatus
  readonly priority: TaskPriority
  readonly dueDate: Date | null
  readonly createdAt: Date | null
  readonly updatedAt: Date | null

  constructor(props: TaskProps) {
    this.id = props.id
    this.userId = props.userId
    this.title = props.title
    this.description = props.description
    this.status = props.status
    this.priority = props.priority
    this.dueDate = props.dueDate
    this.createdAt = props.createdAt
    this.updatedAt = props.updatedAt
  }

  isOwnedBy(userId: number): boolean {
    return this.userId === userId
  }
}
