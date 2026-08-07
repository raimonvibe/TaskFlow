import type { RequestHandler } from 'express'
import type { ErrorRequestHandler, Router } from 'express'
import { AuthService } from '../application/services/AuthService.js'
import { HealthService } from '../application/services/HealthService.js'
import { RefreshTokenService } from '../application/services/RefreshTokenService.js'
import { TaskService } from '../application/services/TaskService.js'
import { TokenService } from '../application/services/TokenService.js'
import { parseDurationToSeconds } from '../infrastructure/time/parseDuration.js'
import { AuditLogSubscriber } from '../application/subscribers/AuditLogSubscriber.js'
import { MetricsSubscriber } from '../application/subscribers/MetricsSubscriber.js'
import type { Clock } from '../application/ports/IClock.js'
import type { Logger } from '../application/ports/ILogger.js'
import type { RequestContext } from '../application/ports/IRequestContext.js'
import {
  LengthPasswordPolicy,
  StrongPasswordPolicy,
  type PasswordPolicy,
} from '../domain/policies/PasswordPolicy.js'
import { SystemClock } from '../infrastructure/clock/SystemClock.js'
import { Config } from '../infrastructure/config/Config.js'
import { AsyncLocalRequestContext } from '../infrastructure/context/AsyncLocalRequestContext.js'
import { InMemoryEventBus } from '../infrastructure/events/InMemoryEventBus.js'
import { CorrelatingLogger } from '../infrastructure/logging/CorrelatingLogger.js'
import { WinstonLogger } from '../infrastructure/logging/WinstonLogger.js'
import { PrometheusMetricsRegistry } from '../infrastructure/metrics/PrometheusMetricsRegistry.js'
import { PostgresConnection } from '../infrastructure/persistence/postgres/PostgresConnection.js'
import { PostgresRefreshTokenRepository } from '../infrastructure/persistence/postgres/PostgresRefreshTokenRepository.js'
import { PostgresTaskRepository } from '../infrastructure/persistence/postgres/PostgresTaskRepository.js'
import { PostgresTokenBlacklistRepository } from '../infrastructure/persistence/postgres/PostgresTokenBlacklistRepository.js'
import { PostgresUserRepository } from '../infrastructure/persistence/postgres/PostgresUserRepository.js'
import { BcryptPasswordHasher } from '../infrastructure/security/BcryptPasswordHasher.js'
import { JwtTokenProvider } from '../infrastructure/security/JwtTokenProvider.js'
import { AuthController } from '../presentation/http/controllers/AuthController.js'
import { HealthController } from '../presentation/http/controllers/HealthController.js'
import { MetricsController } from '../presentation/http/controllers/MetricsController.js'
import { OpenApiController } from '../presentation/http/controllers/OpenApiController.js'
import { TaskController } from '../presentation/http/controllers/TaskController.js'
import { buildOpenApiDocument } from '../presentation/http/openapi/document.js'
import { createAuthenticate } from '../presentation/http/middleware/authenticate.js'
import { createCorrelationId } from '../presentation/http/middleware/correlationId.js'
import { createErrorHandler, notFound } from '../presentation/http/middleware/errorHandler.js'
import { createRequestLogger } from '../presentation/http/middleware/requestLogger.js'
import { createAuthRouter } from '../presentation/http/routes/authRoutes.js'
import { createHealthRouter } from '../presentation/http/routes/healthRoutes.js'
import { createTaskRouter } from '../presentation/http/routes/taskRoutes.js'

export interface ContainerOverrides {
  readonly config?: Config
  readonly logger?: Logger
  readonly clock?: Clock
  readonly db?: PostgresConnection
  readonly requestContext?: RequestContext
}

export interface Container {
  readonly config: Config
  readonly logger: Logger
  readonly requestContext: RequestContext
  readonly db: PostgresConnection
  readonly authRouter: Router
  readonly taskRouter: Router
  readonly healthRouter: Router
  readonly authenticate: RequestHandler
  readonly correlationId: RequestHandler
  readonly requestLogger: RequestHandler
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
  const requestContext = overrides.requestContext ?? new AsyncLocalRequestContext()
  // Decorated once, here, so every consumer below gets correlation IDs for
  // free - including the ones that were written before the feature existed
  // and ask for nothing but a `Logger`.
  const logger = new CorrelatingLogger(
    overrides.logger ?? createDefaultLogger(config),
    requestContext
  )
  const clock = overrides.clock ?? new SystemClock()
  const db = overrides.db ?? new PostgresConnection(config.database, logger)

