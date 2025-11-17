// Configuration loaded from environment variables
export const config = {
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  env: import.meta.env.VITE_ENV || 'development',
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
}

export default config
