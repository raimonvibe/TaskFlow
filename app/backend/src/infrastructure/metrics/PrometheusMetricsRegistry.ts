import promClient from 'prom-client'
import type { PoolStats } from '../../application/ports/IDatabaseHealth.js'
import type { HttpMetrics, HttpRequestSample } from '../../application/ports/IHttpMetrics.js'
import type { MetricsExporter } from '../../application/ports/IMetricsExporter.js'
import type { MetricsRegistry } from '../../application/ports/IMetricsRegistry.js'
import type { AuthAttemptType } from '../../domain/events/AuthEvents.js'
import type { TaskStatusValue } from '../../domain/value-objects/TaskStatus.js'

/**
 * Every metric the app exposes, and the only file that imports prom-client.
 *
 * Replaces `utils/metrics.js`, which built its Registry and its instruments
 * at import time and handed them out as module-level singletons for
 * controllers and middleware to poke directly. The names, help strings,
 * label names, and histogram buckets are copied across unchanged, so
 * `/metrics` exposes exactly the series it always has and the Grafana
 * dashboards keep working.
 *
 * Two things are different, and both come from this being a constructed
 * object rather than a module:
 *
 *  - Instruments are registered *only* into this instance's Registry
 *    (`registers: [registry]`). prom-client otherwise adds every new
 *    instrument to its global default registry as well, where a second
 *    instance would collide on the duplicate name. Being able to build two
 *    independent registries in one process is what lets the two /metrics
 *    gating tests run as ordinary test files instead of having to reason
 *    about tearing down a shared Registry.
 *  - Nothing above this file knows what a gauge, a counter, or a histogram
 *    is. The ports speak in things that happened; the inc/dec/observe
 *    arithmetic - including the pairing a gauge needs to stay consistent -
 *    is all here.
 */
export class PrometheusMetricsRegistry implements MetricsRegistry, HttpMetrics, MetricsExporter {
  private readonly registry: promClient.Registry

  private readonly httpRequestDuration: promClient.Histogram<string>
  private readonly httpRequestTotal: promClient.Counter<string>
  private readonly activeConnections: promClient.Gauge<string>
  private readonly databaseConnections: promClient.Gauge<string>
  private readonly tasksByStatus: promClient.Gauge<string>
  private readonly authAttempts: promClient.Counter<string>

  constructor() {
    this.registry = new promClient.Registry()
    promClient.collectDefaultMetrics({ register: this.registry })

    const registers = [this.registry]

    this.httpRequestDuration = new promClient.Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
      registers,
    })

    this.httpRequestTotal = new promClient.Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      registers,
    })

    this.activeConnections = new promClient.Gauge({
      name: 'active_connections',
      help: 'Number of active connections',
      registers,
    })

    this.databaseConnections = new promClient.Gauge({
      name: 'database_connections',
      help: 'Number of database connections',
      labelNames: ['state'],
      registers,
    })

    this.tasksByStatus = new promClient.Gauge({
      name: 'tasks_by_status',
      help: 'Number of tasks by status',
      labelNames: ['status'],
      registers,
    })

    this.authAttempts = new promClient.Counter({
      name: 'auth_attempts_total',
      help: 'Total number of authentication attempts',
      labelNames: ['type', 'status'],
      registers,
    })
  }

  get contentType(): string {
    return this.registry.contentType
  }

  async scrape(): Promise<string> {
    return this.registry.metrics()
  }

  recordAuthAttempt(type: AuthAttemptType, status: 'success' | 'failure'): void {
    this.authAttempts.inc({ type, status })
  }

  recordTaskCreated(status: TaskStatusValue): void {
    this.tasksByStatus.inc({ status })
  }

  recordTaskStatusChanged(previous: TaskStatusValue, current: TaskStatusValue): void {
    // An update that left the status alone must not move the gauge - the
    // same condition taskController.js checked inline before calling
    // dec/inc.
    if (previous === current) return

    this.tasksByStatus.dec({ status: previous })
    this.tasksByStatus.inc({ status: current })
  }

  recordTaskDeleted(status: TaskStatusValue): void {
    this.tasksByStatus.dec({ status })
  }

  requestStarted(): void {
    this.activeConnections.inc()
  }

  requestCompleted(sample: HttpRequestSample): void {
    const labels = {
      method: sample.method,
      route: sample.route,
      status_code: String(sample.statusCode),
    }

    this.httpRequestDuration.observe(labels, sample.durationSeconds)
    this.httpRequestTotal.inc(labels)
    this.activeConnections.dec()
  }

  recordDatabasePool(stats: PoolStats): void {
    this.databaseConnections.set({ state: 'total' }, stats.total)
    this.databaseConnections.set({ state: 'idle' }, stats.idle)
    this.databaseConnections.set({ state: 'waiting' }, stats.waiting)
  }
}
