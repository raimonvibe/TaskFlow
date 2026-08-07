import { describe, it, expect, beforeEach } from 'vitest'
import { AuthService } from './AuthService.js'
import { TokenService } from './TokenService.js'
import { ConflictError } from '../../domain/errors/ConflictError.js'
import { NotFoundError } from '../../domain/errors/NotFoundError.js'
import { UnauthorizedError } from '../../domain/errors/UnauthorizedError.js'
import { ValidationError } from '../../domain/errors/ValidationError.js'
import { LengthPasswordPolicy, StrongPasswordPolicy } from '../../domain/policies/PasswordPolicy.js'
import {
  AuthAttemptFailedEvent,
  UserAuthenticatedEvent,
  UserLoggedOutEvent,
  UserRegisteredEvent,
} from '../../domain/events/AuthEvents.js'
import { Email } from '../../domain/value-objects/Email.js'
import { FakePasswordHasher } from '../../test/fakes/FakePasswordHasher.js'
import { FakeTokenProvider } from '../../test/fakes/FakeTokenProvider.js'
import { FixedClock } from '../../test/fakes/FixedClock.js'
import { InMemoryTokenBlacklistRepository } from '../../test/fakes/InMemoryTokenBlacklistRepository.js'
import { InMemoryUserRepository } from '../../test/fakes/InMemoryUserRepository.js'
import { RecordingEventBus } from '../../test/fakes/RecordingEventBus.js'
import { RecordingLogger } from '../../test/fakes/RecordingLogger.js'

// Compare with controllers/authController.test.js, which this replaces:
// that file needs vi.mock() on four modules before it can assert anything,
// and every test is coupled to the shape of req/res. Here the service is
// constructed with real (fake) collaborators, and the assertions are about
// behavior - who exists afterwards, what was published, which error came
// back. No mocking framework is involved at all.
// See docs/BACKEND_REWRITE_PLAN.md §5.

const NOW = new Date('2026-06-01T12:00:00.000Z')

