import { AppError } from './AppError.js'

/** Input failed validation - the same 400 response `validate.js` produced,
 * but throwable from anywhere (including domain value objects like Email),
 * not just route-level middleware. */
export class ValidationError extends AppError {
  readonly statusCode = 400

  constructor(
    message = 'Validation failed',
    details?: ReadonlyArray<{ field: string; message: string }>
  ) {
    super(message, details)
  }
}
