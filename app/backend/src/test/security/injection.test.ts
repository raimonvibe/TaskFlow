import { describe, it, expect, afterAll } from 'vitest'
import request from 'supertest'
import app, { getTestContainer } from '../helpers/testApp.js'
import { registerAndLogin, uniqueEmail, cleanupAllTestUsers } from '../helpers/testUser.js'

const query = getTestContainer().db.query.bind(getTestContainer().db)

describe('Security: Injection & input handling', () => {
  afterAll(async () => {
    await cleanupAllTestUsers()
  })

  describe('SQL injection resilience (parameterized queries throughout)', () => {
    it('a SQL-injection payload in login credentials is treated as literal data, not executed', async () => {
      const injectedEmail = "' OR '1'='1"

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: injectedEmail, password: "'; DROP TABLE users; --" })

      // express-validator's isEmail() rejects this before it reaches a
      // query in most cases, but either way the table must still exist,
      // still be queryable, and no row should exist matching the literal
      // injected string (which would mean statement-stacking got through).
      //
      // Deliberately NOT comparing a global `SELECT COUNT(*) FROM users`
      // before/after: this suite runs against a real, shared Postgres test
      // database alongside other test files that register/clean up users
      // concurrently (Vitest runs files in parallel by default), so a raw
      // total-row-count assertion is flaky by construction - it was
      // observed failing in CI for exactly that reason, with no actual
      // injection involved.
      expect([400, 401]).toContain(res.status)

      const tableStillExists = await query<{ users_table: string | null }>(
        "SELECT to_regclass('public.users') AS users_table"
      )
      expect(tableStillExists.rows[0]?.users_table).not.toBeNull()

      const injectedRow = await query('SELECT id FROM users WHERE email = $1', [injectedEmail])
      expect(injectedRow.rows).toHaveLength(0)
    })

    it('a SQL-injection payload in a task title is stored verbatim as data, not executed', async () => {
      const { token } = await registerAndLogin({ email: uniqueEmail('sqli-title') })
      const payload = "Robert'); DROP TABLE tasks; --"

      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: payload })

      expect(res.status).toBe(201)
      expect(res.body.task.title).toBe(payload)

      // Table is still there and query-able.
      const stillWorks = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${token}`)
      expect(stillWorks.status).toBe(200)
    })

    it("a SQL-injection payload via a query-string filter never returns another user's data", async () => {
      const { token } = await registerAndLogin({ email: uniqueEmail('sqli-query') })

      const res = await request(app)
        .get("/api/tasks?status=todo' OR '1'='1")
        .set('Authorization', `Bearer ${token}`)

      // status is bound as a parameter, never string-concatenated into the
      // query, so this can't widen the result set to other users' rows -
      // whether Postgres accepts or rejects the value as a valid enum, no
      // injected SQL ever executes.
      expect(res.body.tasks === undefined || res.body.tasks.length === 0).toBe(true)
    })
  })

  describe('XSS payloads are stored as inert data (this API is JSON-only, never HTML)', () => {
    it('a script-tag payload round-trips unchanged as JSON - rendering safety belongs to the frontend', async () => {
      const { token } = await registerAndLogin({ email: uniqueEmail('xss-title') })
      const payload = '<script>alert(document.cookie)</script>'

      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: payload })

      expect(res.status).toBe(201)
      expect(res.body.task.title).toBe(payload)
      expect(res.headers['content-type']).toMatch(/application\/json/)
    })
  })

  describe('prototype pollution', () => {
    it('a raw JSON body with __proto__ / constructor.prototype keys does not pollute Object.prototype', async () => {
      const email = uniqueEmail('proto-pollution')
      const rawBody =
        '{"name":"Test","email":"' +
        email +
        '","password":"ValidPass123",' +
        '"__proto__":{"polluted":"yes"},' +
        '"constructor":{"prototype":{"polluted2":"yes"}}}'

      await request(app)
        .post('/api/auth/register')
        .set('Content-Type', 'application/json')
        .send(rawBody)

      const probe: Record<string, unknown> = {}
      expect(probe.polluted).toBeUndefined()
      expect(probe.polluted2).toBeUndefined()
      expect(Object.prototype.hasOwnProperty.call(Object.prototype, 'polluted')).toBe(false)
    })
  })

  describe('resource limits (API4: Unrestricted Resource Consumption)', () => {
    it('rejects a JSON body over the configured size limit instead of buffering it unbounded', async () => {
      const { token } = await registerAndLogin({ email: uniqueEmail('oversized-body') })
      const hugeTitle = 'A'.repeat(200 * 1024) // 200kb, over express.json()'s 100kb default

      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: hugeTitle })

      expect(res.status).toBe(413)
    })
  })

  describe('parameter validation', () => {
    it('rejects a non-integer task ID instead of passing it through to the database', async () => {
      const { token } = await registerAndLogin({ email: uniqueEmail('bad-id') })

      const res = await request(app)
        .get('/api/tasks/1%20OR%201=1')
        .set('Authorization', `Bearer ${token}`)

      expect(res.status).toBe(400)
    })

    it('rejects an invalid status/priority enum value on task creation', async () => {
      const { token } = await registerAndLogin({ email: uniqueEmail('bad-enum') })

      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Task', status: 'deleted; --' })

      expect(res.status).toBe(400)
    })
  })
})
