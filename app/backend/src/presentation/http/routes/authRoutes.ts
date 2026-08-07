import express, { type RequestHandler, type Router } from 'express'
import rateLimit from 'express-rate-limit'
import type { AuthController } from '../controllers/AuthController.js'
import { validateRequest } from '../middleware/validateRequest.js'
import { loginValidation, registerValidation } from '../validators/authValidators.js'

export interface AuthRoutesDependencies {
  readonly controller: AuthController
  readonly authenticate: RequestHandler
  readonly rateLimit: {
    readonly windowMs: number
    readonly max: number
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

  router.post(
    '/register',
    authLimiter,
    registerValidation,
    validateRequest,
    deps.controller.register
  )
  router.post('/login', authLimiter, loginValidation, validateRequest, deps.controller.login)
  router.get('/me', deps.authenticate, deps.controller.getCurrentUser)
  router.post('/logout', deps.authenticate, deps.controller.logout)

  return router
}
