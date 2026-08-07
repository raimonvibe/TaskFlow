import { AppError } from './AppError.js'

/** Missing, invalid, expired, or revoked credentials - the umbrella for
 * everything middleware/auth.js's `authenticate()` currently returns 401
 * for (no token, blacklisted token, bad signature, wrong algorithm, expired
 * token, stale token) plus invalid login credentials themselves. Kept as a
 * single error type rather than one class per case, matching how the
 * current code deliberately returns the *same* generic message for "wrong
 * password" and "no such user" to avoid user enumeration (see
 * src/test/security/authentication.test.js's "no user enumeration" tests) -
 * the message is chosen by the caller, not implied by the class name. */
export class UnauthorizedError extends AppError {
  readonly statusCode = 401

  constructor(message = 'Authentication required') {
    super(message)
  }
}