  // Infrastructure
  const users = new PostgresUserRepository(db)
  const tasks = new PostgresTaskRepository(db)
  const tokenBlacklist = new PostgresTokenBlacklistRepository(db)
  const refreshTokenStore = new PostgresRefreshTokenRepository(db)
  const passwordHasher = new BcryptPasswordHasher()
  const passwordPolicy = selectPasswordPolicy(config)
  const tokenProvider = new JwtTokenProvider({
    secret: config.jwt.secret,
    expiresIn: config.jwt.expiresIn,
  })
  const events = new InMemoryEventBus(logger)
  // Owns its own prom-client Registry, so building a second container does
  // not collide on duplicate metric names the way a module-level registry
  // would (see PrometheusMetricsRegistry).
  const metrics = new PrometheusMetricsRegistry()

  // Application
  const tokenService = new TokenService(tokenProvider, tokenBlacklist, clock, logger, {
    maxAgeSeconds: parseDurationToSeconds(config.jwt.expiresIn),
  })
  const refreshTokenService = new RefreshTokenService(
    refreshTokenStore,
    config.jwt.refreshSecret,
    config.jwt.refreshExpiresIn,
    clock,
    logger
  )
  const authService = new AuthService(
    users,
    passwordHasher,
    tokenService,
    refreshTokenService,
    events,
    clock,
    passwordPolicy
  )
  const taskService = new TaskService(tasks, events, clock)
  const healthService = new HealthService(db, clock, logger)

  // Subscribers: side effects attach themselves to events here, rather than
  // services calling them. Nothing above needs to know they exist.
  new AuditLogSubscriber(logger).register(events)
  new MetricsSubscriber(metrics).register(events)

  // Presentation
  const authenticate = createAuthenticate(tokenService, logger)
  const correlationId = createCorrelationId(requestContext)
  const requestLogger = createRequestLogger(logger, metrics)
  const authRouter = createAuthRouter({
    controller: new AuthController(authService),
    authenticate,
    passwordPolicy,
    rateLimit: { windowMs: config.rateLimit.authWindowMs, max: config.rateLimit.authMax },
  })
  const taskRouter = createTaskRouter({
    controller: new TaskController(taskService),
    authenticate,
  })
  const healthRouter = createHealthRouter({
    health: new HealthController(healthService),
    metrics: new MetricsController(metrics, db, { key: config.metrics.key }, logger),
    // Built from the same policy instance the router and service enforce, so
    // the documented password rule is necessarily the one in force.
    openApi: new OpenApiController(buildOpenApiDocument(passwordPolicy)),
  })

  const errorHandler = createErrorHandler(logger, {
    includeStack: config.env === 'development',
    hideInternalErrors: config.env === 'production',
  })

  return {
    config,
    logger,
    requestContext,
    db,
    authRouter,
    taskRouter,
    healthRouter,
    authenticate,
    correlationId,
    requestLogger,
    errorHandler,
    notFound,
  }
}

/**
 * The Strategy selection: one switch, in the one place that is allowed to
 * choose implementations. Adding a policy means a new class in
 * `domain/policies/` and one more case here - no route, controller, or
 * service changes, which is the property the pattern is bought for.
 */
function selectPasswordPolicy(config: Config): PasswordPolicy {
  switch (config.password.policy) {
    case 'strong':
      return new StrongPasswordPolicy()
    case 'length':
      return new LengthPasswordPolicy()
  }
}

/**
 * File transports are skipped under NODE_ENV=test: unit tests build
 * containers freely, and none of them should be creating a logs/ directory
 * or appending to the real log files as a side effect.
 */
export function createDefaultLogger(config: Config): Logger {
  return new WinstonLogger({
    level: config.log.level,
    enableFileTransports: config.env !== 'test',
  })
}
