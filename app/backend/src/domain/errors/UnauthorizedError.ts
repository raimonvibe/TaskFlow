import { AppError } from './AppError.js'

/** Missing, invalid, expired, or revoked credentials - the umbrella for
 * everything `middleware/auth.js`'s `authenticate()` returned 401 for (no
 * token, blacklisted token, bad signature, wrong algorithm, expired token,
 * stale token) plus invalid login credentials themselves. Kept as a single
 * error type rather than one class per case, so that the *same* generic
 * message can be returned for "wrong password" and "no such user" and avoid
 * user enumeration (see the "no user enumeration" tests in
 * src/test/security/authentication.test.ts) - the message is chosen by the
 * caller, not implied by the class name. */
export class UnauthorizedError extends AppError {
  readonly statusCode = 401

  constructor(message = 'Authentication required') {
    super(message)
  }
}
