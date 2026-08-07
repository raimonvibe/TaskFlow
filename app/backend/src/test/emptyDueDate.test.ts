import { describe, it, expect, afterAll } from 'vitest'
import request from 'supertest'
import app from './helpers/testApp.js'
import { registerAndLogin, uniqueEmail, cleanupAllTestUsers } from './helpers/testUser.js'

/**
 * The frontend TaskModal sends due_date: '' when the date field is left
 * empty. express-validator's bare optional() only skips undefined, so ''
 * used to reach isISO8601() and return 400 — making "create without a due
 * date" impossible from the UI. These hit the real route stack so the
 * validator is actually in the path (a TaskService unit test cannot catch
 * that). See docs/NEXT_STEPS.md item 1.
 */
describe('empty due_date is accepted as "no due date"', () => {
  afterAll(async () => {
    await cleanupAllTestUsers()
  })

  it('POST /api/tasks with due_date: "" creates a task with null due_date', async () => {
    const user = await registerAndLogin({ email: uniqueEmail('empty-due-create') })

    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ title: 'No due date from the modal', due_date: '' })

    expect(res.status).toBe(201)
    expect(res.body.task.due_date).toBeNull()
  })

  it('PUT /api/tasks/:id with due_date: "" clears the due date', async () => {
    const user = await registerAndLogin({ email: uniqueEmail('empty-due-update') })

    const created = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ title: 'Has a date', due_date: '2026-12-31T00:00:00.000Z' })
    expect(created.status).toBe(201)
    expect(created.body.task.due_date).not.toBeNull()

    const updated = await request(app)
      .put(`/api/tasks/${created.body.task.id}`)
      .set('Authorization', `Bearer ${user.token}`)
      .send({ due_date: '' })

    expect(updated.status).toBe(200)
    expect(updated.body.task.due_date).toBeNull()
  })
})
