import type { User } from '../entities/User.js'
import type { Email } from '../value-objects/Email.js'

export interface NewUser {
  readonly name: string
  readonly email: Email
  readonly passwordHash: string
}

/**
 * Persistence port for users. Lives in domain/ and names no storage
 * technology on purpose - `PostgresUserRepository` (infrastructure/)
 * implements it, `InMemoryUserRepository` (test/fakes/) implements it for
 * unit tests, and `AuthService` cannot tell the difference.
 *
 * That substitution is the whole point: the old controller tests had to
 * `vi.mock('../models/User.js')` and `vi.mock('../config/database.js')`
 * because `authController.js` reached for those modules by path. A service
 * that takes this interface as a constructor argument needs no mocking
 * framework at all (docs/BACKEND_REWRITE_PLAN.md §1, §5).
 *
 * Implementations must translate storage-level failures into domain errors -
 * a unique-violation on `email` becomes `ConflictError`, never a raw
 * Postgres `23505` escaping into the HTTP layer the way it does today.
 */
export interface UserRepository {
  /** Without the password hash - for existence checks and lookups that have
   * no business touching credentials. */
  findByEmail(email: Email): Promise<User | null>

  /** With the password hash populated - only the login path needs this. */
  findByEmailWithPassword(email: Email): Promise<User | null>

  findById(id: number): Promise<User | null>

  /** @throws {ConflictError} if the email is already registered. */
  create(user: NewUser): Promise<User>
}
