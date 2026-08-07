import type { Clock } from '../../application/ports/IClock.js'

/** The real clock. Trivial on purpose - see application/ports/IClock.ts for
 * why this exists as an injectable seam instead of calling `new Date()`
 * directly throughout the codebase. */
export class SystemClock implements Clock {
  now(): Date {
    return new Date()
  }
}
