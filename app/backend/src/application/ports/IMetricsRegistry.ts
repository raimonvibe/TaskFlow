import type { AuthAttemptType } from '../../domain/events/AuthEvents.js'
import type { TaskStatusValue } from '../../domain/value-objects/TaskStatus.js'

/**
 * Metrics port. Narrow on purpose: it exposes the handful of measurements
 * the application actually records, not a general-purpose Prometheus API.
 * The point is that `MetricsSubscriber` can be unit-tested by counting
 * calls on a plain object, with no prom-client registry involved and no
 * global metric state leaking between test files.
 *
 * The task methods are named for what happened rather than for what the
 * metric does (no `increment`/`decrement`), so the fact that
 * `tasks_by_status` is a gauge and needs a matching decrement for every
 * increment stays inside `PrometheusMetricsRegistry` (infrastructure/) -
 * which is where a change of metric type should be absorbable without
 * anything above noticing.
 */
export interface MetricsRegistry {
  recordAuthAttempt(type: AuthAttemptType, status: 'success' | 'failure'): void

  recordTaskCreated(status: TaskStatusValue): void

  /** Called for every update; the two statuses being equal means the update
   * did not move the task between buckets. */
  recordTaskStatusChanged(previous: TaskStatusValue, current: TaskStatusValue): void

  recordTaskDeleted(status: TaskStatusValue): void
}
