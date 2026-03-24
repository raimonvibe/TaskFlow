# Prometheus Monitoring for TaskFlow

Prometheus configuration for monitoring the TaskFlow application and infrastructure.

## Overview

This directory contains:
- `prometheus.yml` - Main Prometheus configuration
- `alerts/rules.yml` - Alert rules for various scenarios

## Features

### Metrics Collected

1. **Application Metrics** (from backend /metrics endpoint)
   - HTTP request duration (histogram)
   - HTTP request total (counter)
   - Active connections (gauge)
   - Database connections by state (gauge)
   - Tasks by status (gauge)
   - Authentication attempts by status (counter)

2. **System Metrics** (when using node_exporter)
   - CPU usage
   - Memory usage
   - Disk space
   - Network I/O

3. **Database Metrics** (when using postgres_exporter)
   - Connection pool usage
   - Query performance
   - Slow queries
   - Transaction rates

4. **Kubernetes Metrics** (when running on K8s)
   - Pod status and restarts
   - Resource usage
   - Node health

## Quick Start

### With Docker Compose

Prometheus is already configured in `docker-compose.yml`:

```bash
# Start all services including Prometheus
docker-compose up -d

# Access Prometheus UI
open http://localhost:9090
```

### Verify Metrics Collection

1. Go to http://localhost:9090
2. Status → Targets
3. Verify all targets are "UP"
4. Query some metrics:
   ```promql
   # HTTP request rate
   rate(http_requests_total[5m])

   # Error rate
   rate(http_requests_total{status_code=~"5.."}[5m])

   # Active connections
   active_connections

   # Tasks by status
   tasks_by_status
   ```

## Alert Rules

### Categories

1. **Application Health**
   - ServiceDown - Service is unreachable
   - HighErrorRate - Error rate > 5%
   - HighResponseTime - P95 latency > 1s

2. **Resource Usage**
   - HighCPUUsage - CPU > 80%
   - HighMemoryUsage - Memory > 90%
   - DiskSpaceLow - Disk space < 10%

3. **Database**
   - HighDatabaseConnections - > 80% of pool used
   - SlowQueries - High rate of slow queries

4. **Application-Specific**
   - HighTaskCreationRate - Unusual activity
   - AuthenticationFailures - Possible attack
   - ActiveConnectionsHigh - High load

5. **Security**
   - CertificateExpiringSoon - < 7 days
   - CertificateExpired - Certificate invalid

6. **Kubernetes** (when applicable)
   - PodCrashLooping - Pod restarting
   - PodNotReady - Pod not in Running state
   - NodeNotReady - Node unavailable
   - HighPodCPU/Memory - Resource limits exceeded

### Alert Severities

- **critical** - Immediate action required
- **warning** - Investigation needed soon
- **info** - Informational, no action needed

## Configuration

### Adding New Scrape Targets

Edit `prometheus.yml`:

```yaml
scrape_configs:
  - job_name: 'my-service'
    static_configs:
      - targets: ['my-service:9090']
        labels:
          service: 'my-service'
```

### Kubernetes Service Discovery

For automatic discovery of pods in Kubernetes:

```yaml
scrape_configs:
  - job_name: 'kubernetes-pods'
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: true
```

Then annotate your pods:

```yaml
metadata:
  annotations:
    prometheus.io/scrape: "true"
    prometheus.io/port: "3000"
    prometheus.io/path: "/metrics"
```

### Adding Alert Rules

Create new rules in `alerts/custom-rules.yml`:

```yaml
groups:
  - name: my_alerts
    interval: 30s
    rules:
      - alert: MyAlert
        expr: my_metric > 100
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "My alert fired"
          description: "Value is {{ $value }}"
```

Then add to `prometheus.yml`:

```yaml
rule_files:
  - '/etc/prometheus/alerts/*.yml'
```

## Useful Queries

### Application Performance

