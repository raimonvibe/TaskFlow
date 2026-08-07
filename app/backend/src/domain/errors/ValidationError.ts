import { AppError } from './AppError.js'

/** Input failed validation - the current express-validator equivalent of
 * `validate.js`'s 400 response, but thrown from anywhere (including domain
 * value objects like Email), not just route-level middleware. */
export class ValidationError extends AppError {
  readonly statusCode = 400

  constructor(
    message = 'Validation failed',
    details?: ReadonlyArray<{ field: string; message: string }>
  ) {
    super(message, details)
  }
}
