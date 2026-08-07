import { describe, it, expect, afterAll } from 'vitest'
import request from 'supertest'
import app from '../helpers/testApp.js'
import { registerAndLogin, uniqueEmail, cleanupAllTestUsers } from '../helpers/testUser.js'

// OWASP API Security Top 10 2023: API1 Broken Object Level Authorization
// (IDOR), API3 Broken Object Property Level Authorization (mass
// assignment), API5 Broken Function Level Authorization (auth required at
// all on every task route).
describe('Security: Authorization (BOLA / IDOR / mass assignment)', () => {
  afterAll(async () => {
    await cleanupAllTestUsers()
  })

  describe('every task route requires authentication', () => {
    const cases = [
      ['get', '/api/tasks'],
      ['get', '/api/tasks/stats'],
      ['get', '/api/tasks/1'],
      ['post', '/api/tasks'],
      ['put', '/api/tasks/1'],
      ['delete', '/api/tasks/1'],
    ]

    it.each(cases)('%s %s returns 401 with no token', async (method, path) => {
      const res = await request(app)[method](path)
      expect(res.status).toBe(401)
    })
  })

  describe('cross-user task access (BOLA / IDOR)', () => {
    it("a user cannot read, update, or delete another user's task by guessing its ID", async () => {
      const owner = await registerAndLogin({ email: uniqueEmail('bola-owner') })
      const attacker = await registerAndLogin({ email: uniqueEmail('bola-attacker') })

      const created = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${owner.token}`)
        .send({ title: "Owner's private task" })
      expect(created.status).toBe(201)
      const taskId = created.body.task.id

      const readAsAttacker = await request(app)
        .get(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${attacker.token}`)
      // 404, not 403 - the app doesn't confirm to a non-owner that a task
      // with this ID even exists.
      expect(readAsAttacker.status).toBe(404)

      const updateAsAttacker = await request(app)
        .put(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${attacker.token}`)
        .send({ title: 'Pwned' })
      expect(updateAsAttacker.status).toBe(404)

      const deleteAsAttacker = await request(app)
        .delete(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${attacker.token}`)
      expect(deleteAsAttacker.status).toBe(404)

      // Confirm none of the attacker's attempts actually mutated anything.
      const stillIntact = await request(app)
        .get(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${owner.token}`)
      expect(stillIntact.status).toBe(200)
      expect(stillIntact.body.task.title).toBe("Owner's private task")
    })

    it("a user's task list never includes another user's tasks", async () => {
      const userA = await registerAndLogin({ email: uniqueEmail('bola-lista') })
      const userB = await registerAndLogin({ email: uniqueEmail('bola-listb') })

      await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${userA.token}`)
        .send({ title: "A's task" })
      await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${userB.token}`)
        .send({ title: "B's task" })

      const listAsB = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${userB.token}`)

      expect(listAsB.status).toBe(200)
      expect(listAsB.body.tasks.some(t => t.title === "A's task")).toBe(false)
    })

    it("a user's stats never reflect another user's tasks", async () => {
      const userA = await registerAndLogin({ email: uniqueEmail('bola-statsa') })
      const userB = await registerAndLogin({ email: uniqueEmail('bola-statsb') })

      await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${userA.token}`)
        .send({ title: "A's task" })

      const statsAsB = await request(app)
        .get('/api/tasks/stats')
        .set('Authorization', `Bearer ${userB.token}`)

      expect(statsAsB.status).toBe(200)
      expect(statsAsB.body.total).toBe(0)
    })
  })

  describe('mass assignment (API3: Broken Object Property Level Authorization)', () => {
    it('ignores a client-supplied user_id on task creation - the task always belongs to the caller', async () => {
      const owner = await registerAndLogin({ email: uniqueEmail('mass-create-owner') })
      const victim = await registerAndLogin({ email: uniqueEmail('mass-create-victim') })

      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${owner.token}`)
        .send({ title: 'Sneaky task', user_id: victim.user.id })

      expect(res.status).toBe(201)
      expect(res.body.task.user_id).toBe(owner.user.id)
      expect(res.body.task.user_id).not.toBe(victim.user.id)
    })

    it('ignores a client-supplied user_id on task update - ownership cannot be reassigned', async () => {
      const owner = await registerAndLogin({ email: uniqueEmail('mass-update-owner') })
      const attacker = await registerAndLogin({ email: uniqueEmail('mass-update-attacker') })

      const created = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${owner.token}`)
        .send({ title: 'Task' })
      const taskId = created.body.task.id

      const res = await request(app)
        .put(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${owner.token}`)
        .send({ title: 'Task', user_id: attacker.user.id })

      expect(res.status).toBe(200)
      expect(res.body.task.user_id).toBe(owner.user.id)

      // And the attacker still can't see it - proving it wasn't reassigned,
      // not just that the response body lied.
      const attackerView = await request(app)
        .get(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${attacker.token}`)
      expect(attackerView.status).toBe(404)
    })
  })
})
