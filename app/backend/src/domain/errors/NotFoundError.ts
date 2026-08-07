import { AppError } from './AppError.js'

/** A resource doesn't exist - or, for another user's resource, doesn't
 * exist *as far as this caller is concerned* (see the BOLA/IDOR tests in
 * src/test/security/authorization.test.js: a non-owner gets 404, not 403,
 * so the response itself never confirms the resource exists at all). */
export class NotFoundError extends AppError {
  readonly statusCode = 404

  constructor(message = 'Resource not found') {
    super(message)
  }
}
