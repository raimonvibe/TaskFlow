import { describe, it, expect, beforeEach } from 'vitest'
import { TaskService } from './TaskService.js'
import { NotFoundError } from '../../domain/errors/NotFoundError.js'
import { ValidationError } from '../../domain/errors/ValidationError.js'
import {
  TaskCreatedEvent,
  TaskDeletedEvent,
  TaskUpdatedEvent,
} from '../../domain/events/TaskEvents.js'
import { FixedClock } from '../../test/fakes/FixedClock.js'
import { InMemoryTaskRepository } from '../../test/fakes/InMemoryTaskRepository.js'
import { RecordingEventBus } from '../../test/fakes/RecordingEventBus.js'

// Replaces controllers/taskController.test.js, which needed vi.mock() on
// four modules (the Task model, the database, prom-client, Winston) before
// it could assert anything, and then asserted on res.status/res.json calls
// rather than on outcomes. Here the service is built from real fakes and
// the assertions are about what is true afterwards.
// See docs/BACKEND_REWRITE_PLAN.md §5.

const NOW = new Date('2026-06-01T12:00:00.000Z')
const OWNER = 1
const OTHER_USER = 2

describe('TaskService', () => {
  let tasks: InMemoryTaskRepository
  let events: RecordingEventBus
  let service: TaskService

  beforeEach(() => {
    tasks = new InMemoryTaskRepository()
    events = new RecordingEventBus()
    service = new TaskService(tasks, events, new FixedClock(NOW))
  })

  describe('createTask', () => {
    it('stores the task and publishes TaskCreatedEvent', async () => {
      const task = await service.createTask(OWNER, {
        title: 'Write the migration',
        description: 'Phase 4',
        status: 'in_progress',
        priority: 'high',
        dueDate: '2026-12-31T00:00:00.000Z',
      })

      expect(task.id).toBeGreaterThan(0)
      expect(task.title).toBe('Write the migration')
      expect(task.status.value).toBe('in_progress')
      expect(task.priority.value).toBe('high')
      expect(task.dueDate).toEqual(new Date('2026-12-31T00:00:00.000Z'))

      const published = events.ofType(TaskCreatedEvent)
      expect(published).toHaveLength(1)
      expect(published[0]?.taskId).toBe(task.id)
      expect(published[0]?.status).toBe('in_progress')
      expect(published[0]?.occurredAt).toEqual(NOW)
    })

    it('applies the schema defaults when status and priority are omitted', async () => {
      const task = await service.createTask(OWNER, { title: 'Minimal' })

      expect(task.status.value).toBe('todo')
      expect(task.priority.value).toBe('medium')
      expect(task.description).toBeNull()
      expect(task.dueDate).toBeNull()
    })

    it('always assigns the task to the calling user', async () => {
      // The signature is the guarantee: ownership is an argument the caller
      // takes from the authenticated request, and there is no field on the
      // input that could override it.
      const task = await service.createTask(OWNER, { title: 'Mine' })

      expect(task.isOwnedBy(OWNER)).toBe(true)
      expect(task.isOwnedBy(OTHER_USER)).toBe(false)
    })

    it('rejects an unrecognized status before touching the repository', async () => {
      await expect(service.createTask(OWNER, { title: 'T', status: 'archived' })).rejects.toThrow(
        ValidationError
      )
      expect(await tasks.findByUserId(OWNER)).toHaveLength(0)
    })

    it('rejects an unparseable due date', async () => {
      await expect(
        service.createTask(OWNER, { title: 'T', dueDate: 'next tuesday' })
      ).rejects.toThrow(ValidationError)
    })
  })

  describe('listTasks', () => {
    beforeEach(async () => {
      await service.createTask(OWNER, { title: 'First', status: 'todo', priority: 'high' })
      await service.createTask(OWNER, { title: 'Second', status: 'completed', priority: 'low' })
      await service.createTask(OTHER_USER, { title: "Someone else's", status: 'todo' })
    })

    it('returns only the calling user tasks, newest first', async () => {
      const listed = await service.listTasks(OWNER)

      expect(listed.map(task => task.title)).toEqual(['Second', 'First'])
    })

    it('filters by status and by priority', async () => {
      expect(await service.listTasks(OWNER, { status: 'todo' })).toHaveLength(1)
      expect(await service.listTasks(OWNER, { priority: 'low' })).toHaveLength(1)
      expect(await service.listTasks(OWNER, { status: 'todo', priority: 'low' })).toHaveLength(0)
    })

    it('rejects a filter value that is not a real status', async () => {
      await expect(service.listTasks(OWNER, { status: "todo' OR '1'='1" })).rejects.toThrow(
        ValidationError
      )
    })
  })

  describe('getTask', () => {
    it('returns the task to its owner', async () => {
      const created = await service.createTask(OWNER, { title: 'Mine' })

      expect((await service.getTask(created.id, OWNER)).id).toBe(created.id)
    })

    it("reports another user's task as not found, not as forbidden", async () => {
      const created = await service.createTask(OWNER, { title: 'Private' })

      // A 403 would confirm the id exists. Same answer as for an id that
      // was never issued - see src/test/security/authorization.test.js.
      await expect(service.getTask(created.id, OTHER_USER)).rejects.toThrow(NotFoundError)
      await expect(service.getTask(999999, OWNER)).rejects.toThrow(NotFoundError)
    })
  })

  describe('updateTask', () => {
    it('applies the change and publishes both statuses', async () => {
      const created = await service.createTask(OWNER, { title: 'Before', status: 'todo' })
      events.published.length = 0

      const updated = await service.updateTask(created.id, OWNER, {
        title: 'After',
        status: 'completed',
      })

      expect(updated.title).toBe('After')
      expect(updated.status.value).toBe('completed')

      const published = events.ofType(TaskUpdatedEvent)
      expect(published).toHaveLength(1)
      expect(published[0]?.previousStatus).toBe('todo')
      expect(published[0]?.status).toBe('completed')
    })

    it('reports the status as unchanged when the update did not touch it', async () => {
      // The gauge subscriber keys off these being equal, which is what
      // taskController.js checked inline before calling dec/inc.
      const created = await service.createTask(OWNER, { title: 'Before', status: 'todo' })
      events.published.length = 0

      await service.updateTask(created.id, OWNER, { title: 'After' })

      const published = events.ofType(TaskUpdatedEvent)
      expect(published[0]?.previousStatus).toBe('todo')
      expect(published[0]?.status).toBe('todo')
    })

    it('leaves unmentioned fields alone but clears one explicitly set to null', async () => {
      const created = await service.createTask(OWNER, {
        title: 'Has everything',
        description: 'A description',
        dueDate: '2026-12-31T00:00:00.000Z',
      })

      const untouched = await service.updateTask(created.id, OWNER, { title: 'Renamed' })
      expect(untouched.description).toBe('A description')
      expect(untouched.dueDate).not.toBeNull()

      const cleared = await service.updateTask(created.id, OWNER, { description: null })
      expect(cleared.description).toBeNull()
      expect(cleared.title).toBe('Renamed')
    })

    it('rejects an update that would change nothing', async () => {
      const created = await service.createTask(OWNER, { title: 'Unchanged' })

      // models/Task.js threw a bare Error here, which reached the client as
      // a 500. An empty update is the caller's mistake, so it is a 400.
      await expect(service.updateTask(created.id, OWNER, {})).rejects.toThrow(ValidationError)
    })

    it("refuses to update another user's task and publishes nothing", async () => {
      const created = await service.createTask(OWNER, { title: 'Private' })
      events.published.length = 0

      await expect(service.updateTask(created.id, OTHER_USER, { title: 'Pwned' })).rejects.toThrow(
        NotFoundError
      )

      expect(events.published).toHaveLength(0)
      expect((await service.getTask(created.id, OWNER)).title).toBe('Private')
    })
  })

  describe('deleteTask', () => {
    it('removes the task and publishes the status it had', async () => {
      const created = await service.createTask(OWNER, { title: 'Doomed', status: 'in_progress' })
      events.published.length = 0

      await service.deleteTask(created.id, OWNER)

      const published = events.ofType(TaskDeletedEvent)
      expect(published).toHaveLength(1)
      expect(published[0]?.status).toBe('in_progress')
      await expect(service.getTask(created.id, OWNER)).rejects.toThrow(NotFoundError)
    })

    it("refuses to delete another user's task", async () => {
      const created = await service.createTask(OWNER, { title: 'Private' })

      await expect(service.deleteTask(created.id, OTHER_USER)).rejects.toThrow(NotFoundError)
      expect((await service.getTask(created.id, OWNER)).title).toBe('Private')
    })
  })

  describe('getStatistics', () => {
    it('counts the calling user tasks by status and priority', async () => {
      await service.createTask(OWNER, { title: '1', status: 'todo', priority: 'high' })
      await service.createTask(OWNER, { title: '2', status: 'todo', priority: 'medium' })
      await service.createTask(OWNER, { title: '3', status: 'completed', priority: 'high' })
      await service.createTask(OTHER_USER, { title: '4', status: 'todo', priority: 'low' })

      const stats = await service.getStatistics(OWNER)

      expect(stats.total).toBe(3)
      expect(stats.byStatus).toEqual({ todo: 2, in_progress: 0, completed: 1 })
      expect(stats.byPriority).toEqual({ low: 0, medium: 1, high: 2 })
    })

    it('reports zeroes rather than an empty object for a user with no tasks', async () => {
      const stats = await service.getStatistics(OWNER)

      expect(stats.total).toBe(0)
      expect(stats.byStatus.todo).toBe(0)
    })
  })
})
