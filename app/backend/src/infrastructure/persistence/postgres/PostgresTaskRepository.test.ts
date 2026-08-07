import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { PostgresConnection } from './PostgresConnection.js'
import { PostgresTaskRepository } from './PostgresTaskRepository.js'
import { Config } from '../../config/Config.js'
import { ValidationError } from '../../../domain/errors/ValidationError.js'
import { TaskPriority } from '../../../domain/value-objects/TaskPriority.js'
import { TaskStatus } from '../../../domain/value-objects/TaskStatus.js'
import type { NewTask } from '../../../domain/repositories/ITaskRepository.js'

// Integration test - real Postgres, no fakes. Replaces models/Task.test.js
// (docs/BACKEND_REWRITE_PLAN.md §5). The behavior these queries support is
// covered by TaskService.test.ts against an in-memory repository; what can
// only be verified here is that the SQL is right, that ownership scoping
// holds in the database rather than only in the fake, and that driver
// errors are translated at this boundary.
//
// The owning users are inserted directly: this file is testing the task
// repository, and a real registration would only add another slice's
// failure modes to it. Emails carry a per-file RUN_ID because test files
// run in parallel against one shared database.
const RUN_ID = `${process.pid}${Math.random().toString(36).slice(2, 8)}`

const newTask = (userId: number, overrides: Partial<NewTask> = {}): NewTask => ({
  userId,
  title: 'A task',
  description: null,
  status: TaskStatus.DEFAULT,
  priority: TaskPriority.DEFAULT,
  dueDate: null,
  ...overrides,
})

