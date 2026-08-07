/**
 * Ambient per-request state - the things every log line wants and no
 * function signature should have to carry.
 *
 * Threading a correlation ID down through `AuthService.login` into
 * `PostgresUserRepository.findByEmail` would put an HTTP concern into the
 * signature of code that has nothing to do with HTTP, and every future
 * caller would have to keep passing it. This port keeps it ambient instead:
 * the presentation layer opens a scope per request, and anything running
 * inside that scope can ask for the ID without being handed it.
 *
 * It is a port rather than a plain module because the only sane
 * implementation is Node's `AsyncLocalStorage`, and `node:async_hooks` is
 * exactly the kind of import the application layer is not allowed to make.
 */
export interface RequestContext {
  /**
   * Runs `fn` with `correlationId` in scope, including anything async that
   * `fn` starts. Returns whatever `fn` returns.
   */
  run<T>(correlationId: string, fn: () => T): T

  /**
   * Undefined outside a request. Startup, the database scripts, and the
   * shutdown handler all log without one, which is correct - inventing an
   * ID for them would imply a request that never existed.
   */
  getCorrelationId(): string | undefined
}
