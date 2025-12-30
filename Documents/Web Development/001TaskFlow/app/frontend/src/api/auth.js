import axios from './axios'

export const authAPI = {
  login: async (email, password) => {
    const response = await axios.post('/api/auth/login', { email, password })
    return response.data
  },

  register: async (name, email, password) => {
    const response = await axios.post('/api/auth/register', { name, email, password })
    return response.data
  },

  getCurrentUser: async () => {
    const response = await axios.get('/api/auth/me')
    return response.data
  },

  logout: async () => {
    const response = await axios.post('/api/auth/logout')
    return response.data
  },
}
