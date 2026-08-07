import { body } from 'express-validator'

/** Unchanged from authRoutes.js. `normalizeEmail()` lowercases and trims,
 * which matches what the `Email` value object does downstream - both run,
 * because the route rejects malformed input before the service ever sees
 * it, and the value object guarantees the invariant regardless of which
 * entry point produced the string. */
export const registerValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be between 8 and 128 characters'),
]

export const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
]
