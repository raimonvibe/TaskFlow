import { ValidationError } from '../../../domain/errors/ValidationError.js'
import { Task } from '../../../domain/entities/Task.js'
import type {
  NewTask,
  TaskChanges,
  TaskFilters,
  TaskRepository,
  TaskStatistics,
} from '../../../domain/repositories/ITaskRepository.js'
import { TaskPriority } from '../../../domain/value-objects/TaskPriority.js'
import { TaskStatus } from '../../../domain/value-objects/TaskStatus.js'
import type { PostgresConnection } from './PostgresConnection.js'
import { buildAssignments } from './UpdateStatement.js'

interface TaskRow {
  id: number
  user_id: number
  title: string
  description: string | null
  status: string
  priority: string
  due_date: Date | null
  created_at: Date | null
  updated_at: Date | null
}

interface StatisticsRow {
  total: string
  todo: string
  in_progress: string
  completed: string
  low_priority: string
  medium_priority: string
  high_priority: string
}

/** Postgres: value too long for the column's declared width. */
const STRING_DATA_RIGHT_TRUNCATION = '22001'

/** Every column the API exposes, in one place, so no query can accidentally
 * select a different shape than the others (the `SELECT *` problem that let
 * `models/User.js` return a password hash from some reads and not others). */
const COLUMNS =
  'id, user_id, title, description, status, priority, due_date, created_at, updated_at'

/**
 * `TaskRepository` over raw SQL. Replaces `models/Task.js`.
 *
 * Differences from the model it supersedes, beyond returning entities:
 *
 *  - Filters are bound as parameters via a placeholder counter that lives
 *    in one loop rather than being threaded through the method by hand.
 *  - The dynamic UPDATE goes through `buildAssignments`, and the columns it
 *    is given are literals in this file - so the `allowedFields` whitelist
 *    that guarded `models/Task.js` against a client-supplied column name is
 *    not needed, because request bodies no longer reach the SQL builder.
 *  - A value too long for a column becomes a `ValidationError` (400) here
 *    instead of travelling to the error middleware as a driver error and
 *    being reported as a 500.
 *
 * Foreign-key violations are deliberately *not* translated. A task insert
 * can only violate `tasks_user_id_fkey` if the authenticated user's row
 * disappeared mid-request; that is a broken invariant rather than something
 * the client did wrong, and 500 is the honest answer. The old error
 * middleware reported it as 400 "Invalid reference", which pointed the
 * blame at the caller.
 */
export class PostgresTaskRepository implements TaskRepository {
  constructor(private readonly db: PostgresConnection) {}

  async create(task: NewTask): Promise<Task> {
    const result = await this.translatingDriverErrors(() =>
      this.db.query<TaskRow>(
        `INSERT INTO tasks (user_id, title, description, status, priority, due_date)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING ${COLUMNS}`,
        [
          task.userId,
          task.title,
          task.description,
          task.status.value,
          task.priority.value,
          task.dueDate,
        ]
      )
    )

    const row = result.rows[0]
    if (!row) {
      throw new Error('INSERT INTO tasks returned no row')
    }
    return toTask(row)
  }

  async findByUserId(userId: number, filters: TaskFilters = {}): Promise<Task[]> {
    const conditions = ['user_id = $1']
    const values: unknown[] = [userId]

    if (filters.status) {
      values.push(filters.status.value)
      conditions.push(`status = $${values.length}`)
    }

    if (filters.priority) {
      values.push(filters.priority.value)
      conditions.push(`priority = $${values.length}`)
    }

    const result = await this.db.query<TaskRow>(
      `SELECT ${COLUMNS} FROM tasks WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC`,
      values
    )

    return result.rows.map(toTask)
  }

  async findByIdAndUserId(id: number, userId: number): Promise<Task | null> {
    const result = await this.db.query<TaskRow>(
      `SELECT ${COLUMNS} FROM tasks WHERE id = $1 AND user_id = $2`,
      [id, userId]
    )
    return result.rows[0] ? toTask(result.rows[0]) : null
  }