describe('PostgresTaskRepository', () => {
  let db: PostgresConnection
  let repository: PostgresTaskRepository
  let ownerId: number
  let otherUserId: number

  beforeAll(async () => {
    db = new PostgresConnection(new Config().database)
    repository = new PostgresTaskRepository(db)

    ownerId = await insertUser(db, `taskrepo-owner-${RUN_ID}@example.com`)
    otherUserId = await insertUser(db, `taskrepo-other-${RUN_ID}@example.com`)
  })

  beforeEach(async () => {
    await db.query('DELETE FROM tasks WHERE user_id = ANY($1)', [[ownerId, otherUserId]])
  })

  afterAll(async () => {
    // ON DELETE CASCADE on tasks.user_id removes the tasks with them.
    await db.query('DELETE FROM users WHERE id = ANY($1)', [[ownerId, otherUserId]])
    await db.close()
  })

  describe('create', () => {
    it('persists every column and returns the task as an entity', async () => {
      const dueDate = new Date('2026-12-31T00:00:00.000Z')

      const task = await repository.create(
        newTask(ownerId, {
          title: 'Write the migration',
          description: 'Phase 4',
          status: TaskStatus.IN_PROGRESS,
          priority: TaskPriority.HIGH,
          dueDate,
        })
      )

      expect(task.id).toBeGreaterThan(0)
      expect(task.userId).toBe(ownerId)
      expect(task.title).toBe('Write the migration')
      expect(task.description).toBe('Phase 4')
      // Statuses come back as value objects, not the raw enum strings a
      // `SELECT *` used to hand out.
      expect(task.status).toBe(TaskStatus.IN_PROGRESS)
      expect(task.priority).toBe(TaskPriority.HIGH)
      expect(task.dueDate).toEqual(dueDate)
      expect(task.createdAt).toBeInstanceOf(Date)
    })

    it('stores a null description and due date without complaint', async () => {
      const task = await repository.create(newTask(ownerId, { title: 'Minimal' }))

      expect(task.description).toBeNull()
      expect(task.dueDate).toBeNull()
      expect(task.status).toBe(TaskStatus.TODO)
      expect(task.priority).toBe(TaskPriority.MEDIUM)
    })

    it('translates an over-long title into ValidationError, not a driver error', async () => {
      const error = await repository
        .create(newTask(ownerId, { title: 'A'.repeat(256) }))
        .catch((e: unknown) => e)

      // VARCHAR(255) overflow used to travel to the error middleware as a
      // raw pg error and be reported as a 500.
      expect(error).toBeInstanceOf(ValidationError)
      expect((error as ValidationError).statusCode).toBe(400)
    })

    it('stores a SQL payload in the title as data', async () => {
      const payload = "Robert'); DROP TABLE tasks; --"

      const task = await repository.create(newTask(ownerId, { title: payload }))

      expect(task.title).toBe(payload)
      expect(await repository.findByUserId(ownerId)).toHaveLength(1)
    })
  })

  describe('findByUserId', () => {
    beforeEach(async () => {
      await repository.create(
        newTask(ownerId, { title: 'One', status: TaskStatus.TODO, priority: TaskPriority.HIGH })
      )
      await repository.create(
        newTask(ownerId, {
          title: 'Two',
          status: TaskStatus.COMPLETED,
          priority: TaskPriority.LOW,
        })
      )
      await repository.create(newTask(otherUserId, { title: "Someone else's" }))
    })

    it('returns only the given user tasks, newest first', async () => {
      const tasks = await repository.findByUserId(ownerId)

      expect(tasks.map(task => task.title)).toEqual(['Two', 'One'])
    })

    it('filters by status, by priority, and by both together', async () => {
      expect(await repository.findByUserId(ownerId, { status: TaskStatus.TODO })).toHaveLength(1)
      expect(await repository.findByUserId(ownerId, { priority: TaskPriority.LOW })).toHaveLength(1)
      expect(
        await repository.findByUserId(ownerId, {
          status: TaskStatus.TODO,
          priority: TaskPriority.LOW,
        })
      ).toHaveLength(0)
    })

    it('returns an empty array for a user with no tasks', async () => {
      expect(await repository.findByUserId(2147483647)).toEqual([])
    })
  })

  describe('findByIdAndUserId', () => {
    it('finds the task for its owner and returns null for anyone else', async () => {
      const created = await repository.create(newTask(ownerId, { title: 'Private' }))

      expect((await repository.findByIdAndUserId(created.id, ownerId))?.title).toBe('Private')
      expect(await repository.findByIdAndUserId(created.id, otherUserId)).toBeNull()
      expect(await repository.findByIdAndUserId(2147483647, ownerId)).toBeNull()
    })
  })

  describe('update', () => {
    it('writes only the columns it was given', async () => {
      const created = await repository.create(
        newTask(ownerId, { title: 'Before', description: 'Keep me' })
      )

      const updated = await repository.update(created.id, ownerId, {
        title: 'After',
        status: TaskStatus.COMPLETED,
      })

      expect(updated?.title).toBe('After')
      expect(updated?.status).toBe(TaskStatus.COMPLETED)
      expect(updated?.description).toBe('Keep me')
    })

    it('clears a nullable column when explicitly given null', async () => {
      const created = await repository.create(
        newTask(ownerId, { description: 'Remove me', dueDate: new Date('2026-12-31T00:00:00Z') })
      )

      const updated = await repository.update(created.id, ownerId, {
        description: null,
        dueDate: null,
      })

      expect(updated?.description).toBeNull()
      expect(updated?.dueDate).toBeNull()
    })

    it('moves updated_at forward', async () => {
      const created = await repository.create(newTask(ownerId))

      const updated = await repository.update(created.id, ownerId, { title: 'Touched' })

      expect(updated?.updatedAt?.getTime()).toBeGreaterThanOrEqual(
        created.updatedAt?.getTime() ?? 0
      )
    })

    it("does not write to another user's task", async () => {
      const created = await repository.create(newTask(ownerId, { title: 'Private' }))

      const result = await repository.update(created.id, otherUserId, { title: 'Pwned' })

      // Ownership is in the UPDATE's WHERE clause, so there is no row to
      // write and nothing to roll back.
      expect(result).toBeNull()
      expect((await repository.findByIdAndUserId(created.id, ownerId))?.title).toBe('Private')
    })

    it('returns null for a task that does not exist', async () => {
      expect(await repository.update(2147483647, ownerId, { title: 'Ghost' })).toBeNull()
    })
  })

  describe('delete', () => {
    it('removes the task and reports that it did', async () => {
      const created = await repository.create(newTask(ownerId))

      expect(await repository.delete(created.id, ownerId)).toBe(true)
      expect(await repository.findByIdAndUserId(created.id, ownerId)).toBeNull()
    })

    it("leaves another user's task in place and reports that nothing was deleted", async () => {
      const created = await repository.create(newTask(ownerId))

      expect(await repository.delete(created.id, otherUserId)).toBe(false)
      expect(await repository.findByIdAndUserId(created.id, ownerId)).not.toBeNull()
    })

    it('reports false for a task that does not exist', async () => {
      expect(await repository.delete(2147483647, ownerId)).toBe(false)
    })
  })

  describe('statisticsFor', () => {
    it('counts by status and priority for that user only', async () => {
      await repository.create(
        newTask(ownerId, { status: TaskStatus.TODO, priority: TaskPriority.HIGH })
      )
      await repository.create(
        newTask(ownerId, { status: TaskStatus.TODO, priority: TaskPriority.MEDIUM })
      )
      await repository.create(
        newTask(ownerId, { status: TaskStatus.COMPLETED, priority: TaskPriority.HIGH })
      )
      await repository.create(
        newTask(otherUserId, { status: TaskStatus.TODO, priority: TaskPriority.LOW })
      )

      const stats = await repository.statisticsFor(ownerId)

      expect(stats.total).toBe(3)
      expect(stats.byStatus).toEqual({ todo: 2, in_progress: 0, completed: 1 })
      expect(stats.byPriority).toEqual({ low: 0, medium: 1, high: 2 })
    })

    it('returns numbers, not the strings COUNT(*) actually sends back', async () => {
      const stats = await repository.statisticsFor(ownerId)

      // bigint arrives from pg as a string; a caller doing `total + 1`
      // would otherwise get "01".
      expect(stats.total).toBe(0)
      expect(typeof stats.total).toBe('number')
      expect(typeof stats.byStatus.todo).toBe('number')
    })
  })
})

async function insertUser(db: PostgresConnection, email: string): Promise<number> {
  const result = await db.query<{ id: number }>(
    'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id',
    ['Task Repo Test User', email, 'not-a-real-hash']
  )

  const id = result.rows[0]?.id
  if (id === undefined) {
    throw new Error(`Failed to seed test user ${email}`)
  }
  return id
}
