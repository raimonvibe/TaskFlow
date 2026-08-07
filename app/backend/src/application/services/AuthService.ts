import { ConflictError } from '../../domain/errors/ConflictError.js'
import { NotFoundError } from '../../domain/errors/NotFoundError.js'
import { UnauthorizedError } from '../../domain/errors/UnauthorizedError.js'
import { ValidationError } from '../../domain/errors/ValidationError.js'
import {
  AuthAttemptFailedEvent,
  UserAuthenticatedEvent,
  UserLoggedOutEvent,
  UserRegisteredEvent,
} from '../../domain/events/AuthEvents.js'
import type { User } from '../../domain/entities/User.js'
import type { PasswordPolicy } from '../../domain/policies/PasswordPolicy.js'
import type { UserRepository } from '../../domain/repositories/IUserRepository.js'
import { Email } from '../../domain/value-objects/Email.js'
import type { Clock } from '../ports/IClock.js'
import type { EventBus } from '../ports/IEventBus.js'
import type { PasswordHasher } from '../ports/IPasswordHasher.js'
import type { TokenService } from './TokenService.js'

export interface AuthResult {
  readonly user: User
  readonly token: string
}

/**
 * The register / login / logout / "who am I" use-cases.
 *
 * This is `authController.js` with the HTTP removed. What is left is the
 * part that was previously impossible to test without spinning up Express:
 * the ordering of the existence check and the insert, the deliberate
 * sameness of the two login failure paths, and which side effects fire on
 * success versus failure.
 *
 * Two structural changes from the controller it replaces:
 *
 *  - No `req`/`res`. Methods take values and return values or throw
 *    `AppError`s; turning those into status codes is the controller's job.
 *  - No `authAttempts.inc(...)` or `logger.info(...)` calls inline. The
 *    service publishes what happened and does not know or care that a
 *    Prometheus counter and an audit log are listening (Observer -
 *    docs/BACKEND_REWRITE_PLAN.md §3). Adding a welcome email later is a
 *    new subscriber, not an edit to this file.
 */
export class AuthService {
  constructor(
    private readonly users: UserRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly tokenService: TokenService,
    private readonly events: EventBus,
    private readonly clock: Clock,
    private readonly passwordPolicy: PasswordPolicy
  ) {}

  async register(name: string, rawEmail: string, plainPassword: string): Promise<AuthResult> {
    try {
      const email = Email.create(rawEmail)
      // Same belt-and-braces reasoning as Email: the route rejects a weak
      // password first and produces the nicer field-level 400, but the rule
      // belongs to the use case, not to one HTTP endpoint. Any future caller
      // - a CLI, an admin import, a second transport - gets it too.
      this.enforcePasswordPolicy(plainPassword)

      const existing = await this.users.findByEmail(email)
      if (existing) {
        throw new ConflictError('User already exists')
      }

      const passwordHash = await this.passwordHasher.hash(plainPassword)
      // The repository translates a concurrent-insert unique violation into
      // ConflictError, so the check above being racy is not a correctness
      // problem - it just makes the common case a cheaper error path.
      const user = await this.users.create({ name, email, passwordHash })

      const token = this.tokenService.issue({ id: user.id, email: user.email.value })

      await this.events.publish(
        new UserRegisteredEvent(user.id, user.email.value, this.clock.now())
      )

      return { user, token }
    } catch (error) {
      await this.publishFailure('register', error, rawEmail)
      throw error
    }
  }

  async login(rawEmail: string, plainPassword: string): Promise<AuthResult> {
    try {
      const email = this.parseLoginEmail(rawEmail)

      const user = await this.users.findByEmailWithPassword(email)
      // Identical error for "no such user" and "wrong password", identical
      // work either way - the security suite asserts the two responses are
      // byte-for-byte equal so the endpoint cannot be used to enumerate
      // registered addresses (src/test/security/authentication.test.js).
      if (!user || !user.passwordHash) {
        throw new UnauthorizedError('Invalid credentials')
      }

      const passwordMatches = await this.passwordHasher.compare(plainPassword, user.passwordHash)
      if (!passwordMatches) {
        throw new UnauthorizedError('Invalid credentials')
      }

      const token = this.tokenService.issue({ id: user.id, email: user.email.value })

      await this.events.publish(
        new UserAuthenticatedEvent(user.id, user.email.value, this.clock.now())
      )

      // The hash was needed to verify the password and for nothing else.
      return { user: user.withoutCredentials(), token }
    } catch (error) {
      await this.publishFailure('login', error, rawEmail)
      throw error
    }
  }

  async getCurrentUser(userId: number): Promise<User> {
    const user = await this.users.findById(userId)
    if (!user) {
      throw new NotFoundError('User not found')
    }
    return user
  }

  async logout(token: string, userId: number): Promise<void> {
    await this.tokenService.revoke(token)
    await this.events.publish(new UserLoggedOutEvent(userId, this.clock.now()))
  }

  /**
   * A syntactically invalid email at this point is a failed login, not a
   * validation error: the route's `isEmail()` check already rejected
   * genuinely malformed input with a 400 before reaching the service, so
   * anything arriving here that `Email` refuses would otherwise turn a
   * credentials failure into a differently-shaped response - which is
   * precisely the signal the no-enumeration tests exist to prevent.
   */
  private parseLoginEmail(rawEmail: string): Email {
    try {
      return Email.create(rawEmail)
    } catch (error) {
      if (error instanceof ValidationError) {
        throw new UnauthorizedError('Invalid credentials')
      }
      throw error
    }
  }

  /**
   * Exactly one failure event per failed attempt, for any reason - which is
   * what keeps `auth_attempts_total{status="failure"}` counting the same
   * things it always has: `authController.js` incremented it both on the
   * expected failures and in its catch-all.
   */
  private async publishFailure(
    type: 'register' | 'login',
    error: unknown,
    email: string
  ): Promise<void> {
    const reason = error instanceof Error ? error.message : String(error)
    await this.events.publish(new AuthAttemptFailedEvent(type, reason, email, this.clock.now()))
  }

  /** Carries the field name so the HTTP layer produces the same
   * `errors: [{ field: 'password' }]` body it does when the route validator
   * is the one that rejects. */
  private enforcePasswordPolicy(plainPassword: string): void {
    const violations = this.passwordPolicy.violations(plainPassword)
    if (violations.length === 0) return

    throw new ValidationError(
      'Validation failed',
      violations.map(message => ({ field: 'password', message }))
    )
  }
}
