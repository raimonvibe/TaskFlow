import type { Express } from 'express'
import request from 'supertest'
import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { createContainer } from '../composition/container.js'
import { createApp } from '../presentation/http/app.js'
import { RecordingLogger } from './fakes/RecordingLogger.js'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

/**
 * Driven through the real middleware stack rather than by calling the
 * middleware directly, because the interesting question is not "does the
 * store work" - that is AsyncLocalStorage's problem - but "does the scope
 * still exist by the time each log line is written", and only a real
 * request answers that.
 */
describe('correlation IDs', () => {
  let logger: RecordingLogger
  let app: Express

  beforeAll(() => {
    logger = new RecordingLogger()
    app = createApp(createContainer({ logger }))
  })

  beforeEach(() => {
    logger.lines.length = 0
  })

  const idsIn = (message: string): unknown[] =>
    logger.lines.filter(line => line.message === message).map(line => line.meta?.correlationId)

  it('generates one and returns it on the response header', async () => {
    const response = await request(app).get('/api/nope')

    expect(response.headers['x-request-id']).toMatch(UUID_PATTERN)
  })

  it('tags both ends of the request with the same id', async () => {
    const response = await request(app).get('/api/nope')
    const id = response.headers['x-request-id']

    expect(idsIn('Incoming request')).toEqual([id])
    // The completion line is written from a res.on('finish') callback, which
    // is a different tick from the one that opened the scope. If the context
    // did not survive into it, every request would log its opening tagged
    // and its outcome untagged - the half that matters most when reading
    // back a failure.
    expect(idsIn('Request completed')).toEqual([id])
  })

  it('continues a trace the caller already started', async () => {
    const response = await request(app).get('/api/nope').set('X-Request-Id', 'trace-abc.123:9')

    expect(response.headers['x-request-id']).toBe('trace-abc.123:9')
    expect(idsIn('Incoming request')).toEqual(['trace-abc.123:9'])
  })

  it.each([
    ['spaces and punctuation', 'not a valid id!'],
    ['an attempt at markup', '<script>alert(1)</script>'],
    ['something far too long', 'x'.repeat(129)],
    ['an empty value', ''],
  ])('ignores an unusable inbound id (%s) and generates its own', async (_label, value) => {
    const response = await request(app).get('/api/nope').set('X-Request-Id', value)

    expect(response.headers['x-request-id']).not.toBe(value)
    expect(response.headers['x-request-id']).toMatch(UUID_PATTERN)
  })

  it('accepts an id of exactly the maximum length', async () => {
    const id = 'a'.repeat(128)
    const response = await request(app).get('/api/nope').set('X-Request-Id', id)

    expect(response.headers['x-request-id']).toBe(id)
  })

  it('keeps ids apart when requests overlap', async () => {
    const responses = await Promise.all([
      request(app).get('/api/nope'),
      request(app).get('/api/nope'),
      request(app).get('/api/nope'),
    ])

    const headerIds = responses.map(r => r.headers['x-request-id'])
    expect(new Set(headerIds).size).toBe(3)

    // Every logged pair belongs to one request: no line borrowed another's
    // id, which is the failure mode a plain module-level variable would have.
    const loggedIds = idsIn('Incoming request')
    expect(new Set(loggedIds)).toEqual(new Set(headerIds))
  })

  it('tags the 404 body-less paths too, since those are what get reported', async () => {
    const response = await request(app).get('/definitely-not-a-route')

    expect(response.status).toBe(404)
    expect(response.headers['x-request-id']).toMatch(UUID_PATTERN)
  })
})
