import { Task } from '../../domain/entities/Task.js'
import type {
  NewTask,
  TaskChanges,
  TaskFilters,
  TaskRepository,
  TaskStatistics,
} from '../../domain/repositories/ITaskRepository.js'
import { TaskPriority } from '../../domain/value-objects/TaskPriority.js'
import { TaskStatus } from '../../domain/value-objects/TaskStatus.js'

/**
 * A real, working `TaskRepository` backed by a Map.
 *
 * Like `InMemoryUserRepository`, this is a fake rather than a mock: tests
 * assert that a task is now findable, or is not, instead of asserting which
 * methods were called. That is what lets `TaskService.test.ts` replace
 * `controllers/taskController.test.js` - which needed `vi.mock()` on four
 * modules to say anything at all - with plain object construction
 * (docs/BACKEND_REWRITE_PLAN.md §5).
 *
 * It reproduces the behaviors the service depends on: ownership scoping on
 * every operation, newest-first ordering, and null for a task that is not
 * the caller's.
 */
export class InMemoryTaskRepository implements TaskRepository {
  private readonly tasksById = new Map<number, Task>()
  private nextId = 1
  /** Stands in for `created_at DESC` without needing distinct timestamps:
   * insertion order is enough to order tasks created in the same
   * millisecond, which a fast test always does. */
  private readonly insertionOrder: number[] = []

  async create(task: NewTask): Promise<Task> {
    const now = new Date('2026-01-01T00:00:00.000Z')
    const created = new Task({
      id: this.nextId++,
      userId: task.userId,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate,
      createdAt: now,
      updatedAt: now,
    })

    this.tasksById.set(created.id, created)
    this.insertionOrder.push(created.id)
    return created
  }

  async findByUserId(userId: number, filters: TaskFilters = {}): Promise<Task[]> {
    return [...this.insertionOrder]
      .reverse()
      .map(id => this.tasksById.get(id))
      .filter((task): task is Task => task !== undefined)
      .filter(task => task.isOwnedBy(userId))
      .filter(task => !filters.status || task.status.equals(filters.status))
      .filter(task => !filters.priority || task.priority.equals(filters.priority))
  }

  async findByIdAndUserId(id: number, userId: number): Promise<Task | null> {
    const task = this.tasksById.get(id)
    return task?.isOwnedBy(userId) ? task : null
  }

  async update(id: number, userId: number, changes: TaskChanges): Promise<Task | null> {
    const existing = await this.findByIdAndUserId(id, userId)
    if (!existing) return null

    const updated = new Task({
      id: existing.id,
      // Never taken from `changes` - the interface offers no way to
      // reassign ownership, and this fake must not invent one.
      userId: existing.userId,
      title: changes.title ?? existing.title,
      description: changes.description !== undefined ? changes.description : existing.description,
      status: changes.status ?? existing.status,
      priority: changes.priority ?? existing.priority,
      dueDate: changes.dueDate !== undefined ? changes.dueDate : existing.dueDate,
      createdAt: existing.createdAt,
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    })

    this.tasksById.set(id, updated)
    return updated
  }

  async delete(id: number, userId: number): Promise<boolean> {
    const existing = await this.findByIdAndUserId(id, userId)
    if (!existing) return false

    this.tasksById.delete(id)
    return true
  }

  async statisticsFor(userId: number): Promise<TaskStatistics> {
    const owned = await this.findByUserId(userId)

    const countBy = <T extends { value: string }>(
      values: readonly T[],
      pick: (task: Task) => { value: string }
    ): Record<string, number> =>
      Object.fromEntries(
        values.map(value => [value.value, owned.filter(t => pick(t).value === value.value).length])
      )

    return {
      total: owned.length,
      byStatus: countBy(TaskStatus.all(), task => task.status) as TaskStatistics['byStatus'],
      byPriority: countBy(
        TaskPriority.all(),
        task => task.priority
      ) as TaskStatistics['byPriority'],
    }
  }
}
