import type { Request, Response } from 'express'
import { describe, it, expect, beforeEach } from 'vitest'
import { UnauthorizedError } from '../../../domain/errors/UnauthorizedError.js'
import { RecordingLogger } from '../../../test/fakes/RecordingLogger.js'
import { createErrorHandler } from './errorHandler.js'

function fakeReq(method = 'POST', originalUrl = '/api/auth/login'): Request {
  return { method, originalUrl } as Request
}

function fakeRes(): Response & { statusCode: number; body: unknown } {
  const res = {
    statusCode: 0,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code
      return this
    },
    json(body: unknown) {
      this.body = body
      return this
    },
  }
  return res as Response & { statusCode: number; body: unknown }
}

describe('errorHandler', () => {
  let logger: RecordingLogger

  beforeEach(() => {
    logger = new RecordingLogger()
  })

  it('logs expected 4xx AppErrors as warn, not as an application error', () => {
    const handler = createErrorHandler(logger, { includeStack: false, hideInternalErrors: true })
    const res = fakeRes()

    handler(new UnauthorizedError('Invalid credentials'), fakeReq(), res, () => undefined)

    expect(res.statusCode).toBe(401)
    expect(res.body).toEqual({ status: 'error', message: 'Invalid credentials' })
    expect(logger.messages('warn')).toEqual(['Request rejected'])
    expect(logger.messages('error')).toEqual([])
    expect(logger.lines[0]?.meta).toMatchObject({
      error: 'Invalid credentials',
      statusCode: 401,
      method: 'POST',
      url: '/api/auth/login',
    })
  })

  it('still logs unexpected failures at error, with a stack', () => {
    const handler = createErrorHandler(logger, { includeStack: false, hideInternalErrors: true })
    const res = fakeRes()
    const boom = new Error('connection lost')

    handler(boom, fakeReq('GET', '/api/tasks'), res, () => undefined)

    expect(res.statusCode).toBe(500)
    expect(res.body).toEqual({ status: 'error', message: 'Internal Server Error' })
    expect(logger.messages('error')).toEqual(['Error occurred'])
    expect(logger.lines[0]?.meta?.stack).toBe(boom.stack)
  })
})
