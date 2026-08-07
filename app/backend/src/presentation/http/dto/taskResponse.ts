import type { Task } from '../../../domain/entities/Task.js'
import type { TaskPriorityValue } from '../../../domain/value-objects/TaskPriority.js'
import type { TaskStatusValue } from '../../../domain/value-objects/TaskStatus.js'

/**
 * Exactly the JSON the frontend receives today.
 *
 * Snake_case, because that is what `res.json(row)` produced when the
 * response *was* the database row - `TaskCard.jsx` reads `task.due_date`
 * and `Tasks.jsx` filters on `task.status`, and the frontend is out of
 * scope for this rewrite (docs/BACKEND_REWRITE_PLAN.md §8). The entity
 * inside the backend uses `dueDate`; this file is the single place the two
 * naming conventions meet, which is the point of having a DTO at all.
 *
 * Timestamps are ISO strings for the same reason: `JSON.stringify` already
 * turned pg's `Date` objects into ISO strings on the way out, so producing
 * them explicitly changes nothing on the wire while making the contract
 * visible in the type.
 */
export interface TaskResponse {
  id: number
  user_id: number
  title: string
  description: string | null
  status: TaskStatusValue
  priority: TaskPriorityValue
  due_date: string | null
  created_at: string | null
  updated_at: string | null
}

export function toTaskResponse(task: Task): TaskResponse {
  return {
    id: task.id,
    user_id: task.userId,
    title: task.title,
    description: task.description,
    status: task.status.value,
    priority: task.priority.value,
    due_date: task.dueDate?.toISOString() ?? null,
    created_at: task.createdAt?.toISOString() ?? null,
    updated_at: task.updatedAt?.toISOString() ?? null,
  }
}
