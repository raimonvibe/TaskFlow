# Grafana Dashboards for TaskFlow

Pre-configured Grafana dashboards for visualizing TaskFlow metrics.

## Overview

This directory contains:
- `grafana.ini` - Grafana configuration
- `provisioning/datasources/` - Auto-configured Prometheus datasource
- `provisioning/dashboards/` - Dashboard provisioning config
- `dashboards/` - Pre-built JSON dashboards

## Quick Start

### With Docker Compose

Grafana is already configured in `docker-compose.yml`:

```bash
# Start all services
docker-compose up -d

# Access Grafana
open http://localhost:3001

# Default credentials
Username: admin
Password: admin
```

**Important**: Change the default password on first login!

## Available Dashboards

### 1. Application Metrics
**File**: `dashboards/application-dashboard.json`

Monitors application performance:
- **Request Rate** - HTTP requests per second by endpoint
- **Error Rate** - 5xx errors by endpoint
- **Response Time (P95)** - 95th percentile latency
- **Active Connections** - Current active connections

**Use Cases**:
- Monitor API performance
- Detect performance degradation
- Identify slow endpoints
- Track traffic patterns

### 2. Infrastructure Metrics
**File**: `dashboards/infrastructure-dashboard.json`

Monitors system resources:
- **CPU Usage** - Process CPU utilization
- **Memory Usage** - Process memory consumption
- **Database Connections** - Connection pool status
- **System Load** - 1m, 5m, 15m load averages

**Use Cases**:
- Resource capacity planning
- Detect resource exhaustion
- Monitor database health
- Identify bottlenecks

### 3. Business Metrics
**File**: `dashboards/business-metrics-dashboard.json`

Monitors business KPIs:
- **Tasks by Status** - Distribution of todo/in_progress/completed
- **Task Creation Rate** - Tasks created per minute
- **Authentication Success Rate** - Login success percentage
- **Active Users** - Current active user count

**Use Cases**:
- Track user engagement
- Monitor feature usage
- Identify usage patterns
- Business reporting

### 4. Kubernetes Metrics (when applicable)
**File**: `dashboards/kubernetes-dashboard.json`

Monitors Kubernetes cluster:
- Pod status and restarts
- Resource usage by namespace
- Node capacity and health
- Persistent volume usage

### 5. Database Metrics (when applicable)
**File**: `dashboards/database-dashboard.json`

Monitors PostgreSQL:
- Connection count and pool usage
- Query performance and slow queries
- Cache hit ratio
- Transaction rates

## Dashboard Features

### Time Range Controls
- Last 5 minutes
- Last 15 minutes
- Last 1 hour (default)
- Last 6 hours
- Last 24 hours
- Custom range

### Auto-Refresh
Dashboards auto-refresh every 10-30 seconds to show real-time data.

### Variables
Some dashboards include variables for filtering:
- `$namespace` - Kubernetes namespace
- `$pod` - Pod name
- `$instance` - Server instance

### Annotations
Dashboards can show:
- Deployments
- Alerts fired
- Configuration changes

## Creating Custom Dashboards

### Option 1: Via UI

1. Go to http://localhost:3001
2. Click "+" → "Dashboard"
3. Click "Add new panel"
4. Enter PromQL query
5. Configure visualization
6. Save dashboard

### Option 2: Export/Import

1. Create dashboard in UI
2. Dashboard Settings → JSON Model
3. Copy JSON
4. Save to `dashboards/my-dashboard.json`
5. Restart Grafana to auto-load

### Option 3: Code

Create a JSON file in `dashboards/`:

```json
{
  "dashboard": {
    "title": "My Dashboard",
    "panels": [
      {
        "title": "My Panel",
        "type": "graph",
        "targets": [
          {
            "expr": "my_metric",
            "legendFormat": "{{label}}"
          }
        ]
      }
    ]
  }
}
```

## Useful PromQL Queries

### Application Performance

```promql
# Request rate
sum(rate(http_requests_total[5m])) by (route)

# Error percentage
100 * sum(rate(http_requests_total{status_code=~"5.."}[5m]))
    / sum(rate(http_requests_total[5m]))

# P95 latency
histogram_quantile(0.95,
  sum(rate(http_request_duration_seconds_bucket[5m])) by (le)
)
```

