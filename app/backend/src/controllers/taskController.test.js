import { describe, it, expect, jest, beforeEach } from '@jest/globals'

// Create mock functions outside factory
const mockTaskCreate = jest.fn()
const mockTaskFindByUserId = jest.fn()
const mockTaskFindByIdAndUserId = jest.fn()
const mockTaskUpdate = jest.fn()
const mockTaskDelete = jest.fn()
const mockTaskGetStatistics = jest.fn()

// Mock dependencies
jest.mock('../config/index.js', () => ({
  default: {
    database: {},
    jwt: { secret: 'test-secret', expiresIn: '1h' },
  },
}))
jest.mock('../config/database.js', () => ({
  query: jest.fn(),
  testConnection: jest.fn(),
  transaction: jest.fn(),
  getPoolStats: jest.fn(),
}))
jest.mock('../models/Task.js', () => ({
  Task: {
    create: mockTaskCreate,
    findByUserId: mockTaskFindByUserId,
    findByIdAndUserId: mockTaskFindByIdAndUserId,
    update: mockTaskUpdate,
    delete: mockTaskDelete,
    getStatistics: mockTaskGetStatistics,
  },
}))
jest.mock('../utils/metrics.js', () => ({
  taskOperations: { inc: jest.fn() },
}))
jest.mock('../utils/logger.js', () => ({
  default: { info: jest.fn(), error: jest.fn(), debug: jest.fn() },
}))

import { createTask, getTasks, getTask, updateTask, deleteTask, getStatistics } from './taskController.js'

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
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    }
    mockNext = jest.fn()

    jest.clearAllMocks()
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

      mockTaskCreate.mockResolvedValue(mockTask)

      await createTask(mockReq, mockRes, mockNext)

      expect(mockTaskCreate).toHaveBeenCalledWith(1, mockReq.body)
      expect(mockRes.status).toHaveBeenCalledWith(201)
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Task created successfully',
        task: mockTask,
      })
    })

    it('should handle errors', async () => {
      mockReq.body = { title: 'New Task' }
      const error = new Error('Database error')
      mockTaskCreate.mockRejectedValue(error)

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

      mockTaskFindByUserId.mockResolvedValue(mockTasks)

      await getTasks(mockReq, mockRes, mockNext)

      expect(mockTaskFindByUserId).toHaveBeenCalledWith(1, {})
      expect(mockRes.json).toHaveBeenCalledWith({ tasks: mockTasks })
    })

    it('should apply filters from query params', async () => {
      mockReq.query = { status: 'todo', priority: 'high' }
      mockTaskFindByUserId.mockResolvedValue([])

      await getTasks(mockReq, mockRes, mockNext)

      expect(mockTaskFindByUserId).toHaveBeenCalledWith(1, {
        status: 'todo',
        priority: 'high',
      })
    })

    it('should handle errors', async () => {
      const error = new Error('Database error')
      mockTaskFindByUserId.mockRejectedValue(error)

      await getTasks(mockReq, mockRes, mockNext)

      expect(mockNext).toHaveBeenCalledWith(error)
    })
  })

  describe('getTask', () => {
    it('should get a single task', async () => {
      mockReq.params = { id: '1' }
      const mockTask = { id: 1, title: 'Task 1', user_id: 1 }

      mockTaskFindByIdAndUserId.mockResolvedValue(mockTask)

      await getTask(mockReq, mockRes, mockNext)

      expect(mockTaskFindByIdAndUserId).toHaveBeenCalledWith(1, 1)
      expect(mockRes.json).toHaveBeenCalledWith({ task: mockTask })
    })

    it('should return 404 if task not found', async () => {
      mockReq.params = { id: '999' }
      mockTaskFindByIdAndUserId.mockResolvedValue(null)

      await getTask(mockReq, mockRes, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(404)
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Task not found' })
    })

    it('should handle errors', async () => {
      mockReq.params = { id: '1' }
      const error = new Error('Database error')
      mockTaskFindByIdAndUserId.mockRejectedValue(error)

      await getTask(mockReq, mockRes, mockNext)

      expect(mockNext).toHaveBeenCalledWith(error)
    })
  })

  describe('updateTask', () => {
    it('should update a task successfully', async () => {
      mockReq.params = { id: '1' }
      mockReq.body = { title: 'Updated Task', status: 'completed' }

      const mockTask = {
        id: 1,
        title: 'Updated Task',
        status: 'completed',
        user_id: 1,
      }

      mockTaskUpdate.mockResolvedValue(mockTask)

      await updateTask(mockReq, mockRes, mockNext)

      expect(mockTaskUpdate).toHaveBeenCalledWith(1, 1, mockReq.body)
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Task updated successfully',
        task: mockTask,
      })
    })

    it('should return 404 if task not found', async () => {
      mockReq.params = { id: '999' }
      mockReq.body = { title: 'Updated' }

      mockTaskUpdate.mockResolvedValue(null)

      await updateTask(mockReq, mockRes, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(404)
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Task not found' })
    })

    it('should handle errors', async () => {
      mockReq.params = { id: '1' }
      mockReq.body = { title: 'Updated' }
      const error = new Error('Database error')
      mockTaskUpdate.mockRejectedValue(error)

      await updateTask(mockReq, mockRes, mockNext)

      expect(mockNext).toHaveBeenCalledWith(error)
    })
  })

  describe('deleteTask', () => {
    it('should delete a task successfully', async () => {
      mockReq.params = { id: '1' }
      mockTaskDelete.mockResolvedValue({ id: 1 })

      await deleteTask(mockReq, mockRes, mockNext)

      expect(mockTaskDelete).toHaveBeenCalledWith(1, 1)
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Task deleted successfully' })
    })

    it('should return 404 if task not found', async () => {
      mockReq.params = { id: '999' }
      mockTaskDelete.mockResolvedValue(null)

      await deleteTask(mockReq, mockRes, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(404)
      expect(mockRes.json).toHaveBeenCalledWith({ message: 'Task not found' })
    })

    it('should handle errors', async () => {
      mockReq.params = { id: '1' }
      const error = new Error('Database error')
      mockTaskDelete.mockRejectedValue(error)

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

      mockTaskGetStatistics.mockResolvedValue(mockStats)

      await getStatistics(mockReq, mockRes, mockNext)

      expect(mockTaskGetStatistics).toHaveBeenCalledWith(1)
      expect(mockRes.json).toHaveBeenCalledWith({ statistics: mockStats })
    })

    it('should handle errors', async () => {
      const error = new Error('Database error')
      mockTaskGetStatistics.mockRejectedValue(error)

      await getStatistics(mockReq, mockRes, mockNext)

      expect(mockNext).toHaveBeenCalledWith(error)
    })
  })
})
