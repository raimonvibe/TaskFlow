import type { MetricsRegistry } from '../../application/ports/IMetricsRegistry.js'
import type { AuthAttemptType } from '../../domain/events/AuthEvents.js'
import type { TaskStatusValue } from '../../domain/value-objects/TaskStatus.js'

/** The slices of prom-client's Counter and Gauge this adapter needs.
 * Structural, so the existing metrics from utils/metrics.js satisfy them
 * as-is without that (still JavaScript) module being typed. */
export interface AuthAttemptsCounter {
  inc(labels: Record<string, string>): void
}

export interface TasksByStatusGauge {
  inc(labels: Record<string, string>): void
  dec(labels: Record<string, string>): void
}

export interface PrometheusMetrics {
  readonly authAttempts: AuthAttemptsCounter
  readonly tasksByStatus: TasksByStatusGauge
}

/**
 * `MetricsRegistry` implementation over the prom-client metrics that
 * already exist in utils/metrics.js.
 *
 * Deliberately wraps the existing instruments rather than declaring its
 * own: prom-client's default registry rejects a duplicate metric name, and
 * `/metrics` must keep exposing exactly one `auth_attempts_total` and one
 * `tasks_by_status` with the same labels they expose today - Grafana
 * dashboards and the metrics tests both depend on those names.
 *
 * This is also where "gauge" as an implementation detail stops. The port
 * above speaks in events that happened; the inc/dec pairing that keeps a
 * gauge consistent is arithmetic only this file performs.
 */
export class PrometheusMetricsRegistry implements MetricsRegistry {
  constructor(private readonly metrics: PrometheusMetrics) {}

  recordAuthAttempt(type: AuthAttemptType, status: 'success' | 'failure'): void {
    this.metrics.authAttempts.inc({ type, status })
  }

  recordTaskCreated(status: TaskStatusValue): void {
    this.metrics.tasksByStatus.inc({ status })
  }

  recordTaskStatusChanged(previous: TaskStatusValue, current: TaskStatusValue): void {
    // An update that left the status alone must not move the gauge - the
    // same condition taskController.js checks inline today before calling
    // dec/inc.
    if (previous === current) return

    this.metrics.tasksByStatus.dec({ status: previous })
    this.metrics.tasksByStatus.inc({ status: current })
  }

  recordTaskDeleted(status: TaskStatusValue): void {
    this.metrics.tasksByStatus.dec({ status })
  }
}