### Resource Usage

```promql
# CPU usage percentage
rate(process_cpu_seconds_total[5m]) * 100

# Memory in MB
process_resident_memory_bytes / 1024 / 1024

# Connection pool usage
database_connections{state="active"}
  / database_connections{state="total"}
```

### Business Metrics

```promql
# Tasks created in last hour
increase(tasks_created_total[1h])

# Task completion rate
rate(tasks_completed_total[5m])

# Active users (approximate)
count(active_connections > 0)
```

## Panel Types

### Graph
Time-series line charts. Best for:
- Request rates
- Response times
- Resource usage over time

### Stat
Single value with sparkline. Best for:
- Current active users
- Total requests today
- Error count

### Gauge
Visual gauge indicator. Best for:
- CPU percentage
- Disk space
- Connection pool usage

### Bar Chart
Compare values. Best for:
- Requests by endpoint
- Errors by type

### Pie Chart
Show proportions. Best for:
- Tasks by status
- Traffic by route

### Heatmap
Show distribution. Best for:
- Response time distribution
- Request patterns

### Table
Tabular data. Best for:
- Top endpoints
- Slow queries
- Alert history

## Alerting in Grafana

### Configure Alerts

1. Edit panel
2. Click "Alert" tab
3. Create alert rule:
   ```
   WHEN avg() OF query(A, 5m, now) IS ABOVE 100
   THEN
     Send notification
   ```

### Notification Channels

Configure in Configuration → Notification channels:
- Email
- Slack
- PagerDuty
- Discord
- Webhook

### Alert States

- **OK** - Everything normal
- **Pending** - Condition met, waiting for duration
- **Alerting** - Alert firing
- **No Data** - No metrics received

## Best Practices

### Dashboard Organization

1. **Group related metrics** - Keep related panels together
2. **Use folders** - Organize dashboards by team/service
3. **Consistent naming** - Use clear, descriptive names
4. **Add descriptions** - Explain what each panel shows
5. **Set appropriate time ranges** - Match data granularity

### Performance

1. **Limit time range** - Don't query months of data
2. **Use recording rules** - Pre-calculate complex queries
3. **Avoid high-cardinality queries** - Don't use user IDs in labels
4. **Set reasonable refresh intervals** - 10s for dashboards, 1m for summaries

### Visual Design

1. **Color scheme** - Use consistent colors for similar metrics
2. **Units** - Always specify units (seconds, bytes, etc.)
3. **Thresholds** - Mark warning/critical levels
4. **Legends** - Use meaningful legend formats
5. **Grid layout** - Align panels neatly

## Troubleshooting

### Dashboard Not Loading

```bash
# Check Grafana logs
docker-compose logs grafana

# Verify Grafana is running
curl http://localhost:3001/api/health
```

### No Data in Panels

1. Check Prometheus is scraping metrics
2. Verify datasource connection (Configuration → Data Sources)
3. Test query in Prometheus UI first
4. Check time range

### Slow Dashboards

1. Reduce time range
2. Increase refresh interval
3. Simplify queries
4. Use recording rules for complex queries

## Backup and Restore

### Export Dashboard

1. Dashboard Settings → JSON Model
2. Copy JSON
3. Save to file

### Import Dashboard

1. Create → Import
2. Upload JSON file or paste JSON
3. Select datasource
4. Import

### Backup All

```bash
# Export all dashboards
curl -H "Authorization: Bearer YOUR_API_KEY" \
  http://localhost:3001/api/search?query=& > dashboards.json
```

## Plugins

### Install Plugins

Add to `docker-compose.yml`:

```yaml
environment:
  GF_INSTALL_PLUGINS: grafana-piechart-panel,grafana-clock-panel
```

### Useful Plugins

- **Pie Chart** - Better pie charts
- **Clock** - Show current time
- **Worldmap** - Geographic data
- **Flowcharting** - Diagram visualization

## Resources

- [Grafana Documentation](https://grafana.com/docs/)
- [Dashboard Best Practices](https://grafana.com/docs/grafana/latest/best-practices/best-practices-for-creating-dashboards/)
- [PromQL for Grafana](https://prometheus.io/docs/prometheus/latest/querying/basics/)
- [Community Dashboards](https://grafana.com/grafana/dashboards/)

## License

MIT
