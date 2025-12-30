import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock dependencies BEFORE any imports
vi.mock('../config/index.js', () => ({
  default: {
    database: {},
    jwt: { secret: 'test-secret', expiresIn: '1h' },
  },
}))

vi.mock('../config/database.js', () => ({
  query: vi.fn(),
  testConnection: vi.fn(),
  transaction: vi.fn(),
  getPoolStats: vi.fn(),
}))

vi.mock('../models/Task.js', () => ({
  Task: {
    create: vi.fn(),
    findByUserId: vi.fn(),
    findByIdAndUserId: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    getStatistics: vi.fn(),
  },
}))

vi.mock('../utils/metrics.js', () => ({
  tasksByStatus: { inc: vi.fn(), dec: vi.fn() },
}))

vi.mock('../utils/logger.js', () => ({
  default: { info: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

import { createTask, getTasks, getTask, updateTask, deleteTask, getStatistics } from './taskController.js'
import { Task } from '../models/Task.js'

describe('Task Controller', () => {
  let mockReq, mockRes, mockNext

  beforeEach(() => {
    mockReq = {
      user: { id: 1 },
      body: {},
      params: {},
      query: {},
    }
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    }
    mockNext = vi.fn()

    vi.clearAllMocks()
  })

  describe('createTask', () => {
    it('should create a task successfully', async () => {
      mockReq.body = {
        title: 'New Task',
        description: 'Task description',
        priority: 'high',
      }

      const mockTask = {
        id: 1,
        user_id: 1,
        title: 'New Task',
        description: 'Task description',
        priority: 'high',
        status: 'todo',
        created_at: new Date(),
      }

      Task.create.mockResolvedValue(mockTask)

      await createTask(mockReq, mockRes, mockNext)

      expect(Task.create).toHaveBeenCalledWith(1, mockReq.body)
      expect(mockRes.status).toHaveBeenCalledWith(201)
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Task created successfully',
        task: mockTask,
      })
    })

    it('should handle errors', async () => {
      mockReq.body = { title: 'New Task' }
      const error = new Error('Database error')
      Task.create.mockRejectedValue(error)

      await createTask(mockReq, mockRes, mockNext)

      expect(mockNext).toHaveBeenCalledWith(error)
    })
  })

  describe('getTasks', () => {
    it('should get all tasks for user', async () => {
      const mockTasks = [
        { id: 1, title: 'Task 1', status: 'todo' },
        { id: 2, title: 'Task 2', status: 'completed' },
      ]

      Task.findByUserId.mockResolvedValue(mockTasks)

      await getTasks(mockReq, mockRes, mockNext)

      expect(Task.findByUserId).toHaveBeenCalledWith(1, {})
      expect(mockRes.json).toHaveBeenCalledWith({ tasks: mockTasks, count: 2 })
    })

    it('should apply filters from query params', async () => {
      mockReq.query = { status: 'todo', priority: 'high' }
      Task.findByUserId.mockResolvedValue([])

      await getTasks(mockReq, mockRes, mockNext)

      expect(Task.findByUserId).toHaveBeenCalledWith(1, {
        status: 'todo',
        priority: 'high',
      })
    })

    it('should handle errors', async () => {
      const error = new Error('Database error')
      Task.findByUserId.mockRejectedValue(error)

      await getTasks(mockReq, mockRes, mockNext)

      expect(mockNext).toHaveBeenCalledWith(error)
    })
  })

  describe('getTask', () => {
    it('should get a single task', async () => {
      mockReq.params = { id: '1' }
      const mockTask = { id: 1, title: 'Task 1', user_id: 1 }

      Task.findByIdAndUserId.mockResolvedValue(mockTask)

      await getTask(mockReq, mockRes, mockNext)

      expect(Task.findByIdAndUserId).toHaveBeenCalledWith('1', 1)
      expect(mockRes.json).toHaveBeenCalledWith({ task: mockTask })
    })

    it('should return 404 if task not found', async () => {
      mockReq.params = { id: '999' }
      Task.findByIdAndUserId.mockResolvedValue(null)

      await getTask(mockReq, mockRes, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(404)
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Task not found' })
    })

    it('should handle errors', async () => {
      mockReq.params = { id: '1' }
      const error = new Error('Database error')
      Task.findByIdAndUserId.mockRejectedValue(error)

      await getTask(mockReq, mockRes, mockNext)

      expect(mockNext).toHaveBeenCalledWith(error)
    })
  })

  describe('updateTask', () => {
    it('should update a task successfully', async () => {
      mockReq.params = { id: '1' }
      mockReq.body = { title: 'Updated Task', status: 'completed' }

      const oldTask = {
        id: 1,
        title: 'Old Task',
        status: 'todo',
        user_id: 1,
      }

      const mockTask = {
        id: 1,
        title: 'Updated Task',
        status: 'completed',
        user_id: 1,
      }

      Task.findByIdAndUserId.mockResolvedValue(oldTask)
      Task.update.mockResolvedValue(mockTask)

      await updateTask(mockReq, mockRes, mockNext)

      expect(Task.findByIdAndUserId).toHaveBeenCalledWith('1', 1)
      expect(Task.update).toHaveBeenCalledWith('1', 1, mockReq.body)
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Task updated successfully',
        task: mockTask,
      })
    })

    it('should return 404 if task not found', async () => {
      mockReq.params = { id: '999' }
      mockReq.body = { title: 'Updated' }

      Task.update.mockResolvedValue(null)

      await updateTask(mockReq, mockRes, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(404)
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Task not found' })
    })

    it('should handle errors', async () => {
      mockReq.params = { id: '1' }
      mockReq.body = { title: 'Updated' }
      const error = new Error('Database error')
      Task.update.mockRejectedValue(error)

      await updateTask(mockReq, mockRes, mockNext)

      expect(mockNext).toHaveBeenCalledWith(error)
    })
  })

  describe('deleteTask', () => {
    it('should delete a task successfully', async () => {
      mockReq.params = { id: '1' }
      const mockTask = { id: 1, status: 'todo' }

      Task.findByIdAndUserId.mockResolvedValue(mockTask)
      Task.delete.mockResolvedValue({ id: 1 })

      await deleteTask(mockReq, mockRes, mockNext)

      expect(Task.findByIdAndUserId).toHaveBeenCalledWith('1', 1)
      expect(Task.delete).toHaveBeenCalledWith('1', 1)
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Task deleted successfully' })
    })

    it('should return 404 if task not found', async () => {
      mockReq.params = { id: '999' }
      Task.delete.mockResolvedValue(null)

      await deleteTask(mockReq, mockRes, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(404)
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Task not found' })
    })

    it('should handle errors', async () => {
      mockReq.params = { id: '1' }
      const error = new Error('Database error')
      Task.delete.mockRejectedValue(error)

      await deleteTask(mockReq, mockRes, mockNext)

      expect(mockNext).toHaveBeenCalledWith(error)
    })
  })

  describe('getStatistics', () => {
    it('should get task statistics', async () => {
      const mockStats = {
        total: 10,
        byStatus: { todo: 3, in_progress: 2, completed: 5 },
        byPriority: { low: 2, medium: 5, high: 3 },
      }

      Task.getStatistics.mockResolvedValue(mockStats)

      await getStatistics(mockReq, mockRes, mockNext)

      expect(Task.getStatistics).toHaveBeenCalledWith(1)
      expect(mockRes.json).toHaveBeenCalledWith(mockStats)
    })

    it('should handle errors', async () => {
      const error = new Error('Database error')
      Task.getStatistics.mockRejectedValue(error)

      await getStatistics(mockReq, mockRes, mockNext)

      expect(mockNext).toHaveBeenCalledWith(error)
    })
  })
})