  async update(id: number, userId: number, changes: TaskChanges): Promise<Task | null> {
    const { clause, values, nextIndex } = buildAssignments({
      title: changes.title,
      description: changes.description,
      status: changes.status?.value,
      priority: changes.priority?.value,
      due_date: changes.dueDate,
    })

    if (clause === '') {
      // Nothing to change. `TaskService` rejects this as a 400 before
      // getting here; returning the row as-is rather than emitting
      // `SET  , updated_at = NOW()` keeps this method safe on its own terms.
      return this.findByIdAndUserId(id, userId)
    }

    // The ownership predicate is part of the UPDATE itself, not a check
    // performed beforehand - a task belonging to someone else matches no
    // row, so there is no window in which it could be written to.
    const result = await this.translatingDriverErrors(() =>
      this.db.query<TaskRow>(
        `UPDATE tasks SET ${clause}, updated_at = NOW()
         WHERE id = $${nextIndex} AND user_id = $${nextIndex + 1}
         RETURNING ${COLUMNS}`,
        [...values, id, userId]
      )
    )

    return result.rows[0] ? toTask(result.rows[0]) : null
  }

  async delete(id: number, userId: number): Promise<boolean> {
    const result = await this.db.query<{ id: number }>(
      'DELETE FROM tasks WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId]
    )
    return result.rows.length > 0
  }

  /**
   * One query with FILTER clauses rather than seven, unchanged from
   * `models/Task.js` - counting seven ways over the same scan is measurably
   * cheaper than seven round trips, and it cannot report a torn view of a
   * table being written concurrently.
   */
  async statisticsFor(userId: number): Promise<TaskStatistics> {
    const result = await this.db.query<StatisticsRow>(
      `SELECT
         COUNT(*) as total,
         COUNT(*) FILTER (WHERE status = 'todo') as todo,
         COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
         COUNT(*) FILTER (WHERE status = 'completed') as completed,
         COUNT(*) FILTER (WHERE priority = 'low') as low_priority,
         COUNT(*) FILTER (WHERE priority = 'medium') as medium_priority,
         COUNT(*) FILTER (WHERE priority = 'high') as high_priority
       FROM tasks
       WHERE user_id = $1`,
      [userId]
    )

    // COUNT(*) comes back as a string: it is bigint, which does not fit a
    // JavaScript number in the general case, so node-postgres refuses to
    // guess. These counts are per-user and small.
    const row = result.rows[0]
    return {
      total: count(row?.total),
      byStatus: {
        todo: count(row?.todo),
        in_progress: count(row?.in_progress),
        completed: count(row?.completed),
      },
      byPriority: {
        low: count(row?.low_priority),
        medium: count(row?.medium_priority),
        high: count(row?.high_priority),
      },
    }
  }

  /** Wraps the two statements that accept client-supplied text, so a value
   * wider than its column surfaces as a 400 rather than as a driver error
   * the HTTP layer would have to recognize. */
  private async translatingDriverErrors<T>(statement: () => Promise<T>): Promise<T> {
    try {
      return await statement()
    } catch (error) {
      if (hasCode(error, STRING_DATA_RIGHT_TRUNCATION)) {
        throw new ValidationError('One or more fields exceed their maximum length')
      }
      throw error
    }
  }
}

function toTask(row: TaskRow): Task {
  return new Task({
    id: row.id,
    userId: row.user_id,
    title: row.title,
    description: row.description,
    // The `task_status`/`task_priority` enums make anything else
    // unrepresentable in the column, so a value the domain rejects here
    // would mean the schema and the code have drifted - worth failing on.
    status: TaskStatus.create(row.status),
    priority: TaskPriority.create(row.priority),
    dueDate: row.due_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  })
}

function count(value: string | undefined): number {
  return value === undefined ? 0 : Number.parseInt(value, 10)
}

function hasCode(error: unknown, code: string): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === code
  )
}
