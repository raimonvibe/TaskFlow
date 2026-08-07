import { AppError } from './AppError.js'

/** The request conflicts with existing state - e.g. registering an email
 * that's already taken. Replaced the `err.code === '23505'` (Postgres
 * unique-violation) check that used to live inside errorHandler.js; the
 * repository layer translates that raw driver error into this domain error,
 * so the HTTP layer never needs to know Postgres error codes exist. */
export class ConflictError extends AppError {
  readonly statusCode = 409

  constructor(message = 'Resource already exists') {
    super(message)
  }
}
