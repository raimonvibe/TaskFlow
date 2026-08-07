import { describe, it, expect } from 'vitest'
import { PrometheusMetricsRegistry } from './PrometheusMetricsRegistry.js'

/** Pulls the value of a single sample out of the exposition text. */
function sample(scrape: string, series: string): number | undefined {
  const match = scrape.split('\n').find(line => line.startsWith(series))
  return match ? Number(match.slice(match.lastIndexOf(' ') + 1)) : undefined
}

describe('PrometheusMetricsRegistry', () => {
  it('can be constructed more than once in a process', () => {
    // prom-client rejects duplicate metric names on a shared registry, and
    // its default is to register everything globally. Two containers in one
    // test run is normal, so this must not throw.
    expect(() => {
      new PrometheusMetricsRegistry()
      new PrometheusMetricsRegistry()
    }).not.toThrow()
  })

  it('exposes the series the dashboards read, even before anything is recorded', async () => {
    const scrape = await new PrometheusMetricsRegistry().scrape()

    for (const series of [
      'http_request_duration_seconds',
      'http_requests_total',
      'active_connections',
      'database_connections',
      'tasks_by_status',
      'auth_attempts_total',
    ]) {
      expect(scrape).toContain(series)
    }
  })

  it('includes the default process metrics', async () => {
    const scrape = await new PrometheusMetricsRegistry().scrape()

    expect(scrape).toContain('process_cpu_user_seconds_total')
  })

  it('counts auth attempts by type and outcome', async () => {
    const metrics = new PrometheusMetricsRegistry()

    metrics.recordAuthAttempt('login', 'failure')
    metrics.recordAuthAttempt('login', 'failure')
    metrics.recordAuthAttempt('login', 'success')

    const scrape = await metrics.scrape()
    expect(sample(scrape, 'auth_attempts_total{type="login",status="failure"}')).toBe(2)
    expect(sample(scrape, 'auth_attempts_total{type="login",status="success"}')).toBe(1)
  })

  it('moves a task between status gauges when its status changes', async () => {
    const metrics = new PrometheusMetricsRegistry()

    metrics.recordTaskCreated('todo')
    metrics.recordTaskStatusChanged('todo', 'completed')

    const scrape = await metrics.scrape()
    expect(sample(scrape, 'tasks_by_status{status="todo"}')).toBe(0)
    expect(sample(scrape, 'tasks_by_status{status="completed"}')).toBe(1)
  })

  it('leaves the status gauges alone when an update did not change the status', async () => {
    const metrics = new PrometheusMetricsRegistry()

    metrics.recordTaskCreated('todo')
    // Editing a title is still an update; double-counting it here would
    // drift the gauge a little further from reality on every edit.
    metrics.recordTaskStatusChanged('todo', 'todo')

    expect(sample(await metrics.scrape(), 'tasks_by_status{status="todo"}')).toBe(1)
  })

  it('decrements the status gauge when a task is deleted', async () => {
    const metrics = new PrometheusMetricsRegistry()

    metrics.recordTaskCreated('in_progress')
    metrics.recordTaskDeleted('in_progress')

    expect(sample(await metrics.scrape(), 'tasks_by_status{status="in_progress"}')).toBe(0)
  })

  it('tracks in-flight requests and records completed ones', async () => {
    const metrics = new PrometheusMetricsRegistry()

    metrics.requestStarted()
    metrics.requestStarted()
    expect(sample(await metrics.scrape(), 'active_connections')).toBe(2)

    metrics.requestCompleted({
      method: 'GET',
      route: '/api/tasks',
      statusCode: 200,
      durationSeconds: 0.25,
    })

    const scrape = await metrics.scrape()
    expect(sample(scrape, 'active_connections')).toBe(1)
    expect(
      sample(scrape, 'http_requests_total{method="GET",route="/api/tasks",status_code="200"}')
    ).toBe(1)
    expect(
      sample(
        scrape,
        'http_request_duration_seconds_sum{method="GET",route="/api/tasks",status_code="200"}'
      )
    ).toBe(0.25)
  })

  it('publishes pool counters under one gauge split by state', async () => {
    const metrics = new PrometheusMetricsRegistry()

    metrics.recordDatabasePool({ total: 7, idle: 5, waiting: 2 })

    const scrape = await metrics.scrape()
    expect(sample(scrape, 'database_connections{state="total"}')).toBe(7)
    expect(sample(scrape, 'database_connections{state="idle"}')).toBe(5)
    expect(sample(scrape, 'database_connections{state="waiting"}')).toBe(2)
  })

  it('reports the exposition content type Prometheus expects', () => {
    expect(new PrometheusMetricsRegistry().contentType).toContain('text/plain')
  })
})
