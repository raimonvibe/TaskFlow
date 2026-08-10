import express, { type RequestHandler, type Router } from 'express'
import rateLimit from 'express-rate-limit'
import type { PasswordPolicy } from '../../../domain/policies/PasswordPolicy.js'
import type { AuthController } from '../controllers/AuthController.js'
import { validateRequest } from '../middleware/validateRequest.js'
import {
  createRegisterValidation,
  loginValidation,
  refreshValidation,
} from '../validators/authValidators.js'

export interface AuthRoutesDependencies {
  readonly controller: AuthController
  readonly authenticate: RequestHandler
  readonly passwordPolicy: PasswordPolicy
  readonly rateLimit: {
    readonly windowMs: number
    readonly max: number
    readonly sessionMax: number
  }
}

/**
 * Wires the auth endpoints. Takes its dependencies as arguments instead of
 * importing them, so nothing here reaches for a module-level singleton and
 * the whole router can be built against fakes.
 *
 * The rate limiter is configured exactly as it always was: tighter than the
 * generic /api/ limiter in app.ts (100 req/15min is too loose to slow
 * credential stuffing), per-IP, and `skipSuccessfulRequests` so a legitimate
 * user sharing an IP is not locked out by someone else's failures.
 */
export function createAuthRouter(deps: AuthRoutesDependencies): Router {
  const router = express.Router()

  const authLimiter = rateLimit({
    windowMs: deps.rateLimit.windowMs,
    max: deps.rateLimit.max,
    message: { message: 'Too many attempts, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
  })

  // /me and /logout sit behind `authenticate`, so they are not a
  // credential-stuffing surface and deliberately do not share `authLimiter`:
  // because that limiter counts only failures, a client polling /me with an
  // expired token would spend the login allowance on 401s and then be locked
  // out of logging back in. This budget matches the generic /api/ limiter in
  // app.ts that already covers these routes, so the effective limit is
  // unchanged - stating it on the route keeps the protection visible to
  // readers and to static analysis (CodeQL js/missing-rate-limiting).
  const sessionLimiter = rateLimit({
    windowMs: deps.rateLimit.windowMs,
    max: deps.rateLimit.sessionMax,
    message: { message: 'Too many requests, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
  })

  router.post(
    '/register',
    authLimiter,
    createRegisterValidation(deps.passwordPolicy),
    validateRequest,
    deps.controller.register
  )
  router.post('/login', authLimiter, loginValidation, validateRequest, deps.controller.login)
  router.post('/refresh', authLimiter, refreshValidation, validateRequest, deps.controller.refresh)
  router.get('/me', sessionLimiter, deps.authenticate, deps.controller.getCurrentUser)
  router.post('/logout', sessionLimiter, deps.authenticate, deps.controller.logout)

  return router
}
