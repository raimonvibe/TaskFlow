import { describe, it, expect } from 'vitest'
import fs from 'fs'
import { WinstonLogger } from './WinstonLogger.js'

// Uses the real winston library (not a mock) with file transports disabled,
// so these tests exercise the actual adapter wiring without touching the
// filesystem or needing to reimplement winston's internals as a mock.
describe('WinstonLogger', () => {
  it('defaults to "info" level', () => {
    const logger = new WinstonLogger({ enableFileTransports: false })
    expect(logger.level).toBe('info')
  })

  it('respects an explicit level', () => {
    const logger = new WinstonLogger({ level: 'debug', enableFileTransports: false })
    expect(logger.level).toBe('debug')
  })

  it('implements the Logger port - debug/info/warn/error all callable with message + metadata', () => {
    const logger = new WinstonLogger({ enableFileTransports: false })

    expect(() => logger.debug('debug message', { a: 1 })).not.toThrow()
    expect(() => logger.info('info message', { b: 2 })).not.toThrow()
    expect(() => logger.warn('warn message', { c: 3 })).not.toThrow()
    expect(() => logger.error('error message', { d: 4 })).not.toThrow()
  })

  it('is callable with no metadata at all', () => {
    const logger = new WinstonLogger({ enableFileTransports: false })
    expect(() => logger.info('just a message')).not.toThrow()
  })

  it('does not create a logs/ directory when file transports are disabled', () => {
    const existedBefore = fs.existsSync('logs')

    new WinstonLogger({ enableFileTransports: false })

    // Only meaningful if it didn't already exist from some other process -
    // if it did, this test can't prove much either way, so it's skipped
    // rather than giving a false signal.
    if (!existedBefore) {
      expect(fs.existsSync('logs')).toBe(false)
    }
  })
})
