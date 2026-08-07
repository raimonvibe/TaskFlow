import { AppError } from './AppError.js'

/** The request conflicts with existing state - e.g. registering an email
 * that's already taken. Replaces the current `err.code === '23505'`
 * (Postgres unique-violation) check living inside errorHandler.js; the
 * repository layer will be the one translating that raw driver error into
 * this domain error, so the HTTP layer never needs to know Postgres error
 * codes exist. */
export class ConflictError extends AppError {
  readonly statusCode = 409

  constructor(message = 'Resource already exists') {
    super(message)
  }
}
