import type { RequestHandler } from 'express'
import type { ErrorRequestHandler, Router } from 'express'
import { AuthService } from '../application/services/AuthService.js'
import { TokenService } from '../application/services/TokenService.js'
import { AuditLogSubscriber } from '../application/subscribers/AuditLogSubscriber.js'
import { MetricsSubscriber } from '../application/subscribers/MetricsSubscriber.js'
import type { Clock } from '../application/ports/IClock.js'
import type { Logger } from '../application/ports/ILogger.js'
import type { MetricsRegistry } from '../application/ports/IMetricsRegistry.js'
import { SystemClock } from '../infrastructure/clock/SystemClock.js'
import { Config } from '../infrastructure/config/Config.js'
import { InMemoryEventBus } from '../infrastructure/events/InMemoryEventBus.js'
import { WinstonLogger } from '../infrastructure/logging/WinstonLogger.js'
import { PostgresConnection } from '../infrastructure/persistence/postgres/PostgresConnection.js'
import { PostgresTokenBlacklistRepository } from '../infrastructure/persistence/postgres/PostgresTokenBlacklistRepository.js'
import { PostgresUserRepository } from '../infrastructure/persistence/postgres/PostgresUserRepository.js'
import { BcryptPasswordHasher } from '../infrastructure/security/BcryptPasswordHasher.js'
import { JwtTokenProvider } from '../infrastructure/security/JwtTokenProvider.js'
import { AuthController } from '../presentation/http/controllers/AuthController.js'
import { createAuthenticate } from '../presentation/http/middleware/authenticate.js'
import { createErrorHandler, notFound } from '../presentation/http/middleware/errorHandler.js'
import { createAuthRouter } from '../presentation/http/routes/authRoutes.js'

export interface ContainerOverrides {
  readonly config?: Config
  readonly logger?: Logger
  readonly clock?: Clock
  readonly db?: PostgresConnection
  readonly metrics?: MetricsRegistry
}

export interface Container {
  readonly config: Config
  readonly logger: Logger
  readonly db: PostgresConnection
  readonly authRouter: Router
  readonly authenticate: RequestHandler
  readonly errorHandler: ErrorRequestHandler
  readonly notFound: RequestHandler
}

/**
 * The composition root: the one place concrete implementations are chosen
 * and `new`'d, then handed to everything else as constructor arguments.
 *
 * Hand-rolled rather than a DI framework on purpose (docs/BACKEND_REWRITE_PLAN.md
 * §3). At this size, a function you can read top to bottom - here is the
 * database, here is what depends on it, here is what depends on that -
 * teaches the pattern better than a container with its own lifecycle rules,
 * and there is nothing to learn before you can follow it.
 *
 * Note what is *not* here: no module-level `new` anywhere else in the
 * codebase, so nothing acquires a database pool or a logger just by being
 * imported. That is the property that makes an integration test able to
 * build a second, differently-configured application in the same process.
 */
export function createContainer(overrides: ContainerOverrides = {}): Container {
  const config = overrides.config ?? Config.getInstance()
  const logger = overrides.logger ?? createDefaultLogger(config)
  const clock = overrides.clock ?? new SystemClock()
  const db = overrides.db ?? new PostgresConnection(config.database, logger)

  // Infrastructure
  const users = new PostgresUserRepository(db)
  const tokenBlacklist = new PostgresTokenBlacklistRepository(db)
  const passwordHasher = new BcryptPasswordHasher()
  const tokenProvider = new JwtTokenProvider({
    secret: config.jwt.secret,
    expiresIn: config.jwt.expiresIn,
  })
  const events = new InMemoryEventBus(logger)

  // Application
  const tokenService = new TokenService(tokenProvider, tokenBlacklist, clock, logger)
  const authService = new AuthService(users, passwordHasher, tokenService, events, clock)

  // Subscribers: side effects attach themselves to events here, rather than
  // services calling them. Nothing above needs to know they exist.
  new AuditLogSubscriber(logger).register(events)
  if (overrides.metrics) {
    new MetricsSubscriber(overrides.metrics).register(events)
  }

  // Presentation
  const authenticate = createAuthenticate(tokenService, logger)
  const authRouter = createAuthRouter({
    controller: new AuthController(authService),
    authenticate,
    rateLimit: { windowMs: config.rateLimit.authWindowMs, max: config.rateLimit.authMax },
  })

  const errorHandler = createErrorHandler(logger, {
    includeStack: config.env === 'development',
    hideInternalErrors: config.env === 'production',
  })

  return { config, logger, db, authRouter, authenticate, errorHandler, notFound }
}

/**
 * File transports are skipped under NODE_ENV=test: unit tests build
 * containers freely, and none of them should be creating a logs/ directory
 * or appending to the real log files as a side effect.
 */
function createDefaultLogger(config: Config): Logger {
  return new WinstonLogger({
    level: config.log.level,
    enableFileTransports: config.env !== 'test',
  })
}
