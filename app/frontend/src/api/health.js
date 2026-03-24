import axios from './axios'

export const healthAPI = {
  // Check backend health
  checkHealth: async () => {
    const response = await axios.get('/health')
    return response.data
  },
}
