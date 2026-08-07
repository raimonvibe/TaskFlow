import 'dotenv/config'
import type { Server } from 'http'
import { createContainer, type Container } from './composition/container.js'
import { createApp } from './presentation/http/app.js'

const FORCED_SHUTDOWN_MS = 10000

/**
 * Process entrypoint. Replaces server.js.
 *
 * Loading `.env` happens here and only here - `Config` deliberately does
 * not do it, because reading a file off disk should not be a side effect of
 * constructing a configuration object (see infrastructure/config/Config.ts).
 * This is the bootstrap, so this is where bootstrap concerns belong.
 */
async function main(): Promise<void> {
  const container = createContainer()

  const { config, logger, db } = container

  try {
    await db.testConnection()
  } catch (error) {
    logger.error('Failed to start server', {
      error: error instanceof Error ? error.message : String(error),
    })
    process.exit(1)
  }

  const app = createApp(container)

  const server = app.listen(config.port, config.host, () => {
    logger.info('Server started', {
      env: config.env,
      host: config.host,
      port: config.port,
      url: `http://${config.host}:${config.port}`,
    })
    logger.info('Press Ctrl+C to stop the server')
  })

  installShutdownHandlers(server, container)
}

/**
 * Closes the listener, then the database pool. Same 10-second force-quit
 * backstop server.js has, for the same reason: a connection that will not
 * drain must not keep a container alive past its stop timeout.
 *
 * Draining the pool is new - server.js left it to process exit. Doing it
 * explicitly means in-flight queries get a chance to finish before the
 * process goes away.
 */
function installShutdownHandlers(server: Server, container: Container): void {
  const { logger, db } = container
  let shuttingDown = false

  const gracefulShutdown = (signal: string): void => {
    if (shuttingDown) return
    shuttingDown = true

    logger.info(`${signal} received, closing server gracefully`)

    const forceExit = setTimeout(() => {
      logger.error('Could not close connections in time, forcefully shutting down')
      process.exit(1)
    }, FORCED_SHUTDOWN_MS)
    // Do not let the timer itself hold the event loop open.
    forceExit.unref()

    server.close(() => {
      logger.info('HTTP server closed')
      db.close()
        .catch((error: unknown) => {
          logger.error('Error closing database pool', {
            error: error instanceof Error ? error.message : String(error),
          })
        })
        .finally(() => {
          process.exit(0)
        })
    })
  }

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
  process.on('SIGINT', () => gracefulShutdown('SIGINT'))
}

void main()
