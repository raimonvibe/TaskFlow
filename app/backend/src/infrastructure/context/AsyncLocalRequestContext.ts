import { AsyncLocalStorage } from 'node:async_hooks'
import type { RequestContext } from '../../application/ports/IRequestContext.js'

/**
 * `RequestContext` backed by Node's `AsyncLocalStorage`, which is what makes
 * the ID survive every `await` in a request without being passed along.
 *
 * The store propagates to promises, timers, and callbacks created inside
 * `run`, so a repository three awaits deep still sees it. It deliberately
 * does *not* propagate to work that outlives the request - a `setInterval`
 * registered at startup has no correlation ID, and should not borrow one
 * from whichever request happened to be in flight.
 *
 * One instance per container, so two applications in the same process keep
 * separate stores.
 */
export class AsyncLocalRequestContext implements RequestContext {
  private readonly storage = new AsyncLocalStorage<string>()

  run<T>(correlationId: string, fn: () => T): T {
    return this.storage.run(correlationId, fn)
  }

  getCorrelationId(): string | undefined {
    return this.storage.getStore()
  }
}
