export interface HttpRequestSample {
  readonly method: string
  readonly route: string
  readonly statusCode: number
  readonly durationSeconds: number
}

/**
 * The per-request measurements `requestLogger` records.
 *
 * Kept separate from `MetricsRegistry` (which covers the auth and task
 * measurements the domain events produce) because the two have different
 * callers and different test doubles: a subscriber test should not have to
 * stub out HTTP timing to assert that a login was counted.
 * `PrometheusMetricsRegistry` implements both.
 */
export interface HttpMetrics {
  /** A request has arrived and has not finished yet. */
  requestStarted(): void

  requestCompleted(sample: HttpRequestSample): void
}
