import type { MetricsRegistry } from '../../application/ports/IMetricsRegistry.js'
import type { AuthAttemptType } from '../../domain/events/AuthEvents.js'

/** The slice of prom-client's Counter this adapter needs. Structural, so
 * the existing `authAttempts` counter from utils/metrics.js satisfies it
 * as-is without that (still JavaScript) module being typed. */
export interface AuthAttemptsCounter {
  inc(labels: Record<string, string>): void
}

/**
 * `MetricsRegistry` implementation over the prom-client counters that
 * already exist in utils/metrics.js.
 *
 * Deliberately wraps the existing counter rather than declaring its own:
 * prom-client's default registry rejects a duplicate metric name, and
 * `/metrics` must keep exposing exactly one `auth_attempts_total` with the
 * same labels it exposes today - Grafana dashboards and the metrics tests
 * both depend on that name.
 */
export class PrometheusMetricsRegistry implements MetricsRegistry {
  constructor(private readonly authAttempts: AuthAttemptsCounter) {}

  recordAuthAttempt(type: AuthAttemptType, status: 'success' | 'failure'): void {
    this.authAttempts.inc({ type, status })
  }
}
