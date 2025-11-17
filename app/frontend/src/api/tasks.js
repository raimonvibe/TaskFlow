import axios from './axios'

export const tasksAPI = {
  // Get all tasks for the current user
  getTasks: async (filters = {}) => {
    const params = new URLSearchParams()
    if (filters.status) params.append('status', filters.status)
    if (filters.priority) params.append('priority', filters.priority)

    const response = await axios.get(`/api/tasks?${params.toString()}`)
    return response.data
  },

  // Get a single task by ID
  getTask: async id => {
    const response = await axios.get(`/api/tasks/${id}`)
    return response.data
  },

  // Create a new task
  createTask: async taskData => {
    const response = await axios.post('/api/tasks', taskData)
    return response.data
  },

  // Update a task
  updateTask: async (id, taskData) => {
    const response = await axios.put(`/api/tasks/${id}`, taskData)
    return response.data
  },

  // Delete a task
  deleteTask: async id => {
    const response = await axios.delete(`/api/tasks/${id}`)
    return response.data
  },

  // Get task statistics
  getStatistics: async () => {
    const response = await axios.get('/api/tasks/stats')
    return response.data
  },
}
