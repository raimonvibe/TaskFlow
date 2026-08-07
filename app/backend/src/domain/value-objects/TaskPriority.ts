import { ValidationError } from '../errors/ValidationError.js'

export type TaskPriorityValue = 'low' | 'medium' | 'high'

/**
 * How urgent a task is. Same shape and same reasoning as `TaskStatus`.
 *
 * Deliberately a second small class rather than both sharing a generic
 * enum-value-object base: the base would be about forty lines of type
 * parameters to save about twenty lines of duplication, and each of these
 * is likely to grow its own behavior (an ordering for priority, a
 * terminal-state check for status) that the shared version would then have
 * to accommodate.
 */
export class TaskPriority {
  static readonly LOW = new TaskPriority('low')
  static readonly MEDIUM = new TaskPriority('medium')
  static readonly HIGH = new TaskPriority('high')

  /** What the `priority` column defaults to, matching schema.sql. */
  static readonly DEFAULT = TaskPriority.MEDIUM

  private static readonly ALL: readonly TaskPriority[] = [
    TaskPriority.LOW,
    TaskPriority.MEDIUM,
    TaskPriority.HIGH,
  ]

  private constructor(readonly value: TaskPriorityValue) {}

  static create(raw: string): TaskPriority {
    const match = TaskPriority.ALL.find(priority => priority.value === raw)

    if (!match) {
      throw new ValidationError('Invalid priority', [
        { field: 'priority', message: 'Invalid priority' },
      ])
    }

    return match
  }

  static values(): readonly TaskPriorityValue[] {
    return TaskPriority.ALL.map(priority => priority.value)
  }

  static all(): readonly TaskPriority[] {
    return TaskPriority.ALL
  }

  equals(other: TaskPriority): boolean {
    return this.value === other.value
  }

  toString(): string {
    return this.value
  }

  toJSON(): string {
    return this.value
  }
}
