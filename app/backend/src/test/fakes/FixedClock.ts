import type { Clock } from '../../application/ports/IClock.js'

/** Test double for `Clock` - always returns the same instant, so tests
 * touching expiry/age logic don't race the real clock or need fake timers. */
export class FixedClock implements Clock {
  constructor(private readonly fixedTime: Date) {}

  now(): Date {
    return this.fixedTime
  }
}
