import express from 'express'
import { query, getPoolStats } from '../config/database.js'
import metricsRegister from '../utils/metrics.js'

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

// Metrics endpoint for Prometheus
router.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', metricsRegister.contentType)
    const metrics = await metricsRegister.metrics()
    res.send(metrics)
  } catch (error) {
    res.status(500).send(error.message)
  }
})

export default router
