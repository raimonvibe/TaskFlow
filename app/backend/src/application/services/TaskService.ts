import { NotFoundError } from '../../domain/errors/NotFoundError.js'
import { ValidationError } from '../../domain/errors/ValidationError.js'
import {
  TaskCreatedEvent,
  TaskDeletedEvent,
  TaskUpdatedEvent,
} from '../../domain/events/TaskEvents.js'
import type { Task } from '../../domain/entities/Task.js'
import type {
  TaskChanges,
  TaskFilters,
  TaskRepository,
  TaskStatistics,
} from '../../domain/repositories/ITaskRepository.js'
import { TaskPriority } from '../../domain/value-objects/TaskPriority.js'
import { TaskStatus } from '../../domain/value-objects/TaskStatus.js'
import type { Clock } from '../ports/IClock.js'
import type { EventBus } from '../ports/IEventBus.js'

/** The raw, still-untyped shape a request body arrives in. Turning these
 * strings into value objects is this service's job, the same way
 * `AuthService` takes a raw email and builds an `Email`. */
export interface CreateTaskInput {
  readonly title: string
  readonly description?: string | null
  readonly status?: string | null
  readonly priority?: string | null
  readonly dueDate?: string | null
}

export interface UpdateTaskInput {
  readonly title?: string
  readonly description?: string | null
  readonly status?: string | null
  readonly priority?: string | null
  readonly dueDate?: string | null
}

export interface TaskFilterInput {
  readonly status?: string | null
  readonly priority?: string | null
}

/**
 * The task use-cases: `taskController.js` with the HTTP taken out.
 *
 * What that removal exposes is the part worth testing. The controller's
 * update path read the task, updated it, and compared the old and new
 * status to decide whether to adjust a Prometheus gauge - three
 * concerns interleaved in one function that could only be exercised by
 * mocking four modules. Here the read-then-write ordering is a service
 * rule, and the gauge is a subscriber's reaction to an event this service
 * publishes without knowing anyone is listening.
 *
 * Ownership is enforced by never asking the repository for a task without a
 * user id, so "not yours" and "does not exist" produce the same
 * `NotFoundError` - deliberately, since a 403 would confirm to an attacker
 * that the id is real (src/test/security/authorization.test.js).
 */
export class TaskService {
  constructor(
    private readonly tasks: TaskRepository,
    private readonly events: EventBus,
    private readonly clock: Clock
  ) {}

  async createTask(userId: number, input: CreateTaskInput): Promise<Task> {
    const task = await this.tasks.create({
      // Ownership comes from the authenticated caller and nowhere else. A
      // `user_id` in the request body has no path into this call, which is
      // what makes the mass-assignment test pass by construction rather
      // than by a field whitelist somebody has to maintain.
      userId,
      title: input.title,
      description: optionalText(input.description),
      status: input.status ? TaskStatus.create(input.status) : TaskStatus.DEFAULT,
      priority: input.priority ? TaskPriority.create(input.priority) : TaskPriority.DEFAULT,
      dueDate: parseDueDate(input.dueDate),
    })

    await this.events.publish(
      new TaskCreatedEvent(task.id, userId, task.status.value, this.clock.now())
    )

    return task
  }

  async listTasks(userId: number, filters: TaskFilterInput = {}): Promise<Task[]> {
    return this.tasks.findByUserId(userId, parseFilters(filters))
  }

  async getTask(id: number, userId: number): Promise<Task> {
    const task = await this.tasks.findByIdAndUserId(id, userId)
    if (!task) {
      throw new NotFoundError('Task not found')
    }
    return task
  }

  /**
   * Reads before writing so the previous status is known: the gauge that
   * tracks tasks per status has to be told which bucket the task left, not
   * just which one it entered. The read also means a missing task fails as
   * a 404 before any write is attempted.
   */
  async updateTask(id: number, userId: number, input: UpdateTaskInput): Promise<Task> {
    const existing = await this.getTask(id, userId)

    const changes = toChanges(input)
    if (Object.keys(changes).length === 0) {
      throw new ValidationError('No fields to update')
    }

    const updated = await this.tasks.update(id, userId, changes)
    if (!updated) {
      // Deleted between the read and the write. Same answer as if it had
      // never existed.
      throw new NotFoundError('Task not found')
    }

    await this.events.publish(
      new TaskUpdatedEvent(
        updated.id,
        userId,
        existing.status.value,
        updated.status.value,
        this.clock.now()
      )
    )

    return updated
  }

  async deleteTask(id: number, userId: number): Promise<void> {
    const existing = await this.getTask(id, userId)

    const deleted = await this.tasks.delete(id, userId)
    if (!deleted) {
      throw new NotFoundError('Task not found')
    }

    await this.events.publish(
      new TaskDeletedEvent(existing.id, userId, existing.status.value, this.clock.now())
    )
  }

  async getStatistics(userId: number): Promise<TaskStatistics> {
    return this.tasks.statisticsFor(userId)
  }
}

/**
 * Only the keys actually present become changes. An absent key must not
 * turn into a `SET column = NULL`, which is the difference between "the
 * client did not mention the description" and "the client cleared it".
 */
function toChanges(input: UpdateTaskInput): TaskChanges {
  const changes: {
    title?: string
    description?: string | null
    status?: TaskStatus
    priority?: TaskPriority
    dueDate?: Date | null
  } = {}

  if (input.title !== undefined) changes.title = input.title
  if (input.description !== undefined) changes.description = optionalText(input.description)
  if (input.status !== undefined && input.status !== null) {
    changes.status = TaskStatus.create(input.status)
  }
  if (input.priority !== undefined && input.priority !== null) {
    changes.priority = TaskPriority.create(input.priority)
  }
  if (input.dueDate !== undefined) changes.dueDate = parseDueDate(input.dueDate)

  return changes
}

function parseFilters(filters: TaskFilterInput): TaskFilters {
  return {
    ...(filters.status ? { status: TaskStatus.create(filters.status) } : {}),
    ...(filters.priority ? { priority: TaskPriority.create(filters.priority) } : {}),
  }
}

/** Matches `description || null` in the old controller: an empty string and
 * an omitted field both mean "no description". */
function optionalText(value: string | null | undefined): string | null {
  if (value === undefined || value === null) return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function parseDueDate(value: string | Date | null | undefined): Date | null {
  if (value === undefined || value === null || value === '') return null
  if (value instanceof Date) return value

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    throw new ValidationError('Invalid date format', [
      { field: 'due_date', message: 'Invalid date format' },
    ])
  }

  return parsed
}
