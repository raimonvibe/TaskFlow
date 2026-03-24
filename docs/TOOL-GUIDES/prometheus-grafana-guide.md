# Prometheus & Grafana Guide - Complete Monitoring Mastery

A comprehensive guide to monitoring TaskFlow with Prometheus and Grafana, from basics to advanced techniques.

## Quick Access

- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3001 (admin/admin)
- **Backend Metrics Endpoint**: http://localhost:3000/metrics

---

## Table of Contents

1. [Prometheus Fundamentals](#prometheus-fundamentals)
2. [Grafana Dashboard Creation](#grafana-dashboard-creation)
3. [Essential PromQL Queries](#essential-promql-queries)
4. [Advanced Monitoring Techniques](#advanced-monitoring-techniques)
5. [Real-World Monitoring Scenarios](#real-world-monitoring-scenarios)
6. [Alerting Best Practices](#alerting-best-practices)
7. [Performance Optimization](#performance-optimization)
8. [Troubleshooting](#troubleshooting)

---

## Prometheus Fundamentals

### Understanding the Metrics Endpoint

Before Prometheus can collect metrics, your application must expose them. TaskFlow's backend exposes metrics at `/metrics`:

```bash
# View raw metrics
curl http://localhost:3000/metrics
```

**Metric Types:**
- **Counter**: Only increases (e.g., `http_requests_total`)
- **Gauge**: Can go up/down (e.g., `active_connections`)
- **Histogram**: Samples observations (e.g., `http_request_duration_seconds`)
- **Summary**: Similar to histogram with quantiles

### Essential PromQL Queries

**Basic Queries:**
```promql
# Current value of a metric
http_requests_total

# Filter by label
http_requests_total{method="POST"}

# Multiple label filters
http_requests_total{method="POST", status_code="200"}

# Regex matching
http_requests_total{status_code=~"5.."} # All 5xx errors
```

**Rate & Increase:**
```promql
# Requests per second over last 5 minutes
rate(http_requests_total[5m])

# Total increase over last hour
increase(http_requests_total[1h])

# Per-second rate by endpoint
sum(rate(http_requests_total[5m])) by (route)
```

**Aggregations:**
```promql
# Total requests across all endpoints
sum(http_requests_total)

# Average memory usage
avg(process_resident_memory_bytes)

# Max response time
max(http_request_duration_seconds)

# Count of active instances
count(up == 1)
```

**Math Operations:**
```promql
# Memory in MB
process_resident_memory_bytes / 1024 / 1024

# Memory percentage
(nodejs_heap_size_used_bytes / nodejs_heap_size_total_bytes) * 100

# Error rate percentage
(sum(rate(http_requests_total{status_code=~"5.."}[5m])) /
 sum(rate(http_requests_total[5m]))) * 100
```

**Advanced Percentiles (P50, P95, P99):**
```promql
# P95 response time
histogram_quantile(0.95,
  sum(rate(http_request_duration_seconds_bucket[5m])) by (le)
)

# P99 response time by endpoint
histogram_quantile(0.99,
  sum(rate(http_request_duration_seconds_bucket[5m])) by (le, route)
)

# P50 (median) response time
histogram_quantile(0.50,
  rate(http_request_duration_seconds_bucket[5m])
)
```

### Prometheus Query Tips

**Time Ranges:**
- `[5m]` = Last 5 minutes
- `[1h]` = Last hour
- `[1d]` = Last day
- `[1w]` = Last week

**Instant vs Range Vectors:**
- Instant: `up` (current value)
- Range: `up[5m]` (values over time)

**Useful Functions:**
```promql
# Round to 2 decimal places
round(process_resident_memory_bytes / 1024 / 1024, 0.01)

# Absolute value
abs(delta(http_requests_total[5m]))

# Sort results
sort_desc(sum(http_requests_total) by (route))
```

---

## Grafana Dashboard Creation

### Builder Mode vs Code Mode

Grafana offers two ways to create queries:

**Builder Mode (Visual):**
- Good for beginners
- Point-and-click interface
- Limited flexibility

**Code Mode (Recommended):**
- Direct PromQL editing
- Full control
- Faster for complex queries

**How to Switch:**
Look for the **"Code"** toggle button in the query editor (usually top-right).

### Step-by-Step: Create Your First Panel

**1. Create a New Dashboard**
- Click **"+"** → **"Dashboard"**
- Click **"Add visualization"**
- Select **"Prometheus"** as data source

**2. Build a Simple Panel (Memory Usage)**
- Switch to **Code mode**
- Enter query:
  ```promql
  process_resident_memory_bytes / 1024 / 1024
  ```
- Set **Panel title**: "Memory Usage (MB)"
- Click **"Apply"**

**3. Customize the Panel**
- **Visualization type**: Time series, Gauge, Stat, Bar chart, etc.
- **Unit**: bytes, percent, requests/sec
- **Legend**: Show/hide, placement
- **Thresholds**: Set warning (yellow) and critical (red) levels

### Essential Dashboard Panels

**Panel 1: Request Rate**
```promql
sum(rate(http_requests_total[5m])) by (route)
```
- **Visualization**: Time series
- **Legend**: `{{route}}`
- **Unit**: requests/sec (ops)
- **Y-axis**: Start from 0

**Panel 2: Response Time Percentiles**
```promql
# P50
histogram_quantile(0.50, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))

# P95
histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))

# P99
histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))
```
- **Visualization**: Time series with multiple queries
- **Unit**: seconds (s)
- **Legend**: P50, P95, P99
- **Thresholds**: Yellow at 1s, Red at 3s

**Panel 3: Error Rate**
```promql
(sum(rate(http_requests_total{status_code=~"5.."}[5m])) /
 sum(rate(http_requests_total[5m]))) * 100
```
- **Visualization**: Stat or Gauge
- **Unit**: percent (0-100)
- **Thresholds**: Green <1%, Yellow 1-5%, Red >5%

**Panel 4: Active Connections**
```promql
active_connections
```
- **Visualization**: Stat with sparkline
- **Color**: By value

**Panel 5: Memory Usage Percentage**
```promql
(nodejs_heap_size_used_bytes / nodejs_heap_size_total_bytes) * 100
```
- **Visualization**: Gauge
- **Unit**: percent (0-100)
- **Thresholds**: Green <70%, Yellow 70-85%, Red >85%

**Panel 6: Event Loop Lag**
```promql
nodejs_eventloop_lag_seconds * 1000
```
- **Visualization**: Time series
- **Unit**: milliseconds (ms)
- **Thresholds**: Green <50ms, Yellow 50-100ms, Red >100ms

**Panel 7: Authentication Success vs Failure**
```promql
sum(rate(auth_attempts_total[5m])) by (status)
```
- **Visualization**: Bar chart or Pie chart
- **Legend**: `{{status}}`

**Panel 8: Garbage Collection Duration**
```promql
rate(nodejs_gc_duration_seconds_sum[5m]) / rate(nodejs_gc_duration_seconds_count[5m])
```
- **Visualization**: Time series
- **Unit**: seconds (s)

**Panel 9: HTTP Status Codes Distribution**
```promql
sum(increase(http_requests_total[1h])) by (status_code)
```
- **Visualization**: Pie chart or Bar gauge
- **Legend**: `{{status_code}}`

**Panel 10: Top 5 Slowest Endpoints**
```promql
topk(5,
  sum(rate(http_request_duration_seconds_sum[5m])) by (route) /
  sum(rate(http_request_duration_seconds_count[5m])) by (route)
)
```
- **Visualization**: Bar chart (horizontal)
- **Unit**: seconds (s)
- **Legend**: `{{route}}`

---

## Advanced Monitoring Techniques

### RED Method (Request, Error, Duration)

Monitor every service using these three golden signals:

**1. Request Rate:**
```promql
sum(rate(http_requests_total[5m]))
```

**2. Error Rate:**
```promql
sum(rate(http_requests_total{status_code=~"5.."}[5m])) /
sum(rate(http_requests_total[5m]))
```

**3. Duration (P99):**
```promql
histogram_quantile(0.99,
  sum(rate(http_request_duration_seconds_bucket[5m])) by (le)
)
```

### USE Method (Utilization, Saturation, Errors)

For resource monitoring:

**1. CPU Utilization:**
```promql
100 - (process_cpu_user_seconds_total + process_cpu_system_seconds_total) /
process_cpu_seconds_total * 100
```

**2. Memory Saturation:**
```promql
nodejs_heap_size_used_bytes / nodejs_heap_size_total_bytes
```

**3. File Descriptor Usage:**
```promql
process_open_fds / process_max_fds
```

### SLO/SLI Monitoring

**Service Level Indicator (SLI): Availability**
```promql
# Uptime percentage over 30 days
avg_over_time(up[30d]) * 100
```

**SLI: Latency (95% of requests < 500ms)**
```promql
histogram_quantile(0.95,
  sum(rate(http_request_duration_seconds_bucket[5m])) by (le)
) < 0.5
```

**Error Budget (99.9% SLO = 0.1% error budget)**
```promql
# Remaining error budget
1 - (
  sum(rate(http_requests_total{status_code=~"5.."}[30d])) /
  sum(rate(http_requests_total[30d]))
) / 0.001
```

### Anomaly Detection

**Detect unusual request patterns:**
```promql
abs(
  rate(http_requests_total[5m]) -
  avg_over_time(rate(http_requests_total[5m])[1h:5m])
) > 3 * stddev_over_time(rate(http_requests_total[5m])[1h:5m])
```

**Detect memory leaks:**
```promql
deriv(process_resident_memory_bytes[1h]) > 0
```

**Detect increasing error rates:**
```promql
delta(rate(http_requests_total{status_code=~"5.."}[5m])[10m:]) > 0
```

---

## Real-World Monitoring Scenarios

### Scenario 1: Application Health Dashboard

Create a single-pane-of-glass dashboard:

**Row 1: Golden Signals**
- Request Rate (last 1h)
- Error Rate (%)
- P95 Latency
- Active Connections

**Row 2: Resource Usage**
- CPU Usage
- Memory Usage (%)
- Heap Usage (%)
- Event Loop Lag

**Row 3: Business Metrics**
- Active Users
- Tasks Created (last 24h)
- Login Success Rate
- API Calls by Endpoint

**Row 4: Infrastructure**
- Container Uptime
- Database Connections
- Redis Hit Rate
- File Descriptors

### Scenario 2: Performance Investigation

When users report slowness:

**1. Check request latency trends:**
```promql
histogram_quantile(0.95,
  sum(rate(http_request_duration_seconds_bucket[5m])) by (le, route)
)
```

**2. Identify slow endpoints:**
```promql
topk(10,
  sum(rate(http_request_duration_seconds_sum[5m])) by (route) /
  sum(rate(http_request_duration_seconds_count[5m])) by (route)
)
```

**3. Check for memory pressure:**
```promql
nodejs_heap_size_used_bytes / nodejs_heap_size_total_bytes > 0.85
```

**4. Verify garbage collection impact:**
```promql
rate(nodejs_gc_duration_seconds_sum{kind="major"}[5m])
```

### Scenario 3: Capacity Planning

**Predict when you'll run out of memory:**
```promql
predict_linear(
  process_resident_memory_bytes[1h],
  86400 # seconds in 24 hours
)
```

**Estimate requests at peak load:**
```promql
max_over_time(
  sum(rate(http_requests_total[5m]))[7d:1h]
)
```

**Calculate average response time trend:**
```promql
avg_over_time(
  histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))[7d:1h]
)
```

### Scenario 4: Security Monitoring

**Failed login attempts spike:**
```promql
rate(auth_attempts_total{status="failure"}[5m]) > 10
```

**Unusual 403 (Forbidden) rate:**
```promql
sum(rate(http_requests_total{status_code="403"}[5m])) > 5
```

**Detect potential DDoS:**
```promql
sum(rate(http_requests_total[1m])) > 1000
```

---

## Alerting Best Practices

### Alert Rule Structure

Good alerts follow this pattern:

```yaml
- alert: HighErrorRate
  expr: |
    (sum(rate(http_requests_total{status_code=~"5.."}[5m])) /
     sum(rate(http_requests_total[5m]))) > 0.05
  for: 5m
  labels:
    severity: warning
    team: backend
  annotations:
    summary: "High error rate detected"
    description: "Error rate is {{ $value | humanizePercentage }}"
```

### Essential Alerts

**1. Service Down**
```promql
up == 0
```
- **For**: 1m
- **Severity**: Critical

**2. High Response Time**
```promql
histogram_quantile(0.95,
  sum(rate(http_request_duration_seconds_bucket[5m])) by (le)
) > 1
```
- **For**: 5m
- **Severity**: Warning

**3. Memory Usage Critical**
```promql
(nodejs_heap_size_used_bytes / nodejs_heap_size_total_bytes) > 0.90
```
- **For**: 2m
- **Severity**: Critical

**4. High Event Loop Lag**
```promql
nodejs_eventloop_lag_seconds > 0.1
```
- **For**: 5m
- **Severity**: Warning

**5. Authentication Failures Spike**
```promql
rate(auth_attempts_total{status="failure"}[5m]) > 5
```
- **For**: 3m
- **Severity**: Warning

### Alert Fatigue Prevention

**Do:**
- Set appropriate thresholds
- Use `for` duration to avoid flapping
- Group related alerts
- Include runbook links in annotations

**Don't:**
- Alert on everything
- Set overly sensitive thresholds
- Create alerts without clear actions
- Ignore alerts (fix the threshold or the problem)

---

## Performance Optimization

### Optimize Query Performance

**Bad (slow):**
```promql
# Queries entire time series
sum(http_requests_total)
```

**Good (fast):**
```promql
# Uses rate with time window
sum(rate(http_requests_total[5m]))
```

**Bad (expensive):**
```promql
# Calculates for every label combination
http_request_duration_seconds
```

**Good (efficient):**
```promql
# Aggregates before calculation
sum(rate(http_request_duration_seconds_sum[5m])) /
sum(rate(http_request_duration_seconds_count[5m]))
```

### Recording Rules

Pre-calculate expensive queries:

```yaml
# prometheus.yml
groups:
  - name: taskflow_rules
    interval: 30s
    rules:
      - record: job:http_request_rate:5m
        expr: sum(rate(http_requests_total[5m])) by (job)

      - record: job:http_error_rate:5m
        expr: |
          sum(rate(http_requests_total{status_code=~"5.."}[5m])) by (job) /
          sum(rate(http_requests_total[5m])) by (job)
```

Then use in dashboards:
```promql
job:http_request_rate:5m{job="taskflow-backend"}
```

### Dashboard Performance Tips

1. **Limit time range**: Use 6h/12h/24h instead of 30d
2. **Reduce panel count**: Max 15-20 panels per dashboard
3. **Use variables**: `$interval` for auto-adjusting ranges
4. **Cache queries**: Set min interval to 30s or 1m
5. **Avoid wildcards**: Use specific label filters

---

## Creative Dashboard Ideas

### 1. Executive Summary Dashboard

**Single stat panels showing:**
- 99.9% Uptime this month
- 1.2M Requests handled today
- 245ms Average response time
- 0.01% Error rate

### 2. Real-Time Activity Map

**Heatmap visualization:**
```promql
sum(rate(http_requests_total[1m])) by (route, status_code)
```
- X-axis: Time
- Y-axis: Endpoint
- Color: Request rate

### 3. Cost Optimization Dashboard

**Track resource costs:**
- CPU usage vs instance cost
- Memory efficiency (used/allocated)
- Request cost (latency × volume)
- Idle resource time

### 4. User Experience Dashboard

**Focus on user-facing metrics:**
- Page Load Time (P95)
- API Response Time by Action
- Error Rate by User Action
- Peak Usage Hours

### 5. DevOps KPI Dashboard

**Team performance metrics:**
- Deployment Frequency
- Mean Time to Recovery (MTTR)
- Change Failure Rate
- Lead Time for Changes

---

## Troubleshooting

### Prometheus Not Scraping

**Check Targets:**
1. Go to http://localhost:9090/targets
2. Look for status: **UP** (green) or **DOWN** (red)

**Common Issues:**

**Issue: Target shows DOWN**
```bash
# Check if service is running
docker ps | grep taskflow-backend

# Check if metrics endpoint is accessible
curl http://localhost:3000/metrics

# Check Prometheus logs
docker logs taskflow-prometheus --tail 50
```

**Issue: Permission denied on alert files**
```bash
# Fix file permissions
chmod 644 monitoring/prometheus/alerts/*.yml

# Restart Prometheus
docker restart taskflow-prometheus
```

**Issue: Alert rule syntax error**
```bash
# Validate alert rules
docker exec taskflow-prometheus promtool check rules /etc/prometheus/alerts/rules.yml
```

### Grafana Not Showing Data

**Issue: "No data" in panels**

**1. Check time range:**
- Ensure time range includes data points
- Try "Last 6 hours" or "Last 24 hours"

**2. Verify data source:**
- Grafana → Configuration → Data Sources
- Click "Test" - should show green checkmark

**3. Check query syntax:**
- Switch to Code mode
- Run query in Prometheus first
- Copy working query to Grafana

**4. Inspect query:**
- Click "Query inspector" in panel
- Check "Data" tab for actual results
- Review "Stats" for query performance

**Issue: Dashboard variables not working**

```bash
# Common variable queries
label_values(http_requests_total, route)  # Get all routes
label_values(up{job="taskflow-backend"}, instance)  # Get instances
```

**Issue: Panels loading slowly**

1. Reduce time range
2. Increase min interval to 30s
3. Use recording rules for complex queries
4. Limit number of series (use `topk()`)

### Common Metric Issues

**Issue: Counter reset (spikes in rate graphs)**

Counters reset when app restarts. Use `rate()` or `increase()` which handle resets:

```promql
# Handles counter resets properly
rate(http_requests_total[5m])

# BAD: Shows reset spikes
http_requests_total
```

**Issue: Missing metrics after update**

```bash
# Restart backend to expose new metrics
docker restart taskflow-backend

# Wait 30s for Prometheus to scrape
# Check /metrics endpoint
curl http://localhost:3000/metrics | grep metric_name
```

**Issue: Histogram buckets not showing**

```promql
# Correct histogram query
histogram_quantile(0.95,
  sum(rate(http_request_duration_seconds_bucket[5m])) by (le)
)

# WRONG: Missing 'by (le)'
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
```

---

## Pro Tips & Tricks

### 1. Use Annotations

Mark deployments, incidents, or releases on graphs:

- Grafana → Dashboard Settings → Annotations
- Add query or manual annotations
- See correlation between events and metrics

### 2. Template Variables

Make dashboards dynamic:

```
Variable: $environment
Query: label_values(up, environment)

Then in queries:
http_requests_total{environment="$environment"}
```

### 3. Dashboard Links

Create navigation between dashboards:

- Add "Dashboard list" panel
- Link related dashboards
- Create drill-down paths (Overview → Details → Deep Dive)

### 4. JSON Model Export/Import

Share dashboards as code:

```bash
# Export dashboard JSON
Grafana → Dashboard Settings → JSON Model → Copy

# Version control
git add dashboards/application-dashboard.json

# Import on another Grafana instance
Grafana → + → Import → Paste JSON
```

### 5. Keyboard Shortcuts

- `d + k`: Open dashboard search
- `d + h`: Open home dashboard
- `e`: Expand all rows
- `f`: Open time range picker
- `Ctrl + S`: Save dashboard

---

## Resources & Learning

### Official Documentation
- [Prometheus Docs](https://prometheus.io/docs/)
- [Grafana Docs](https://grafana.com/docs/)
- [PromQL Tutorial](https://prometheus.io/docs/prometheus/latest/querying/basics/)

### PromQL Practice
- [PromLabs PromQL Cheat Sheet](https://promlabs.com/promql-cheat-sheet/)
- [Prometheus Query Examples](https://prometheus.io/docs/prometheus/latest/querying/examples/)

### Community Dashboards
- [Grafana Dashboard Library](https://grafana.com/grafana/dashboards/)
- Search for: Node.js, Express, PostgreSQL dashboards

### Video Tutorials
- [Grafana YouTube Channel](https://www.youtube.com/c/Grafana)
- "Prometheus Monitoring for Beginners"
- "Advanced PromQL Queries"

---

## Next Steps

1. **Create your first custom dashboard** with 5-10 essential panels
2. **Set up 3-5 critical alerts** for production monitoring
3. **Explore Grafana's visualization options**: Heatmaps, Geomap, Node Graph
4. **Learn PromQL deeply**: Practice queries in Prometheus UI
5. **Share dashboards** with your team as JSON files
6. **Set up Alertmanager** for notification routing (email, Slack, PagerDuty)

---

**Happy Monitoring!** 🎯📊🚀
