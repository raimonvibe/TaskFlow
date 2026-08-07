import type { NextFunction, Request, Response } from 'express'
import type { AuthService } from '../../../application/services/AuthService.js'
import { requireAuth } from '../currentUser.js'
import { toCredentialsResponse, toProfileResponse } from '../dto/userResponse.js'

/**
 * HTTP adapter for `AuthService`. Every method does the same three things
 * and nothing else: read values off the request, call one service method,
 * write the result. No business rules, no metrics, no logging - all of that
 * moved to the service and its subscribers.
 *
 * Errors are never caught here. They are `AppError`s carrying their own
 * status code, so `next(error)` and the error middleware handle them
 * uniformly - which is what removes the "did this branch remember to
 * increment the failure counter" question that the current controller's
 * hand-written 409/401/404 branches each had to answer individually.
 *
 * Handlers are bound arrow-function properties so they can be passed
 * straight to a route (`router.post('/login', controller.login)`) without
 * losing `this`.
 */
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { name, email, password } = req.body as {
        name: string
        email: string
        password: string
      }

      const { user, token } = await this.authService.register(name, email, password)

      res.status(201).json({
        message: 'User created successfully',
        token,
        user: toCredentialsResponse(user),
      })
    } catch (error) {
      next(error)
    }
  }

  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, password } = req.body as { email: string; password: string }

      const { user, token } = await this.authService.login(email, password)

      res.json({
        message: 'Login successful',
        token,
        user: toCredentialsResponse(user),
      })
    } catch (error) {
      next(error)
    }
  }

  getCurrentUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await this.authService.getCurrentUser(requireAuth(req).user.id)
      res.json({ user: toProfileResponse(user) })
    } catch (error) {
      next(error)
    }
  }

  logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { user, token } = requireAuth(req)
      await this.authService.logout(token, user.id)
      res.json({ message: 'Logged out successfully' })
    } catch (error) {
      next(error)
    }
  }
}
