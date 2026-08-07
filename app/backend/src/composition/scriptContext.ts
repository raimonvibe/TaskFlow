import 'dotenv/config'
import type { Logger } from '../application/ports/ILogger.js'
import { Config } from '../infrastructure/config/Config.js'
import { PostgresConnection } from '../infrastructure/persistence/postgres/PostgresConnection.js'
import { createDefaultLogger } from './container.js'

export interface ScriptContext {
  readonly config: Config
  readonly logger: Logger
  readonly db: PostgresConnection
}

/**
 * The composition root for the standalone database scripts (`db:init`,
 * `seed`), which need configuration, a logger, and a pool but have no use
 * for controllers, routes, or an event bus.
 *
 * They used to get all three by importing `config/database.js`, whose
 * module body created a pool the moment anything touched it. Building them
 * here instead means the scripts own the pool they open - and, more to the
 * point, can close it, which is why `runScript` below can let the process
 * end on its own rather than calling `process.exit` to escape a pool
 * holding the event loop open.
 *
 * Like main.ts, this is a bootstrap, so loading `.env` belongs here.
 */
export function createScriptContext(): ScriptContext {
  const config = Config.getInstance()
  const logger = createDefaultLogger(config)
  const db = new PostgresConnection(config.database, logger)

  return { config, logger, db }
}

/**
 * Runs a script body against a fresh context, closes the pool either way,
 * and exits non-zero on failure so a failed `db:init` stops a deploy
 * instead of letting the server start against a schema-less database.
 */
export async function runScript(
  name: string,
  body: (context: ScriptContext) => Promise<void>
): Promise<void> {
  const context = createScriptContext()

  try {
    await body(context)
  } catch (error) {
    context.logger.error(`${name} failed`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })
    process.exitCode = 1
  } finally {
    await context.db.close()
  }
}
