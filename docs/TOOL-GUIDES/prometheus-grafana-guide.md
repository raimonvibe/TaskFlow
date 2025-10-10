# Prometheus & Grafana Guide

Monitoring TaskFlow with Prometheus and Grafana.

## Access

- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3001 (admin/admin)

## Prometheus

### Useful Queries

```promql
# HTTP request rate
rate(http_requests_total[5m])

# Task operations by status
task_operations_total{status="success"}

# Authentication attempts
auth_attempts_total{status="failure"}

# CPU usage
100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)

# Memory usage
(node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes * 100

# Response time
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
```

### Viewing Metrics

1. Go to http://localhost:9090
2. Navigate to Graph tab
3. Enter PromQL query
4. Click Execute
5. View table or graph

## Grafana

### Initial Setup

1. Access http://localhost:3001
2. Login: admin/admin
3. Change password (or skip)
4. Datasource already configured (Prometheus)

### View Dashboards

1. Click Dashboards icon
2. Browse available dashboards:
   - Application Dashboard
   - Infrastructure Dashboard
   - Business Metrics Dashboard

### Create Custom Dashboard

1. Click + > Dashboard
2. Add Panel
3. Select metric from dropdown
4. Customize visualization
5. Save dashboard

### Alerts

1. Edit panel
2. Go to Alert tab
3. Set conditions
4. Configure notifications
5. Save

## Common Metrics

TaskFlow exposes these metrics:

- `http_requests_total`: Total HTTP requests
- `auth_attempts_total`: Authentication attempts
- `task_operations_total`: Task CRUD operations
- `http_request_duration_seconds`: Request latency
- `node_*`: System metrics (CPU, memory, disk)

## Troubleshooting

### Prometheus not scraping
```bash
# Check targets
# Go to Prometheus > Status > Targets
# Verify all targets are "UP"

# Check logs
docker-compose logs prometheus
```

### Grafana not showing data
```bash
# Verify datasource
# Grafana > Configuration > Data Sources
# Test datasource connection

# Check time range in dashboard
```

## Resources
- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [PromQL Tutorial](https://prometheus.io/docs/prometheus/latest/querying/basics/)
