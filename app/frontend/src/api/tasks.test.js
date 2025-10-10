import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getTasks, getTask, createTask, updateTask, deleteTask, getTaskStats } from './tasks'
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
      const mockResponse = { data: { tasks: mockTasks } }

      axios.get.mockResolvedValue(mockResponse)

      const result = await getTasks()

      expect(axios.get).toHaveBeenCalledWith('/tasks')
      expect(result).toEqual(mockResponse.data)
    })

    it('should fetch tasks with filters', async () => {
      const filters = { status: 'completed', priority: 'high' }
      const mockResponse = { data: { tasks: [] } }

      axios.get.mockResolvedValue(mockResponse)

      await getTasks(filters)

      expect(axios.get).toHaveBeenCalledWith('/tasks', { params: filters })
    })
  })

  describe('getTask', () => {
    it('should fetch a single task by ID', async () => {
      const mockTask = { id: 1, title: 'Task 1' }
      const mockResponse = { data: { task: mockTask } }

      axios.get.mockResolvedValue(mockResponse)

      const result = await getTask(1)

      expect(axios.get).toHaveBeenCalledWith('/tasks/1')
      expect(result).toEqual(mockResponse.data)
    })
  })

  describe('createTask', () => {
    it('should create a new task', async () => {
      const taskData = { title: 'New Task', priority: 'high' }
      const mockResponse = {
        data: { task: { id: 1, ...taskData } },
      }

      axios.post.mockResolvedValue(mockResponse)

      const result = await createTask(taskData)

      expect(axios.post).toHaveBeenCalledWith('/tasks', taskData)
      expect(result).toEqual(mockResponse.data)
    })
  })

  describe('updateTask', () => {
    it('should update a task', async () => {
      const updates = { title: 'Updated Task', status: 'completed' }
      const mockResponse = {
        data: { task: { id: 1, ...updates } },
      }

      axios.put.mockResolvedValue(mockResponse)

      const result = await updateTask(1, updates)

      expect(axios.put).toHaveBeenCalledWith('/tasks/1', updates)
      expect(result).toEqual(mockResponse.data)
    })
  })

  describe('deleteTask', () => {
    it('should delete a task', async () => {
      const mockResponse = { data: { message: 'Task deleted' } }

      axios.delete.mockResolvedValue(mockResponse)

      const result = await deleteTask(1)

      expect(axios.delete).toHaveBeenCalledWith('/tasks/1')
      expect(result).toEqual(mockResponse.data)
    })
  })

  describe('getTaskStats', () => {
    it('should fetch task statistics', async () => {
      const mockStats = {
        total: 10,
        byStatus: { todo: 3, in_progress: 2, completed: 5 },
      }
      const mockResponse = { data: { statistics: mockStats } }

      axios.get.mockResolvedValue(mockResponse)

      const result = await getTaskStats()

      expect(axios.get).toHaveBeenCalledWith('/tasks/stats')
      expect(result).toEqual(mockResponse.data)
    })
  })
})
