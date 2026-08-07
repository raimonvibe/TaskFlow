import axios from './axios'

export interface HealthResponse {
  status: string
  [key: string]: unknown
}

export const healthAPI = {
  checkHealth: async (): Promise<HealthResponse> => {
    const response = await axios.get<HealthResponse>('/health')
    return response.data
  },
}
