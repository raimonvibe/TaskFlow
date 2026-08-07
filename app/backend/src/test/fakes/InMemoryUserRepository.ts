import { ConflictError } from '../../domain/errors/ConflictError.js'
import { User } from '../../domain/entities/User.js'
import type { Email } from '../../domain/value-objects/Email.js'
import type { NewUser, UserRepository } from '../../domain/repositories/IUserRepository.js'

/**
 * A real, working `UserRepository` that stores users in a Map.
 *
 * This is a fake, not a mock: it has actual behavior, and a test asserts
 * against observable outcomes ("the user is now findable") rather than
 * against which methods were called. That is the concrete payoff of the
 * repository interface - `AuthService` unit tests need no `vi.mock()`, no
 * database, and no knowledge of SQL (docs/BACKEND_REWRITE_PLAN.md §5).
 *
 * It enforces the same email-uniqueness rule the real table's UNIQUE
 * constraint does, and reproduces the same read behavior: only
 * `findByEmailWithPassword` returns the hash.
 */
export class InMemoryUserRepository implements UserRepository {
  private readonly usersById = new Map<number, User>()
  private nextId = 1

  async findByEmail(email: Email): Promise<User | null> {
    const user = this.findByEmailInternal(email)
    return user ? withoutPassword(user) : null
  }

  async findByEmailWithPassword(email: Email): Promise<User | null> {
    return this.findByEmailInternal(email) ?? null
  }

  async findById(id: number): Promise<User | null> {
    const user = this.usersById.get(id)
    return user ? withoutPassword(user) : null
  }

  async create(newUser: NewUser): Promise<User> {
    if (this.findByEmailInternal(newUser.email)) {
      throw new ConflictError('User already exists')
    }

    const user = new User({
      id: this.nextId++,
      name: newUser.name,
      email: newUser.email,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      passwordHash: newUser.passwordHash,
    })

    this.usersById.set(user.id, user)
    return withoutPassword(user)
  }

  /** Test helper - seeds a user without going through `create`. */
  seed(user: User): void {
    this.usersById.set(user.id, user)
    this.nextId = Math.max(this.nextId, user.id + 1)
  }

  private findByEmailInternal(email: Email): User | undefined {
    return [...this.usersById.values()].find(user => user.email.equals(email))
  }
}

function withoutPassword(user: User): User {
  return new User({
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
  })
}
