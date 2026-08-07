import axios from './axios'
import type {
  TaskFilters,
  TaskInput,
  TaskListResponse,
  TaskResponse,
  TaskStatsResponse,
} from './types'

export const tasksAPI = {
  getTasks: async (filters: Partial<TaskFilters> = {}): Promise<TaskListResponse> => {
    const params = new URLSearchParams()
    if (filters.status) params.append('status', filters.status)
    if (filters.priority) params.append('priority', filters.priority)

    const response = await axios.get<TaskListResponse>(`/api/tasks?${params.toString()}`)
    return response.data
  },

  getTask: async (id: number): Promise<TaskResponse> => {
    const response = await axios.get<TaskResponse>(`/api/tasks/${id}`)
    return response.data
  },

  createTask: async (taskData: TaskInput): Promise<TaskResponse> => {
    const response = await axios.post<TaskResponse>('/api/tasks', taskData)
    return response.data
  },

  updateTask: async (id: number, taskData: Partial<TaskInput>): Promise<TaskResponse> => {
    const response = await axios.put<TaskResponse>(`/api/tasks/${id}`, taskData)
    return response.data
  },

  deleteTask: async (id: number): Promise<{ message: string }> => {
    const response = await axios.delete<{ message: string }>(`/api/tasks/${id}`)
    return response.data
  },

  getStatistics: async (): Promise<TaskStatsResponse> => {
    const response = await axios.get<TaskStatsResponse>('/api/tasks/stats')
    return response.data
  },
}
