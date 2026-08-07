import { AppError } from './AppError.js'

/** Too many requests. express-rate-limit already handles the actual
 * counting/blocking (see authRoutes.js's authLimiter); this exists so any
 * future code path that needs to signal the same condition programmatically
 * (rather than via the rate-limit middleware itself) can throw one
 * consistent error instead of inventing its own 429 response shape. */
export class RateLimitedError extends AppError {
  readonly statusCode = 429

  constructor(message = 'Too many requests, please try again later') {
    super(message)
  }
}
