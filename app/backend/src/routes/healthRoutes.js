import express from 'express'
import { query, getPoolStats } from '../config/database.js'
import metricsRegister, { databaseConnections } from '../utils/metrics.js'
import config from '../config/index.js'
import logger from '../utils/logger.js'

const router = express.Router()

// Health check endpoint. Public and unauthenticated by design (Render's
// health checker hits it directly, no way to pass a header), so it stays
// minimal on purpose - uptime and pool stats (connection counts, load) tell
// an attacker more than they need to know about the app's internal state.
// That detail lives in /metrics instead, which requires the key.
router.get('/health', async (req, res) => {
  try {
    // Test database connection
    await query('SELECT 1')

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
    })
  } catch (error) {
    // /health is public and unauthenticated (Render's health checker hits it
    // directly) - error.message from a DB driver can include internal
    // connection details (host, port, sometimes more). The full error is
    // already captured server-side by the query() helper's own logging;
    // don't also hand it to whoever's asking.
    logger.error('Health check failed', { error: error.message })
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
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
    // Was previously only exposed via the public, unauthenticated /health
    // response - moved here since /metrics is the endpoint actually gated
    // behind METRICS_KEY in production. The gauge existed but nothing ever
    // set it, so it always reported empty; wire it to the real pool stats
    // right before each scrape.
    const poolStats = getPoolStats()
    databaseConnections.set({ state: 'total' }, poolStats.total)
    databaseConnections.set({ state: 'idle' }, poolStats.idle)
    databaseConnections.set({ state: 'waiting' }, poolStats.waiting)

    res.set('Content-Type', metricsRegister.contentType)
    const metrics = await metricsRegister.metrics()
    res.send(metrics)
  } catch (error) {
    logger.error('Metrics collection failed', { error: error.message })
    res.status(500).json({ message: 'Failed to collect metrics' })
  }
})

export default router
