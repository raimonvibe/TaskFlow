import type { Task } from '../entities/Task.js'
import type { TaskPriority, TaskPriorityValue } from '../value-objects/TaskPriority.js'
import type { TaskStatus, TaskStatusValue } from '../value-objects/TaskStatus.js'

export interface NewTask {
  readonly userId: number
  readonly title: string
  readonly description: string | null
  readonly status: TaskStatus
  readonly priority: TaskPriority
  readonly dueDate: Date | null
}

/**
 * A partial update. `undefined` means "leave this column alone"; `null` on
 * a nullable column means "clear it". That distinction is why these are not
 * simply optional-and-nullable - `{ description: null }` and `{}` have to
 * mean different things for a PUT to be able to remove a description.
 */
export interface TaskChanges {
  readonly title?: string
  readonly description?: string | null
  readonly status?: TaskStatus
  readonly priority?: TaskPriority
  readonly dueDate?: Date | null
}

export interface TaskFilters {
  readonly status?: TaskStatus
  readonly priority?: TaskPriority
}

export interface TaskStatistics {
  readonly total: number
  readonly byStatus: Readonly<Record<TaskStatusValue, number>>
  readonly byPriority: Readonly<Record<TaskPriorityValue, number>>
}

/**
 * Persistence port for tasks - the `ITaskRepository` of
 * docs/BACKEND_REWRITE_PLAN.md §3, mirroring `IUserRepository`.
 *
 * Every read and write is scoped by `userId`, and there is deliberately no
 * `findById(id)` without one. A method that could load a task by ID alone
 * is the shape of the IDOR the authorization suite tests for; not providing
 * it means a caller cannot accidentally reach across users, rather than
 * being trusted to add the ownership check itself.
 *
 * Implementations translate driver errors into domain errors, so nothing
 * above this interface ever sees a Postgres error code.
 */
export interface TaskRepository {
  create(task: NewTask): Promise<Task>

  /** Newest first, matching the pre-rewrite `ORDER BY created_at DESC`. */
  findByUserId(userId: number, filters?: TaskFilters): Promise<Task[]>

  findByIdAndUserId(id: number, userId: number): Promise<Task | null>

  /** Resolves to null when no task with that id belongs to that user. */
  update(id: number, userId: number, changes: TaskChanges): Promise<Task | null>

  /** True when a row was actually removed. */
  delete(id: number, userId: number): Promise<boolean>

  statisticsFor(userId: number): Promise<TaskStatistics>
}
