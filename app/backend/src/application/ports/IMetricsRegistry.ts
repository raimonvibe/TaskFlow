import type { AuthAttemptType } from '../../domain/events/AuthEvents.js'

/**
 * Metrics port. Narrow on purpose: it exposes the handful of measurements
 * the application actually records, not a general-purpose Prometheus API.
 * The point is that `MetricsSubscriber` can be unit-tested by counting
 * calls on a plain object, with no prom-client registry involved and no
 * global metric state leaking between test files.
 *
 * `PrometheusMetricsRegistry` (infrastructure/) implements this over the
 * existing counters in utils/metrics.js, so the exported metric names and
 * label values on /metrics do not change.
 */
export interface MetricsRegistry {
  recordAuthAttempt(type: AuthAttemptType, status: 'success' | 'failure'): void
}
