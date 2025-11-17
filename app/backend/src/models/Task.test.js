import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { Task } from './Task.js'
import { User } from './User.js'
import { query } from '../config/database.js'

describe('Task Model', () => {
  let testUserId

  beforeAll(async () => {
    // Create a test user
    const user = await User.create('Task Test User', 'tasktest@example.com', 'password123')
    testUserId = user.id
  })

  afterAll(async () => {
    // Cleanup
    await query('DELETE FROM tasks WHERE user_id = $1', [testUserId])
    await query('DELETE FROM users WHERE id = $1', [testUserId])
  })

  beforeEach(async () => {
    // Clean up tasks before each test
    await query('DELETE FROM tasks WHERE user_id = $1', [testUserId])
  })

  describe('create', () => {
    it('should create a new task with all fields', async () => {
      const taskData = {
        title: 'Test Task',
        description: 'Test Description',
        status: 'todo',
        priority: 'high',
        due_date: '2025-12-31',
      }

      const task = await Task.create(testUserId, taskData)

      expect(task).toBeDefined()
      expect(task.id).toBeDefined()
      expect(task.title).toBe(taskData.title)
      expect(task.description).toBe(taskData.description)
      expect(task.status).toBe(taskData.status)
      expect(task.priority).toBe(taskData.priority)
      expect(task.user_id).toBe(testUserId)
    })

    it('should create task with default values', async () => {
      const taskData = {
        title: 'Minimal Task',
      }

      const task = await Task.create(testUserId, taskData)

      expect(task).toBeDefined()
      expect(task.title).toBe(taskData.title)
      expect(task.status).toBe('todo')
      expect(task.priority).toBe('medium')
      expect(task.description).toBeNull()
    })

    it('should throw error for missing title', async () => {
      const taskData = {}
      await expect(Task.create(testUserId, taskData)).rejects.toThrow()
    })
  })

  describe('findByUserId', () => {
    beforeEach(async () => {
      // Create multiple test tasks
      await Task.create(testUserId, { title: 'Task 1', status: 'todo', priority: 'high' })
      await Task.create(testUserId, { title: 'Task 2', status: 'in_progress', priority: 'medium' })
      await Task.create(testUserId, { title: 'Task 3', status: 'completed', priority: 'low' })
    })

    it('should find all tasks for a user', async () => {
      const tasks = await Task.findByUserId(testUserId)

      expect(tasks).toBeDefined()
      expect(tasks.length).toBe(3)
      expect(tasks[0].title).toBe('Task 3') // Most recent first
    })

    it('should filter tasks by status', async () => {
      const tasks = await Task.findByUserId(testUserId, { status: 'todo' })

      expect(tasks.length).toBe(1)
      expect(tasks[0].status).toBe('todo')
    })

    it('should filter tasks by priority', async () => {
      const tasks = await Task.findByUserId(testUserId, { priority: 'high' })

      expect(tasks.length).toBe(1)
      expect(tasks[0].priority).toBe('high')
    })

    it('should filter by both status and priority', async () => {
      await Task.create(testUserId, { title: 'Task 4', status: 'todo', priority: 'high' })
      const tasks = await Task.findByUserId(testUserId, { status: 'todo', priority: 'high' })

      expect(tasks.length).toBe(2)
      tasks.forEach(task => {
        expect(task.status).toBe('todo')
        expect(task.priority).toBe('high')
      })
    })

    it('should return empty array for user with no tasks', async () => {
      const tasks = await Task.findByUserId(999999)
      expect(tasks).toEqual([])
    })
  })

  describe('findByIdAndUserId', () => {
    it('should find task by ID and user ID', async () => {
      const createdTask = await Task.create(testUserId, { title: 'Find Me' })
      const task = await Task.findByIdAndUserId(createdTask.id, testUserId)

      expect(task).toBeDefined()
      expect(task.id).toBe(createdTask.id)
      expect(task.title).toBe('Find Me')
    })

    it('should return undefined for non-existent task', async () => {
      const task = await Task.findByIdAndUserId(999999, testUserId)
      expect(task).toBeUndefined()
    })

    it('should return undefined if task belongs to different user', async () => {
      const createdTask = await Task.create(testUserId, { title: 'Private Task' })
      const task = await Task.findByIdAndUserId(createdTask.id, 999999)

      expect(task).toBeUndefined()
    })
  })

  describe('update', () => {
    it('should update task fields', async () => {
      const createdTask = await Task.create(testUserId, { title: 'Original Title' })
      const updates = {
        title: 'Updated Title',
        status: 'in_progress',
        priority: 'high',
      }

      const updatedTask = await Task.update(createdTask.id, testUserId, updates)

      expect(updatedTask).toBeDefined()
      expect(updatedTask.title).toBe('Updated Title')
      expect(updatedTask.status).toBe('in_progress')
      expect(updatedTask.priority).toBe('high')
    })

    it('should only update allowed fields', async () => {
      const createdTask = await Task.create(testUserId, { title: 'Test' })
      const updates = {
        title: 'Updated',
        user_id: 999999, // Should not be updated
      }

      const updatedTask = await Task.update(createdTask.id, testUserId, updates)

      expect(updatedTask.title).toBe('Updated')
      expect(updatedTask.user_id).toBe(testUserId) // Should remain unchanged
    })

    it('should throw error if no valid fields to update', async () => {
      const createdTask = await Task.create(testUserId, { title: 'Test' })
      await expect(Task.update(createdTask.id, testUserId, { invalid_field: 'value' })).rejects.toThrow(
        'No valid fields to update'
      )
    })

    it('should return undefined if task does not exist', async () => {
      const result = await Task.update(999999, testUserId, { title: 'Update' })
      expect(result).toBeUndefined()
    })
  })

  describe('delete', () => {
    it('should delete task', async () => {
      const createdTask = await Task.create(testUserId, { title: 'Delete Me' })
      const deletedTask = await Task.delete(createdTask.id, testUserId)

      expect(deletedTask).toBeDefined()
      expect(deletedTask.id).toBe(createdTask.id)

      const task = await Task.findByIdAndUserId(createdTask.id, testUserId)
      expect(task).toBeUndefined()
    })

    it('should return undefined for non-existent task', async () => {
      const result = await Task.delete(999999, testUserId)
      expect(result).toBeUndefined()
    })

    it('should not delete task belonging to different user', async () => {
      const createdTask = await Task.create(testUserId, { title: 'Protected Task' })
      const result = await Task.delete(createdTask.id, 999999)

      expect(result).toBeUndefined()

      // Task should still exist
      const task = await Task.findByIdAndUserId(createdTask.id, testUserId)
      expect(task).toBeDefined()
    })
  })

  describe('getStatistics', () => {
    beforeEach(async () => {
      // Create tasks with various statuses and priorities
      await Task.create(testUserId, { title: 'Task 1', status: 'todo', priority: 'high' })
      await Task.create(testUserId, { title: 'Task 2', status: 'todo', priority: 'medium' })
      await Task.create(testUserId, { title: 'Task 3', status: 'in_progress', priority: 'low' })
      await Task.create(testUserId, { title: 'Task 4', status: 'completed', priority: 'high' })
      await Task.create(testUserId, { title: 'Task 5', status: 'completed', priority: 'medium' })
    })

    it('should return correct statistics', async () => {
      const stats = await Task.getStatistics(testUserId)

      expect(stats).toBeDefined()
      expect(stats.total).toBe(5)
      expect(stats.byStatus.todo).toBe(2)
      expect(stats.byStatus.in_progress).toBe(1)
      expect(stats.byStatus.completed).toBe(2)
      expect(stats.byPriority.high).toBe(2)
      expect(stats.byPriority.medium).toBe(2)
      expect(stats.byPriority.low).toBe(1)
    })

    it('should return zero stats for user with no tasks', async () => {
      const stats = await Task.getStatistics(999999)

      expect(stats.total).toBe(0)
      expect(stats.byStatus.todo).toBe(0)
      expect(stats.byStatus.in_progress).toBe(0)
      expect(stats.byStatus.completed).toBe(0)
    })
  })
})