describe('AuthService', () => {
  let users: InMemoryUserRepository
  let events: RecordingEventBus
  let service: AuthService

  beforeEach(() => {
    users = new InMemoryUserRepository()
    events = new RecordingEventBus()

    const clock = new FixedClock(NOW)
    const tokenService = new TokenService(
      new FakeTokenProvider(),
      new InMemoryTokenBlacklistRepository(() => NOW),
      clock,
      new RecordingLogger()
    )

    service = new AuthService(
      users,
      new FakePasswordHasher(),
      tokenService,
      events,
      clock,
      new LengthPasswordPolicy()
    )
  })

  describe('register', () => {
    it('creates the user, issues a token, and publishes UserRegisteredEvent', async () => {
      const result = await service.register('Ada', 'ada@example.com', 'ValidPass123')

      expect(result.user.id).toBeGreaterThan(0)
      expect(result.user.name).toBe('Ada')
      expect(result.user.email.value).toBe('ada@example.com')
      expect(result.token).toBeTruthy()

      const registered = events.ofType(UserRegisteredEvent)
      expect(registered).toHaveLength(1)
      expect(registered[0]?.userId).toBe(result.user.id)
      expect(registered[0]?.occurredAt).toEqual(NOW)
    })

    it('never returns the password hash on the created user', async () => {
      const result = await service.register('Ada', 'ada@example.com', 'ValidPass123')

      expect(result.user.passwordHash).toBeUndefined()
      expect(JSON.stringify(result)).not.toContain('ValidPass123')
    })

    it('stores a hash, not the password itself', async () => {
      await service.register('Ada', 'ada@example.com', 'ValidPass123')

      const stored = await users.findByEmailWithPassword(Email.create('ada@example.com'))
      expect(stored?.passwordHash).toBeDefined()
      expect(stored?.passwordHash).not.toBe('ValidPass123')
    })

    it('normalizes the email before storing it', async () => {
      const result = await service.register('Ada', '  ADA@Example.COM  ', 'ValidPass123')

      expect(result.user.email.value).toBe('ada@example.com')
      expect(await users.findByEmail(Email.create('ada@example.com'))).not.toBeNull()
    })

    it('rejects a duplicate email with ConflictError and publishes exactly one failure', async () => {
      await service.register('Ada', 'ada@example.com', 'ValidPass123')
      events.published.length = 0

      await expect(service.register('Grace', 'ada@example.com', 'OtherPass123')).rejects.toThrow(
        ConflictError
      )

      // One failure event per failed attempt is what keeps
      // auth_attempts_total{status="failure"} counting what it always has.
      const failures = events.ofType(AuthAttemptFailedEvent)
      expect(failures).toHaveLength(1)
      expect(failures[0]?.type).toBe('register')
      expect(failures[0]?.reason).toBe('User already exists')
    })

    it('enforces the password policy itself, not just at the route', async () => {
      // The HTTP validator rejects this first in practice. This asserts the
      // rule survives a caller that is not HTTP at all - the reason it was
      // moved off the route in the first place.
      const error = await service.register('Ada', 'ada@example.com', 'short').catch(e => e)

      expect(error).toBeInstanceOf(ValidationError)
      expect((error as ValidationError).details).toEqual([
        { field: 'password', message: 'Password must be between 8 and 128 characters' },
      ])
      expect(await users.findByEmail(Email.create('ada@example.com'))).toBeNull()
    })

    it('enforces whichever policy it was given', async () => {
      const strict = new AuthService(
        users,
        new FakePasswordHasher(),
        new TokenService(
          new FakeTokenProvider(),
          new InMemoryTokenBlacklistRepository(() => NOW),
          new FixedClock(NOW),
          new RecordingLogger()
        ),
        events,
        new FixedClock(NOW),
        new StrongPasswordPolicy()
      )

      // Accepted by the default policy, rejected by this one - swapping the
      // strategy is the only thing that changed.
      await expect(service.register('Ada', 'ada@example.com', 'password')).resolves.toBeDefined()
      await expect(strict.register('Grace', 'grace@example.com', 'password')).rejects.toThrow(
        ValidationError
      )
    })

    it('treats a differently-cased duplicate as the same user', async () => {
      await service.register('Ada', 'ada@example.com', 'ValidPass123')

      await expect(service.register('Ada', 'ADA@EXAMPLE.COM', 'ValidPass123')).rejects.toThrow(
        ConflictError
      )
    })

    it('publishes no success event when registration fails', async () => {
      await service.register('Ada', 'ada@example.com', 'ValidPass123')
      events.published.length = 0

      await expect(service.register('Ada', 'ada@example.com', 'ValidPass123')).rejects.toThrow()

      expect(events.ofType(UserRegisteredEvent)).toHaveLength(0)
    })
  })

  describe('login', () => {
    beforeEach(async () => {
      await service.register('Ada', 'ada@example.com', 'ValidPass123')
      events.published.length = 0
    })

    it('issues a token and publishes UserAuthenticatedEvent on valid credentials', async () => {
      const result = await service.login('ada@example.com', 'ValidPass123')

      expect(result.token).toBeTruthy()
      expect(result.user.email.value).toBe('ada@example.com')
      expect(events.ofType(UserAuthenticatedEvent)).toHaveLength(1)
    })

    it('accepts a differently-cased email', async () => {
      await expect(service.login('ADA@Example.com', 'ValidPass123')).resolves.toBeDefined()
    })

    it('rejects a wrong password', async () => {
      await expect(service.login('ada@example.com', 'WrongPass123')).rejects.toThrow(
        UnauthorizedError
      )
    })

    it('gives an unknown user and a wrong password the identical error', async () => {
      const wrongPassword = await service.login('ada@example.com', 'WrongPass123').catch(e => e)
      const unknownUser = await service.login('nobody@example.com', 'ValidPass123').catch(e => e)

      // The endpoint must not become a way to find out which addresses are
      // registered - see the no-enumeration tests in
      // src/test/security/authentication.test.js.
      expect(wrongPassword).toBeInstanceOf(UnauthorizedError)
      expect(unknownUser).toBeInstanceOf(UnauthorizedError)
      expect(unknownUser.message).toBe(wrongPassword.message)
      expect(unknownUser.statusCode).toBe(wrongPassword.statusCode)
    })

    it('treats a malformed email as bad credentials, not a validation error', async () => {
      const error = await service.login('not-an-email', 'ValidPass123').catch(e => e)

      expect(error).toBeInstanceOf(UnauthorizedError)
      expect(error.message).toBe('Invalid credentials')
    })

    it('publishes one login failure event per failed attempt', async () => {
      await service.login('ada@example.com', 'WrongPass123').catch(() => {})

      const failures = events.ofType(AuthAttemptFailedEvent)
      expect(failures).toHaveLength(1)
      expect(failures[0]?.type).toBe('login')
      expect(events.ofType(UserAuthenticatedEvent)).toHaveLength(0)
    })

    it('never exposes the password hash to the caller', async () => {
      const result = await service.login('ada@example.com', 'ValidPass123')

      expect(JSON.stringify(result)).not.toMatch(/hashed:/)
    })
  })

  describe('getCurrentUser', () => {
    it('returns the user without the password hash', async () => {
      const { user } = await service.register('Ada', 'ada@example.com', 'ValidPass123')

      const found = await service.getCurrentUser(user.id)

      expect(found.id).toBe(user.id)
      expect(found.passwordHash).toBeUndefined()
    })

    it('throws NotFoundError for an unknown id', async () => {
      await expect(service.getCurrentUser(99999)).rejects.toThrow(NotFoundError)
    })
  })

  describe('logout', () => {
    it('revokes the token and publishes UserLoggedOutEvent', async () => {
      const { user, token } = await service.register('Ada', 'ada@example.com', 'ValidPass123')
      events.published.length = 0

      await service.logout(token, user.id)

      const loggedOut = events.ofType(UserLoggedOutEvent)
      expect(loggedOut).toHaveLength(1)
      expect(loggedOut[0]?.userId).toBe(user.id)
    })
  })
})
