/**
 * Logging port. Keeps the call shape `utils/logger.js` had -
 * `logger.info('message', { structured: 'metadata' })` - so moving to this
 * interface didn't change how log lines look. Services depend on this
 * interface, not on Winston directly (Adapter pattern - `WinstonLogger` in
 * infrastructure/logging/ is the concrete implementation).
 */
export interface Logger {
  debug(message: string, meta?: Record<string, unknown>): void
  info(message: string, meta?: Record<string, unknown>): void
  warn(message: string, meta?: Record<string, unknown>): void
  error(message: string, meta?: Record<string, unknown>): void
}
