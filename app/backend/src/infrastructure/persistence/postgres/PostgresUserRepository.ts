import { ConflictError } from '../../../domain/errors/ConflictError.js'
import { User } from '../../../domain/entities/User.js'
import { Email } from '../../../domain/value-objects/Email.js'
import type { NewUser, UserRepository } from '../../../domain/repositories/IUserRepository.js'
import type { PostgresConnection } from './PostgresConnection.js'

interface UserRow {
  id: number
  name: string
  email: string
  password?: string
  created_at?: Date | null
}

/** Postgres unique-constraint violation. */
const UNIQUE_VIOLATION = '23505'

/**
 * `UserRepository` over raw SQL (no ORM - docs/BACKEND_REWRITE_PLAN.md).
 * Replaces `models/User.js`, with two differences that matter:
 *
 *  1. It returns `User` entities, not whatever columns the query selected.
 *     Only `findByEmailWithPassword` loads the hash; the other reads cannot
 *     hand a password hash to a caller even by accident.
 *  2. It catches Postgres's `23505` and throws `ConflictError`. Today that
 *     code travels all the way to `errorHandler.js`, which has to know what
 *     a Postgres error code is in order to produce a 409 - the coupling
 *     this rewrite exists to remove. Nothing above this file sees driver
 *     errors.
 */
export class PostgresUserRepository implements UserRepository {
  constructor(private readonly db: PostgresConnection) {}

  async findByEmail(email: Email): Promise<User | null> {
    const result = await this.db.query<UserRow>(
      'SELECT id, name, email, created_at FROM users WHERE email = $1',
      [email.value]
    )
    return result.rows[0] ? toUser(result.rows[0]) : null
  }

  async findByEmailWithPassword(email: Email): Promise<User | null> {
    const result = await this.db.query<UserRow>(
      'SELECT id, name, email, password, created_at FROM users WHERE email = $1',
      [email.value]
    )
    return result.rows[0] ? toUser(result.rows[0]) : null
  }

  async findById(id: number): Promise<User | null> {
    const result = await this.db.query<UserRow>(
      'SELECT id, name, email, created_at FROM users WHERE id = $1',
      [id]
    )
    return result.rows[0] ? toUser(result.rows[0]) : null
  }

  async create(user: NewUser): Promise<User> {
    try {
      const result = await this.db.query<UserRow>(
        'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email, created_at',
        [user.name, user.email.value, user.passwordHash]
      )

      const row = result.rows[0]
      if (!row) {
        // An INSERT ... RETURNING that reports success without returning
        // the row would mean the driver and the database disagree about
        // what happened; better to fail loudly than to hand back a
        // half-built entity.
        throw new Error('INSERT INTO users returned no row')
      }
      return toUser(row)
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictError('User already exists')
      }
      throw error
    }
  }
}

function toUser(row: UserRow): User {
  return new User({
    id: row.id,
    name: row.name,
    email: Email.create(row.email),
    createdAt: row.created_at ?? null,
    passwordHash: row.password,
  })
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === UNIQUE_VIOLATION
  )
}
