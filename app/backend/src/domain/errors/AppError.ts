/**
 * Base class for every error the application deliberately throws (as
 * opposed to an unexpected bug or a driver-level failure).
 *
 * This replaces the ad hoc, inconsistent error handling in the current
 * codebase: `authController.js` sends bare `{ message }`, `validate.js`
 * sends `{ status: 'error', message, errors }`, and `errorHandler.js`
 * inspects raw Postgres error codes (`err.code === '23505'`) to decide what
 * to tell the client. With this hierarchy, every code path throws an
 * `AppError` subclass carrying its own `statusCode`, and the (future)
 * presentation-layer error middleware becomes one `instanceof AppError`
 * check - see docs/BACKEND_REWRITE_PLAN.md §1 and §6.
 *
 * `isOperational: true` marks this as an expected, "safe to show the
 * client" error - as opposed to a genuine bug, where `isOperational` stays
 * false and the middleware falls back to a generic message instead of
 * leaking whatever the real error says (the same principle
 * `errorHandler.js` already applies for production 500s, formalized here).
 */
export abstract class AppError extends Error {
  abstract readonly statusCode: number
  readonly isOperational: boolean = true

  /** Optional field-level validation errors (mirrors validate.js's `errors` array). */
  readonly details?: ReadonlyArray<{ field: string; message: string }>

  constructor(message: string, details?: ReadonlyArray<{ field: string; message: string }>) {
    super(message)
    this.name = this.constructor.name
    this.details = details

    // Restores the correct prototype chain when compiled down to ES2022
    // targets/older runtimes; without this, `instanceof AppError` can fail
    // for errors that pass through certain transpilation paths.
    Object.setPrototypeOf(this, new.target.prototype)

    // V8/Node-specific (not in the ECMAScript spec, hence the cast) - trims
    // the constructor call itself off the top of the stack trace. Safe to
    // skip on engines that don't have it.
    const errorWithCaptureStackTrace = Error as unknown as {
      captureStackTrace?: (target: object, constructorOpt: (...args: never[]) => unknown) => void
    }
    errorWithCaptureStackTrace.captureStackTrace?.(
      this,
      this.constructor as (...args: never[]) => unknown
    )
  }
}
