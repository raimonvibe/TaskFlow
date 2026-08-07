import type { Logger } from '../../application/ports/ILogger.js'

export interface LoggedLine {
  readonly level: 'debug' | 'info' | 'warn' | 'error'
  readonly message: string
  readonly meta?: Record<string, unknown>
}

/** `Logger` that keeps lines in an array instead of writing them anywhere.
 * Lets tests assert on the audit trail as behavior, and keeps unit tests
 * from touching the filesystem or spamming test output. */
export class RecordingLogger implements Logger {
  readonly lines: LoggedLine[] = []

  debug(message: string, meta?: Record<string, unknown>): void {
    this.lines.push({ level: 'debug', message, meta })
  }

  info(message: string, meta?: Record<string, unknown>): void {
    this.lines.push({ level: 'info', message, meta })
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.lines.push({ level: 'warn', message, meta })
  }

  error(message: string, meta?: Record<string, unknown>): void {
    this.lines.push({ level: 'error', message, meta })
  }

  messages(level?: LoggedLine['level']): string[] {
    return this.lines.filter(line => !level || line.level === level).map(line => line.message)
  }
}
