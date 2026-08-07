import type { NextFunction, Request, RequestHandler, Response } from 'express'
import { validationResult } from 'express-validator'
import { ValidationError } from '../../../domain/errors/ValidationError.js'

/**
 * Turns express-validator's collected failures into a `ValidationError`.
 *
 * The difference from the `validate.js` it replaced is that it throws
 * instead of writing a response. Building error bodies is the error
 * middleware's job and only its job - that is what makes "every error
 * response has the same shape" a property of the system rather than a
 * convention each handler has to remember (docs/BACKEND_REWRITE_PLAN.md
 * §6). The resulting 400 body is identical, field errors included.
 */
export const validateRequest: RequestHandler = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req)

  if (!errors.isEmpty()) {
    next(
      new ValidationError(
        'Validation failed',
        errors.array().map(error => ({
          field: 'path' in error ? String(error.path) : '',
          message: error.msg as string,
        }))
      )
    )
    return
  }

  next()
}
