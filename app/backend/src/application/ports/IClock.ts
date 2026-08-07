/**
 * Abstraction over "what time is it right now." Services should depend on
 * this instead of calling `new Date()`/`Date.now()` directly, so tests can
 * inject a fixed point in time instead of racing the real clock - useful
 * for anything touching token expiry, token-age checks (the 7-day
 * `tokenAge` rule, now in `TokenService`), or the token_blacklist's
 * `expires_at`.
 */
export interface Clock {
  now(): Date
}
