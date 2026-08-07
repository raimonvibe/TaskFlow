import { describe, it, expect } from 'vitest'
import { EventEmitter } from 'events'
import type { Request, Response } from 'express'
import { createRequestLogger } from './requestLogger.js'
import type { HttpMetrics, HttpRequestSample } from '../../../application/ports/IHttpMetrics.js'
import { RecordingLogger } from '../../../test/fakes/RecordingLogger.js'

class RecordingHttpMetrics implements HttpMetrics {
  started = 0
  readonly completed: HttpRequestSample[] = []

  requestStarted(): void {
    this.started += 1
  }

  requestCompleted(sample: HttpRequestSample): void {
    this.completed.push(sample)
  }
}

/** Minimal stand-ins: the middleware only reads these fields and only
 * needs `finish` to fire, so an EventEmitter is the whole response. */
function fakeRequest(overrides: Partial<Request> = {}): Request {
  return {
    method: 'GET',
    originalUrl: '/api/tasks?status=todo',
    ip: '10.0.0.1',
    ...overrides,
  } as Request
}

function fakeResponse(statusCode = 200): Response & { finish: () => void } {
  const emitter = new EventEmitter() as Response & { finish: () => void }
  emitter.statusCode = statusCode
  emitter.finish = () => emitter.emit('finish')
  return emitter
}

describe('requestLogger', () => {
  it('passes the request straight through', () => {
    const middleware = createRequestLogger(new RecordingLogger(), new RecordingHttpMetrics())
    let calledNext = false

    middleware(fakeRequest(), fakeResponse(), () => {
      calledNext = true
    })

    expect(calledNext).toBe(true)
  })

  it('logs both ends of the request', () => {
    const logger = new RecordingLogger()
    const middleware = createRequestLogger(logger, new RecordingHttpMetrics())
    const res = fakeResponse(201)

    middleware(fakeRequest({ method: 'POST' }), res, () => {})
    expect(logger.messages('info')).toEqual(['Incoming request'])

    res.finish()
    expect(logger.messages('info')).toEqual(['Incoming request', 'Request completed'])
    expect(logger.lines[1]?.meta).toMatchObject({ method: 'POST', statusCode: 201 })
  })

  it('opens the in-flight count on arrival and closes it on finish', () => {
    const metrics = new RecordingHttpMetrics()
    const middleware = createRequestLogger(new RecordingLogger(), metrics)
    const res = fakeResponse()

    middleware(fakeRequest(), res, () => {})
    // Still in flight - nothing completed yet, which is what makes the
    // active_connections gauge mean anything.
    expect(metrics.started).toBe(1)
    expect(metrics.completed).toHaveLength(0)

    res.finish()
    expect(metrics.completed).toHaveLength(1)
  })

  it('labels the sample with the matched route when Express has one', () => {
    const metrics = new RecordingHttpMetrics()
    const middleware = createRequestLogger(new RecordingLogger(), metrics)
    const res = fakeResponse(200)

    middleware(fakeRequest({ route: { path: '/:id' } } as Partial<Request>), res, () => {})
    res.finish()

    expect(metrics.completed[0]).toMatchObject({ method: 'GET', route: '/:id', statusCode: 200 })
  })

  it('falls back to the raw URL when no route matched', () => {
    const metrics = new RecordingHttpMetrics()
    const middleware = createRequestLogger(new RecordingLogger(), metrics)
    const res = fakeResponse(404)

    // 404s never reach a route handler, so req.route is undefined - the
    // label has to come from somewhere.
    middleware(fakeRequest({ originalUrl: '/nope' }), res, () => {})
    res.finish()

    expect(metrics.completed[0]?.route).toBe('/nope')
  })

  it('reports the duration in seconds', () => {
    const metrics = new RecordingHttpMetrics()
    const middleware = createRequestLogger(new RecordingLogger(), metrics)
    const res = fakeResponse()

    middleware(fakeRequest(), res, () => {})
    res.finish()

    // Prometheus histograms are declared in seconds; a millisecond value
    // here would silently land every request in the top bucket.
    const duration = metrics.completed[0]?.durationSeconds ?? -1
    expect(duration).toBeGreaterThanOrEqual(0)
    expect(duration).toBeLessThan(1)
  })
})
