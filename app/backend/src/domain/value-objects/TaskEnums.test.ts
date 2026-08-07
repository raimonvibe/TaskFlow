import { describe, it, expect } from 'vitest'
import { TaskPriority } from './TaskPriority.js'
import { TaskStatus } from './TaskStatus.js'
import { ValidationError } from '../errors/ValidationError.js'

describe('TaskStatus', () => {
  it('accepts the three states the schema allows', () => {
    expect(TaskStatus.values()).toEqual(['todo', 'in_progress', 'completed'])
  })

  it('returns the interned instance, so equal statuses are the same object', () => {
    expect(TaskStatus.create('todo')).toBe(TaskStatus.TODO)
    expect(TaskStatus.create('todo').equals(TaskStatus.TODO)).toBe(true)
  })

  it('rejects anything else as a ValidationError, not a generic Error', () => {
    // A 400 rather than a 500 is the whole reason this is a value object
    // and not a string: the failure is classified where it is detected.
    const error = (() => {
      try {
        TaskStatus.create('archived')
      } catch (e) {
        return e
      }
    })()

    expect(error).toBeInstanceOf(ValidationError)
    expect((error as ValidationError).statusCode).toBe(400)
  })

  it('serializes as the plain string the API has always sent', () => {
    expect(JSON.stringify({ status: TaskStatus.COMPLETED })).toBe('{"status":"completed"}')
  })

  it('defaults to todo, matching the column default', () => {
    expect(TaskStatus.DEFAULT).toBe(TaskStatus.TODO)
  })
})

describe('TaskPriority', () => {
  it('accepts the three levels the schema allows', () => {
    expect(TaskPriority.values()).toEqual(['low', 'medium', 'high'])
  })

  it('rejects anything else', () => {
    expect(() => TaskPriority.create('urgent')).toThrow(ValidationError)
  })

  it('defaults to medium, matching the column default', () => {
    expect(TaskPriority.DEFAULT).toBe(TaskPriority.MEDIUM)
  })
})
