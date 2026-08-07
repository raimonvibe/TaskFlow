import { describe, it, expect, vi, beforeEach } from 'vitest'
import { tasksAPI } from './tasks'
import axios from './axios'

vi.mock('./axios')

describe('Tasks API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getTasks', () => {
    it('should fetch all tasks', async () => {
      const mockTasks = [
        { id: 1, title: 'Task 1' },
        { id: 2, title: 'Task 2' },
      ]
      const mockResponse = { data: { tasks: mockTasks, count: 2 } }

      vi.mocked(axios.get).mockResolvedValue(mockResponse)

      const result = await tasksAPI.getTasks()

      expect(axios.get).toHaveBeenCalled()
      expect(result).toEqual(mockResponse.data)
    })

    it('should fetch tasks with filters', async () => {
      const filters = { status: 'completed' as const, priority: 'high' as const }
      const mockResponse = { data: { tasks: [], count: 0 } }

      vi.mocked(axios.get).mockResolvedValue(mockResponse)

      await tasksAPI.getTasks(filters)

      expect(axios.get).toHaveBeenCalled()
      expect(vi.mocked(axios.get).mock.calls[0]?.[0]).toContain('status=completed')
      expect(vi.mocked(axios.get).mock.calls[0]?.[0]).toContain('priority=high')
    })
  })

  describe('getTask', () => {
    it('should fetch a single task by ID', async () => {
      const mockTask = { id: 1, title: 'Task 1' }
      const mockResponse = { data: { task: mockTask } }

      vi.mocked(axios.get).mockResolvedValue(mockResponse)

      const result = await tasksAPI.getTask(1)

      expect(axios.get).toHaveBeenCalledWith('/api/tasks/1')
      expect(result).toEqual(mockResponse.data)
    })
  })

  describe('createTask', () => {
    it('should create a new task', async () => {
      const taskData = {
        title: 'New Task',
        description: '',
        status: 'todo' as const,
        priority: 'medium' as const,
        due_date: '',
      }
      const mockResponse = { data: { task: { id: 1, ...taskData } } }

      vi.mocked(axios.post).mockResolvedValue(mockResponse)

      const result = await tasksAPI.createTask(taskData)

      expect(axios.post).toHaveBeenCalledWith('/api/tasks', taskData)
      expect(result).toEqual(mockResponse.data)
    })
  })

  describe('updateTask', () => {
    it('should update a task', async () => {
      const updates = { title: 'Updated Task' }
      const mockResponse = { data: { task: { id: 1, ...updates } } }

      vi.mocked(axios.put).mockResolvedValue(mockResponse)

      const result = await tasksAPI.updateTask(1, updates)

      expect(axios.put).toHaveBeenCalledWith('/api/tasks/1', updates)
      expect(result).toEqual(mockResponse.data)
    })
  })

  describe('deleteTask', () => {
    it('should delete a task', async () => {
      const mockResponse = { data: { message: 'Task deleted' } }

      vi.mocked(axios.delete).mockResolvedValue(mockResponse)

      const result = await tasksAPI.deleteTask(1)

      expect(axios.delete).toHaveBeenCalledWith('/api/tasks/1')
      expect(result).toEqual(mockResponse.data)
    })
  })

  describe('getStatistics', () => {
    it('should fetch task statistics', async () => {
      const mockStats = {
        total: 10,
        byStatus: { todo: 3, in_progress: 2, completed: 5 },
        byPriority: { low: 1, medium: 4, high: 5 },
      }
      const mockResponse = { data: mockStats }

      vi.mocked(axios.get).mockResolvedValue(mockResponse)

      const result = await tasksAPI.getStatistics()

      expect(axios.get).toHaveBeenCalledWith('/api/tasks/stats')
      expect(result).toEqual(mockResponse.data)
    })
  })
})
