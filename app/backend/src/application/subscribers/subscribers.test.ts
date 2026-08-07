import { describe, it, expect, beforeEach } from 'vitest'
import { AuditLogSubscriber } from './AuditLogSubscriber.js'
import { MetricsSubscriber } from './MetricsSubscriber.js'
import {
  AuthAttemptFailedEvent,
  UserAuthenticatedEvent,
  UserLoggedOutEvent,
  UserRegisteredEvent,
} from '../../domain/events/AuthEvents.js'
import type { AuthAttemptType } from '../../domain/events/AuthEvents.js'
import {
  TaskCreatedEvent,
  TaskDeletedEvent,
  TaskUpdatedEvent,
} from '../../domain/events/TaskEvents.js'
import type { TaskStatusValue } from '../../domain/value-objects/TaskStatus.js'
import type { MetricsRegistry } from '../ports/IMetricsRegistry.js'
import { InMemoryEventBus } from '../../infrastructure/events/InMemoryEventBus.js'
import { RecordingLogger } from '../../test/fakes/RecordingLogger.js'

class RecordingMetrics implements MetricsRegistry {
  readonly recorded: Array<{ type: AuthAttemptType; status: 'success' | 'failure' }> = []
  readonly tasks: string[] = []

  recordAuthAttempt(type: AuthAttemptType, status: 'success' | 'failure'): void {
    this.recorded.push({ type, status })
  }

  recordTaskCreated(status: TaskStatusValue): void {
    this.tasks.push(`created:${status}`)
  }

  recordTaskStatusChanged(previous: TaskStatusValue, current: TaskStatusValue): void {
    this.tasks.push(`changed:${previous}->${current}`)
  }

  recordTaskDeleted(status: TaskStatusValue): void {
    this.tasks.push(`deleted:${status}`)
  }
}

describe('MetricsSubscriber', () => {
  let events: InMemoryEventBus
  let metrics: RecordingMetrics

  beforeEach(() => {
    events = new InMemoryEventBus()
    metrics = new RecordingMetrics()
    new MetricsSubscriber(metrics).register(events)
  })

  it('counts a registration as a register success', async () => {
    await events.publish(new UserRegisteredEvent(1, 'ada@example.com'))

    expect(metrics.recorded).toEqual([{ type: 'register', status: 'success' }])
  })

  it('counts an authentication as a login success', async () => {
    await events.publish(new UserAuthenticatedEvent(1, 'ada@example.com'))

    expect(metrics.recorded).toEqual([{ type: 'login', status: 'success' }])
  })

  it('counts a failed attempt against the flow it belongs to', async () => {
    await events.publish(new AuthAttemptFailedEvent('register', 'User already exists'))
    await events.publish(new AuthAttemptFailedEvent('login', 'Invalid credentials'))

    // Same label pairs the inline authAttempts.inc() calls produce today,
    // so auth_attempts_total keeps its existing series.
    expect(metrics.recorded).toEqual([
      { type: 'register', status: 'failure' },
      { type: 'login', status: 'failure' },
    ])
  })

  it('ignores events it does not subscribe to', async () => {
    await events.publish(new UserLoggedOutEvent(1))

    expect(metrics.recorded).toHaveLength(0)
  })

  it('tracks tasks entering, moving between, and leaving status buckets', async () => {
    await events.publish(new TaskCreatedEvent(1, 10, 'todo'))
    await events.publish(new TaskUpdatedEvent(1, 10, 'todo', 'completed'))
    await events.publish(new TaskDeletedEvent(1, 10, 'completed'))

    expect(metrics.tasks).toEqual(['created:todo', 'changed:todo->completed', 'deleted:completed'])
  })

  it('still reports an update that left the status alone', async () => {
    // Whether that is a no-op is the registry's call, not the subscriber's -
    // the subscriber's job is to report what the event said.
    await events.publish(new TaskUpdatedEvent(1, 10, 'todo', 'todo'))

    expect(metrics.tasks).toEqual(['changed:todo->todo'])
  })
})

describe('AuditLogSubscriber', () => {
  let events: InMemoryEventBus
  let logger: RecordingLogger

  beforeEach(() => {
    events = new InMemoryEventBus()
    logger = new RecordingLogger()
    new AuditLogSubscriber(logger).register(events)
  })

  it('logs the same lines the controller emits today', async () => {
    await events.publish(new UserRegisteredEvent(1, 'ada@example.com'))
    await events.publish(new UserAuthenticatedEvent(1, 'ada@example.com'))
    await events.publish(new UserLoggedOutEvent(1))

    expect(logger.messages('info')).toEqual([
      'User registered',
      'User logged in',
      'User logged out',
    ])
  })

  it('includes the identifying metadata on each line', async () => {
    await events.publish(new UserRegisteredEvent(42, 'ada@example.com'))

    expect(logger.lines[0]?.meta).toEqual({ userId: 42, email: 'ada@example.com' })
  })

  it('logs failures at warn with the reason', async () => {
    await events.publish(
      new AuthAttemptFailedEvent('login', 'Invalid credentials', 'ada@example.com')
    )

    expect(logger.messages('warn')).toEqual(['Auth attempt failed'])
    expect(logger.lines[0]?.meta?.reason).toBe('Invalid credentials')
  })

  it('logs the task lines taskController.js emits today', async () => {
    await events.publish(new TaskCreatedEvent(7, 42, 'todo'))
    await events.publish(new TaskUpdatedEvent(7, 42, 'todo', 'completed'))
    await events.publish(new TaskDeletedEvent(7, 42, 'completed'))

    expect(logger.messages('info')).toEqual(['Task created', 'Task updated', 'Task deleted'])
    expect(logger.lines[0]?.meta).toEqual({ taskId: 7, userId: 42 })
  })
})

describe('subscribers are independent', () => {
  it('a throwing subscriber does not stop the others', async () => {
    const events = new InMemoryEventBus()
    const logger = new RecordingLogger()
    const metrics = new RecordingMetrics()

    events.subscribe(UserRegisteredEvent.NAME, () => {
      throw new Error('metrics backend unreachable')
    })
    new MetricsSubscriber(metrics).register(events)
    new AuditLogSubscriber(logger).register(events)

    await events.publish(new UserRegisteredEvent(1, 'ada@example.com'))

    // A registration must not fail because a side effect did - which is
    // exactly what inline `authAttempts.inc()` in the controller could not
    // guarantee.
    expect(metrics.recorded).toHaveLength(1)
    expect(logger.messages('info')).toContain('User registered')
  })
})
