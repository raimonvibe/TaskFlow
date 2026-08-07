import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('../utils/logger.js', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}))

import { errorHandler, notFound } from './errorHandler.js'

// This file exists because of a real information-disclosure bug: an
// unclassified 500 (a raw driver error, a third-party library's internal
// message, a file path - anything not explicitly mapped below) used to be
// sent straight to the client, even in production. These tests pin down
// both halves of the fix: classified errors keep their safe, specific
// message in every environment; anything unclassified is generic in
// production and detailed in development.
describe('errorHandler', () => {
  let mockReq, mockRes, mockNext
  const originalEnv = process.env.NODE_ENV

  beforeEach(() => {
    mockReq = { method: 'GET', originalUrl: '/api/tasks', headers: {} }
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    }
    mockNext = vi.fn()
  })

  afterEach(() => {
    process.env.NODE_ENV = originalEnv
  })

  it('hides an unclassified 500 error message in production', () => {
    process.env.NODE_ENV = 'production'
    const err = new Error('relation "users" does not exist at /app/src/config/database.js:42')

    errorHandler(err, mockReq, mockRes, mockNext)

    expect(mockRes.status).toHaveBeenCalledWith(500)
    const body = mockRes.json.mock.calls[0][0]
    expect(body.message).toBe('Internal Server Error')
    expect(body.message).not.toContain('database.js')
    expect(body.stack).toBeUndefined()
  })

  it('includes the real message and stack for an unclassified 500 in development', () => {
    process.env.NODE_ENV = 'development'
    const err = new Error('boom')

    errorHandler(err, mockReq, mockRes, mockNext)

    const body = mockRes.json.mock.calls[0][0]
    expect(body.message).toBe('boom')
    expect(body.stack).toBeDefined()
  })

  it('still returns the safe, specific message for a classified error in production', () => {
    process.env.NODE_ENV = 'production'
    const err = new Error('duplicate key value violates unique constraint')
    err.code = '23505'

    errorHandler(err, mockReq, mockRes, mockNext)

    expect(mockRes.status).toHaveBeenCalledWith(409)
    expect(mockRes.json.mock.calls[0][0].message).toBe('Resource already exists')
  })

  it('maps a JsonWebTokenError to a generic 401 without leaking jwt internals', () => {
    process.env.NODE_ENV = 'production'
    const err = new Error('jwt malformed')
    err.name = 'JsonWebTokenError'

    errorHandler(err, mockReq, mockRes, mockNext)

    expect(mockRes.status).toHaveBeenCalledWith(401)
    expect(mockRes.json.mock.calls[0][0].message).toBe('Invalid token')
  })

  it('never includes a stack trace in the response body outside development', () => {
    process.env.NODE_ENV = 'production'
    errorHandler(new Error('anything'), mockReq, mockRes, mockNext)
    expect(mockRes.json.mock.calls[0][0].stack).toBeUndefined()
  })
})

describe('notFound', () => {
  it('returns a 404 with the requested path, not internal routing details', () => {
    const mockReq = { originalUrl: '/api/does-not-exist' }
    const mockRes = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() }

    notFound(mockReq, mockRes)

    expect(mockRes.status).toHaveBeenCalledWith(404)
    expect(mockRes.json.mock.calls[0][0].message).toBe('Route /api/does-not-exist not found')
  })
})
