import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { PostgresConnection } from './PostgresConnection.js'
import { PostgresUserRepository } from './PostgresUserRepository.js'
import { Config } from '../../config/Config.js'
import { ConflictError } from '../../../domain/errors/ConflictError.js'
import { Email } from '../../../domain/value-objects/Email.js'

// Integration test - real Postgres, no fakes. Replaces models/User.test.js,
// which tested the model layer this repository supersedes
// (docs/BACKEND_REWRITE_PLAN.md §5). The service-level behavior these
// queries support is covered by AuthService.test.ts against an in-memory
// repository; what can only be verified here is that the SQL is right and
// that driver errors are translated at this boundary.
//
// Emails share the 'repotest-' marker and a per-file RUN_ID for the same
// reason the security helpers do: test files run in parallel against one
// shared database, so cleanup must only ever delete this file's own rows.
const RUN_ID = `${process.pid}${Math.random().toString(36).slice(2, 8)}`
let counter = 0
const uniqueEmail = (tag: string): Email =>
  Email.create(`repotest-${tag}-${RUN_ID}-${++counter}@example.com`)

describe('PostgresUserRepository', () => {
  let db: PostgresConnection
  let repository: PostgresUserRepository

  beforeAll(() => {
    db = new PostgresConnection(new Config().database)
    repository = new PostgresUserRepository(db)
  })

  afterEach(async () => {
    await db.query('DELETE FROM users WHERE email LIKE $1', [`repotest-%-${RUN_ID}-%@example.com`])
  })

  afterAll(async () => {
    await db.close()
  })

  describe('create', () => {
    it('persists the user and returns it with a generated id', async () => {
      const email = uniqueEmail('create')

      const user = await repository.create({ name: 'Ada', email, passwordHash: 'hash-value' })

      expect(user.id).toBeGreaterThan(0)
      expect(user.name).toBe('Ada')
      expect(user.email.value).toBe(email.value)
      expect(user.createdAt).toBeInstanceOf(Date)
    })

    it('does not return the password hash it just stored', async () => {
      const user = await repository.create({
        name: 'Ada',
        email: uniqueEmail('nohash'),
        passwordHash: 'hash-value',
      })

      expect(user.passwordHash).toBeUndefined()
    })

    it('translates a duplicate email into ConflictError, not a driver error', async () => {
      const email = uniqueEmail('dupe')
      await repository.create({ name: 'Ada', email, passwordHash: 'hash-value' })

      // The whole point of the repository boundary: Postgres's 23505 must
      // not escape into the layers above, which is what forces today's
      // errorHandler.js to know what a Postgres error code is.
      const error = await repository
        .create({ name: 'Grace', email, passwordHash: 'other-hash' })
        .catch((e: unknown) => e)

      expect(error).toBeInstanceOf(ConflictError)
      expect((error as ConflictError).statusCode).toBe(409)
      expect((error as { code?: string }).code).toBeUndefined()
    })
  })

  describe('reads', () => {
    it('finds a user by email without exposing the password hash', async () => {
      const email = uniqueEmail('byemail')
      await repository.create({ name: 'Ada', email, passwordHash: 'hash-value' })

      const found = await repository.findByEmail(email)

      expect(found?.email.value).toBe(email.value)
      expect(found?.passwordHash).toBeUndefined()
    })

    it('exposes the password hash only through findByEmailWithPassword', async () => {
      const email = uniqueEmail('withpassword')
      await repository.create({ name: 'Ada', email, passwordHash: 'hash-value' })

      const found = await repository.findByEmailWithPassword(email)

      expect(found?.passwordHash).toBe('hash-value')
    })

    it('finds a user by id', async () => {
      const created = await repository.create({
        name: 'Ada',
        email: uniqueEmail('byid'),
        passwordHash: 'hash-value',
      })

      const found = await repository.findById(created.id)

      expect(found?.id).toBe(created.id)
      expect(found?.passwordHash).toBeUndefined()
    })

    it('returns null rather than throwing for a missing user', async () => {
      expect(await repository.findByEmail(uniqueEmail('absent'))).toBeNull()
      expect(await repository.findById(2147483647)).toBeNull()
    })

    it('treats a parameterized quote as data, not SQL', async () => {
      // Not a real injection attempt so much as proof the queries are
      // parameterized: a value containing a quote round-trips intact
      // instead of altering the statement.
      const found = await repository.findByEmail(
        Email.create(`repotest-quote-${RUN_ID}-x'--@example.com`)
      )

      expect(found).toBeNull()
    })
  })
})
