import fs from 'fs'
import winston from 'winston'
import type { Logger } from '../../application/ports/ILogger.js'

const { combine, timestamp, printf, colorize, errors } = winston.format

const logFormat = printf(({ level, message, timestamp, stack, ...metadata }) => {
  let msg = `${timestamp} [${level}]: ${message}`
  if (stack) {
    msg += `\n${stack}`
  }
  if (Object.keys(metadata).length > 0) {
    msg += `\n${JSON.stringify(metadata, null, 2)}`
  }
  return msg
})

export interface WinstonLoggerOptions {
  level?: string
  /**
   * Write to logs/error.log and logs/combined.log in addition to the
   * console - the production default, matching today's utils/logger.js
   * exactly. Set to `false` in tests (or anywhere else that shouldn't touch
   * the filesystem) - unlike the current module, which unconditionally
   * creates a `logs/` directory as a side effect of being imported, this
   * only happens when file transports are actually enabled.
   */
  enableFileTransports?: boolean
}

/** `Logger` port implementation backed by Winston. Adapter pattern - the
 * rest of the app depends on `Logger`, never on `winston` directly. */
export class WinstonLogger implements Logger {
  private readonly winstonLogger: winston.Logger

  constructor(options: WinstonLoggerOptions = {}) {
    const { level = 'info', enableFileTransports = true } = options

    const transports: winston.transport[] = [
      new winston.transports.Console({
        format: combine(colorize(), timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), logFormat),
      }),
    ]

    if (enableFileTransports) {
      if (!fs.existsSync('logs')) {
        fs.mkdirSync('logs')
      }
      transports.push(
        new winston.transports.File({
          filename: 'logs/error.log',
          level: 'error',
          maxsize: 5242880, // 5MB
          maxFiles: 5,
        }),
        new winston.transports.File({
          filename: 'logs/combined.log',
          maxsize: 5242880, // 5MB
          maxFiles: 5,
        })
      )
    }

    this.winstonLogger = winston.createLogger({
      level,
      format: combine(
        errors({ stack: true }),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        logFormat
      ),
      transports,
    })
  }

  /** Exposed for tests/inspection - not part of the `Logger` interface. */
  get level(): string {
    return this.winstonLogger.level
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    this.winstonLogger.debug(message, meta)
  }

  info(message: string, meta?: Record<string, unknown>): void {
    this.winstonLogger.info(message, meta)
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.winstonLogger.warn(message, meta)
  }

  error(message: string, meta?: Record<string, unknown>): void {
    this.winstonLogger.error(message, meta)
  }
}