```promql
# Request rate by endpoint
sum(rate(http_requests_total[5m])) by (route)

# Average response time
rate(http_request_duration_seconds_sum[5m])
/
rate(http_request_duration_seconds_count[5m])

# P95 response time
histogram_quantile(0.95,
  sum(rate(http_request_duration_seconds_bucket[5m])) by (le)
)

# Error rate percentage
100 * (
  sum(rate(http_requests_total{status_code=~"5.."}[5m]))
  /
  sum(rate(http_requests_total[5m]))
)
```

### Resource Usage

```promql
# CPU usage
rate(process_cpu_seconds_total[5m])

# Memory usage
process_resident_memory_bytes / 1024 / 1024  # MB

# Active connections
active_connections
```

### Business Metrics

```promql
# Tasks created per minute
rate(tasks_created_total[1m]) * 60

# Tasks by status
tasks_by_status

# Authentication success rate
sum(rate(auth_attempts_total{status="success"}[5m]))
/
sum(rate(auth_attempts_total[5m]))
```

### Database

```promql
# Connection pool usage
database_connections{state="active"}
/
database_connections{state="total"}

# Query duration
rate(pg_query_duration_seconds_sum[5m])
/
rate(pg_query_duration_seconds_count[5m])
```

## Alertmanager Integration

To send alerts via email, Slack, etc., set up Alertmanager:

1. Add to `docker-compose.yml`:

```yaml
services:
  alertmanager:
    image: prom/alertmanager:latest
    ports:
      - "9093:9093"
    volumes:
      - ./monitoring/alertmanager/config.yml:/etc/alertmanager/config.yml
```

2. Create `alertmanager/config.yml`:

```yaml
route:
  group_by: ['alertname', 'severity']
  receiver: 'slack'

receivers:
  - name: 'slack'
    slack_configs:
      - api_url: 'YOUR_SLACK_WEBHOOK_URL'
        channel: '#alerts'
```

3. Update `prometheus.yml`:

```yaml
alerting:
  alertmanagers:
    - static_configs:
        - targets: ['alertmanager:9093']
```

## Retention and Storage

Default retention: 15 days

To change:

```yaml
# In docker-compose.yml
command:
  - '--storage.tsdb.retention.time=30d'
```

## Performance Tuning

For high-traffic applications:

1. Increase scrape interval:
   ```yaml
   global:
     scrape_interval: 30s
   ```

2. Reduce metric cardinality (avoid high-cardinality labels)

3. Use recording rules for frequently queried expressions

4. Enable remote write for long-term storage

## Troubleshooting

### Targets Down

```bash
# Check Prometheus logs
docker-compose logs prometheus

# Verify target is accessible
curl http://backend:3000/metrics
```

### Missing Metrics

1. Check if target is being scraped: Status → Targets
2. Verify metrics endpoint: curl http://localhost:3000/metrics
3. Check Prometheus logs for errors

### High Memory Usage

- Reduce retention time
- Decrease scrape frequency
- Use recording rules
- Enable metric relabeling to drop unnecessary metrics

## Best Practices

1. **Label Discipline**
   - Use consistent label names
   - Avoid high-cardinality labels (user IDs, timestamps)
   - Use meaningful label values

2. **Metric Naming**
   - Use `_total` suffix for counters
   - Use `_seconds` for durations
   - Use base units (seconds, bytes)

3. **Alert Design**
   - Include runbooks in annotations
   - Set appropriate `for` duration
   - Use meaningful severities
   - Group related alerts

4. **Performance**
   - Use recording rules for complex queries
   - Monitor Prometheus itself
   - Set appropriate retention
   - Use federation for multiple clusters

## Resources

- [Prometheus Documentation](https://prometheus.io/docs/)
- [PromQL Basics](https://prometheus.io/docs/prometheus/latest/querying/basics/)
- [Best Practices](https://prometheus.io/docs/practices/naming/)
- [Exporters](https://prometheus.io/docs/instrumenting/exporters/)

## License

MIT
