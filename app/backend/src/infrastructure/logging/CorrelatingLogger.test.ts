import { describe, it, expect, beforeEach } from 'vitest'
import { AsyncLocalRequestContext } from '../context/AsyncLocalRequestContext.js'
import { RecordingLogger } from '../../test/fakes/RecordingLogger.js'
import { CorrelatingLogger } from './CorrelatingLogger.js'

describe('CorrelatingLogger', () => {
  let inner: RecordingLogger
  let context: AsyncLocalRequestContext
  let logger: CorrelatingLogger

  beforeEach(() => {
    inner = new RecordingLogger()
    context = new AsyncLocalRequestContext()
    logger = new CorrelatingLogger(inner, context)
  })

  it('stamps the id of the scope it is called in onto every level', () => {
    context.run('req-1', () => {
      logger.debug('d')
      logger.info('i')
      logger.warn('w')
      logger.error('e')
    })

    expect(inner.lines.map(line => line.meta?.correlationId)).toEqual([
      'req-1',
      'req-1',
      'req-1',
      'req-1',
    ])
  })

  it('merges the id into existing metadata without disturbing it', () => {
    context.run('req-2', () => {
      logger.warn('Auth attempt failed', { reason: 'Invalid credentials', ip: '10.0.0.1' })
    })

    expect(inner.lines[0]?.meta).toEqual({
      reason: 'Invalid credentials',
      ip: '10.0.0.1',
      correlationId: 'req-2',
    })
  })

  it('leaves metadata exactly as it was outside a request', () => {
    logger.info('Server started', { port: 3000 })
    logger.info('No metadata at all')

    // Not `{ port: 3000, correlationId: undefined }` - startup lines should
    // look the way they did before this decorator existed.
    expect(inner.lines[0]?.meta).toEqual({ port: 3000 })
    expect(inner.lines[1]?.meta).toBeUndefined()
  })

  it('keeps concurrent requests from borrowing each other ids', async () => {
    const logAfterATick = (id: string): Promise<void> =>
      context.run(id, async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
        logger.info(`from ${id}`)
      })

    await Promise.all([logAfterATick('req-a'), logAfterATick('req-b')])

    const byMessage = new Map(inner.lines.map(line => [line.message, line.meta?.correlationId]))
    expect(byMessage.get('from req-a')).toBe('req-a')
    expect(byMessage.get('from req-b')).toBe('req-b')
  })

  it('survives awaits, which is the whole reason for the AsyncLocalStorage', async () => {
    await context.run('req-deep', async () => {
      await Promise.resolve()
      await new Promise(resolve => setImmediate(resolve))
      logger.info('three layers down')
    })

    expect(inner.lines[0]?.meta?.correlationId).toBe('req-deep')
  })
})
