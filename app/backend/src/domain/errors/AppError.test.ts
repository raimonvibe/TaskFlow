import { describe, it, expect } from 'vitest'
import {
  AppError,
  NotFoundError,
  ValidationError,
  ConflictError,
  UnauthorizedError,
  RateLimitedError,
} from './index.js'

describe('AppError hierarchy', () => {
  const cases: Array<{
    name: string
    build: () => AppError
    statusCode: number
    ctor: abstract new (...args: never[]) => AppError
  }> = [
    {
      name: 'NotFoundError',
      build: () => new NotFoundError('no task'),
      statusCode: 404,
      ctor: NotFoundError,
    },
    {
      name: 'ValidationError',
      build: () => new ValidationError('bad input'),
      statusCode: 400,
      ctor: ValidationError,
    },
    {
      name: 'ConflictError',
      build: () => new ConflictError('already exists'),
      statusCode: 409,
      ctor: ConflictError,
    },
    {
      name: 'UnauthorizedError',
      build: () => new UnauthorizedError('nope'),
      statusCode: 401,
      ctor: UnauthorizedError,
    },
    {
      name: 'RateLimitedError',
      build: () => new RateLimitedError('slow down'),
      statusCode: 429,
      ctor: RateLimitedError,
    },
  ]

  it.each(cases)(
    '$name is an AppError with statusCode $statusCode',
    ({ build, statusCode, ctor }) => {
      const err = build()
      expect(err).toBeInstanceOf(AppError)
      expect(err).toBeInstanceOf(ctor)
      expect(err).toBeInstanceOf(Error)
      expect(err.statusCode).toBe(statusCode)
      expect(err.isOperational).toBe(true)
      expect(err.name).toBe(ctor.name)
    }
  )

  it('each subclass has a sensible default message when none is given', () => {
    expect(new NotFoundError().message).toBe('Resource not found')
    expect(new ValidationError().message).toBe('Validation failed')
    expect(new ConflictError().message).toBe('Resource already exists')
    expect(new UnauthorizedError().message).toBe('Authentication required')
    expect(new RateLimitedError().message).toBe('Too many requests, please try again later')
  })

  it('ValidationError carries optional field-level details, mirroring the current validate.js shape', () => {
    const err = new ValidationError('Validation failed', [
      { field: 'email', message: 'Valid email is required' },
      { field: 'password', message: 'Password must be between 8 and 128 characters' },
    ])

    expect(err.details).toHaveLength(2)
    expect(err.details?.[0]).toEqual({ field: 'email', message: 'Valid email is required' })
  })

  it('errors without details leave `details` undefined rather than an empty array', () => {
    expect(new NotFoundError().details).toBeUndefined()
  })

  it('captures a real stack trace, not just the message', () => {
    const err = new ConflictError('dup')
    expect(err.stack).toBeDefined()
    expect(err.stack).toContain('ConflictError')
  })
})
