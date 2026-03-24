import promClient from 'prom-client'

// Create a Registry to register metrics
const register = new promClient.Registry()

// Add default metrics (CPU, memory, etc.)
promClient.collectDefaultMetrics({ register })

// Custom metrics
export const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
})

export const httpRequestTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
})

export const activeConnections = new promClient.Gauge({
  name: 'active_connections',
  help: 'Number of active connections',
})

export const databaseConnections = new promClient.Gauge({
  name: 'database_connections',
  help: 'Number of database connections',
  labelNames: ['state'], // total, idle, waiting
})

export const tasksByStatus = new promClient.Gauge({
  name: 'tasks_by_status',
  help: 'Number of tasks by status',
  labelNames: ['status'],
})

export const authAttempts = new promClient.Counter({
  name: 'auth_attempts_total',
  help: 'Total number of authentication attempts',
  labelNames: ['type', 'status'], // type: login|register, status: success|failure
})

// Register custom metrics
register.registerMetric(httpRequestDuration)
register.registerMetric(httpRequestTotal)
register.registerMetric(activeConnections)
register.registerMetric(databaseConnections)
register.registerMetric(tasksByStatus)
register.registerMetric(authAttempts)

export default register
