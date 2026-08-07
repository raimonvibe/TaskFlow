export interface PoolStats {
  readonly total: number
  readonly idle: number
  readonly waiting: number
}

/**
 * What the health and metrics endpoints need to know about the database,
 * and nothing more.
 *
 * `healthRoutes.js` imported `query` and `getPoolStats` from
 * `config/database.js`, which meant the health check could run any SQL it
 * liked and the module-level pool was reachable from the HTTP layer. This
 * port is the whole surface instead: liveness and pool counters. A health
 * controller built against it cannot accidentally grow into something that
 * reads application data.
 *
 * `PostgresConnection` implements it, so nothing new has to exist for it to
 * be satisfied - and a test can report a dead database by handing over an
 * object whose `ping()` rejects.
 */
export interface DatabaseHealth {
  /** Resolves if the database answers, rejects otherwise. */
  ping(): Promise<void>

  getPoolStats(): PoolStats
}
