import { body, type ValidationChain } from 'express-validator'
import type { PasswordPolicy } from '../../../domain/policies/PasswordPolicy.js'

/** `normalizeEmail()` lowercases and trims, which matches what the `Email`
 * value object does downstream - both run, because the route rejects
 * malformed input before the service ever sees it, and the value object
 * guarantees the invariant regardless of which entry point produced the
 * string. */
const emailField = (): ValidationChain =>
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required')

/**
 * Built from the active `PasswordPolicy` rather than restating its rule, so
 * there is one definition of "acceptable password" and the route cannot
 * drift from what the service enforces.
 *
 * A factory for the same reason the routers are: the policy is chosen at the
 * composition root, and a module-level constant could not see it.
 */
export function createRegisterValidation(policy: PasswordPolicy): ValidationChain[] {
  return [
    body('name').trim().notEmpty().withMessage('Name is required'),
    emailField(),
    body('password').custom((value: unknown) => {
      const violations = policy.violations(typeof value === 'string' ? value : '')
      if (violations.length > 0) {
        throw new Error(violations.join('. '))
      }
      return true
    }),
  ]
}

/** Login deliberately does not apply the policy. Holding an existing
 * password to a rule tightened after it was set would lock the account out
 * at the door, and reporting *why* a submitted password is unacceptable
 * tells an attacker which rules to skip while guessing. */
export const loginValidation: ValidationChain[] = [
  emailField(),
  body('password').notEmpty().withMessage('Password is required'),
]
