import type { Express } from 'express'
import { createContainer, type Container } from '../../composition/container.js'
import { createApp } from '../../presentation/http/app.js'

/**
 * The application the integration tests exercise, built the same way
 * main.ts builds the real one - same container, same middleware stack, same
 * routes. That sameness is the point: these tests are the evidence that the
 * rewrite did not change observable behavior, which they can only provide
 * if they run what production runs.
 *
 * Built once per test file (Vitest gives each file its own module registry)
 * and shared within it, so a file gets one database pool rather than one
 * per test. Files that need to control configuration - the two /metrics
 * gating tests - set the environment variable and then `await import()`
 * this module, since the container reads config as it is constructed here.
 */
let container: Container | undefined
let app: Express | undefined

export function getTestContainer(): Container {
  if (!container) {
    container = createContainer()
  }
  return container
}

export function getTestApp(): Express {
  if (!app) {
    app = createApp(getTestContainer())
  }
  return app
}

export default getTestApp()
