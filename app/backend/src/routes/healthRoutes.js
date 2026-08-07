import express from 'express'
import { query, getPoolStats } from '../config/database.js'
import metricsRegister from '../utils/metrics.js'
import config from '../config/index.js'

const router = express.Router()

// Health check endpoint
router.get('/health', async (req, res) => {
  try {
    // Test database connection
    await query('SELECT 1')

    const poolStats = getPoolStats()

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: 'connected',
      poolStats,
    })
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error.message,
    })
  }
})

// Metrics endpoint for Prometheus. Locked behind a shared-secret header when
// METRICS_KEY is set (Render prod) - previously this leaked auth-attempt
// counts, task-status gauges, and DB pool stats to anyone with the URL.
// Returns 404 (not 401) on a mismatch so the endpoint's existence isn't
// confirmed to an unauthenticated caller.
router.get('/metrics', async (req, res) => {
  if (config.metrics.key && req.get('X-Metrics-Key') !== config.metrics.key) {
    return res.status(404).json({ message: 'Not found' })
  }

  try {
    res.set('Content-Type', metricsRegister.contentType)
    const metrics = await metricsRegister.metrics()
    res.send(metrics)
  } catch (error) {
    res.status(500).send(error.message)
  }
})

export default router
