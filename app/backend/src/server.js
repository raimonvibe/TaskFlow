import app from './app.js'
import config from './config/index.js'
import { testConnection } from './config/database.js'
import logger from './utils/logger.js'

const startServer = async () => {
  try {
    // Test database connection
    await testConnection()

    // Start server
    const server = app.listen(config.port, config.host, () => {
      logger.info(`Server started`, {
        env: config.env,
        host: config.host,
        port: config.port,
        url: `http://${config.host}:${config.port}`,
      })
      logger.info('Press Ctrl+C to stop the server')
    })

    // Graceful shutdown
    const gracefulShutdown = signal => {
      logger.info(`${signal} received, closing server gracefully`)
      server.close(() => {
        logger.info('HTTP server closed')
        process.exit(0)
      })

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error('Could not close connections in time, forcefully shutting down')
        process.exit(1)
      }, 10000)
    }

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
    process.on('SIGINT', () => gracefulShutdown('SIGINT'))
  } catch (error) {
    logger.error('Failed to start server', error)
    process.exit(1)
  }
}

startServer()
