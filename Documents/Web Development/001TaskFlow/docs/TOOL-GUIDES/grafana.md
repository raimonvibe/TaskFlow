# Grafana Mastery Guide

A complete guide to building production-grade dashboards and visualizations with Grafana for TaskFlow monitoring.

## Quick Access

- **Grafana**: http://localhost:3001
- **Default Credentials**: admin/admin
- **Data Source**: Prometheus (pre-configured)

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Dashboard Creation Fundamentals](#dashboard-creation-fundamentals)
3. [Panel Types & Visualizations](#panel-types--visualizations)
4. [Query Builder: Code vs Builder Mode](#query-builder-code-vs-builder-mode)
5. [Essential Dashboard Panels](#essential-dashboard-panels)
6. [Variables & Templating](#variables--templating)
7. [Thresholds & Alerting](#thresholds--alerting)
8. [Dashboard Organization](#dashboard-organization)
9. [Advanced Techniques](#advanced-techniques)
10. [Production-Ready Dashboards](#production-ready-dashboards)
11. [Performance Optimization](#performance-optimization)
12. [Troubleshooting](#troubleshooting)

---

## Getting Started

### Initial Setup

**1. First Login:**
```
URL: http://localhost:3001
Username: admin
Password: admin
```

**2. Change Password (Optional):**
- You'll be prompted to change the password
- Can skip and use admin/admin for development

**3. Verify Data Source:**
- Go to **Configuration** (⚙️) → **Data Sources**
- Should see "Prometheus" already configured
- Click **Test** → Should show green "Data source is working"

### Grafana Interface Overview

**Main Navigation (Left Sidebar):**
- **Search** (🔍): Find dashboards
- **Dashboards** (📊): Browse/create dashboards
- **Explore** (🧭): Ad-hoc query exploration
- **Alerting** (🔔): Manage alerts
- **Configuration** (⚙️): Settings, data sources, plugins

**Dashboard Toolbar (Top):**
- **Time range picker**: Last 6h, 24h, 7d, custom
- **Refresh**: Auto-refresh interval (5s, 10s, 30s, etc.)
- **Save**: Save dashboard
- **Settings**: Dashboard settings
- **Add panel**: Create new visualization

---

## Dashboard Creation Fundamentals

### Creating Your First Dashboard

**Step 1: Create Dashboard**
1. Click **"+"** icon (Create)
2. Select **"Dashboard"**
3. Click **"Add visualization"**

**Step 2: Select Data Source**
- Choose **"Prometheus"**
- Query editor opens

**Step 3: Build Query**
- Switch to **Code mode** (toggle in top-right)
- Enter PromQL query: `process_resident_memory_bytes / 1024 / 1024`
- Click **"Run queries"**

**Step 4: Configure Panel**
- **Panel options (right sidebar):**
  - Title: "Memory Usage (MB)"
  - Description: "Application memory consumption"
- **Standard options:**
  - Unit: None or Custom
  - Decimals: 2
  - Min/Max: Auto or custom
- **Visualization:**
  - Type: Time series
  - Legend: Show/hide
  - Tooltip: All series or Single

**Step 5: Save Panel**
- Click **"Apply"** (top-right)
- Panel added to dashboard

**Step 6: Save Dashboard**
- Click **Save** icon (top-right)
- Enter dashboard name: "Application Monitoring"
- Add tags (optional): monitoring, nodejs, performance
- Click **"Save"**

### Dashboard Settings

Access via **Dashboard settings** (⚙️) icon:

**General:**
- Name and description
- Tags for organization
- Timezone
- Auto-refresh

**Variables:**
- Create dynamic dashboards
- Filter by environment, service, etc.

**Annotations:**
- Mark events on graphs
- Deployments, incidents, releases

**JSON Model:**
- Export/import dashboard as JSON
- Version control your dashboards

**Permissions:**
- Set viewer/editor access
- Team-based permissions

---

## Panel Types & Visualizations

### When to Use Each Visualization

#### 1. **Time Series** (Default)
**Best for:** Trends over time, metrics that change continuously

**Use cases:**
- Request rate over time
- Memory/CPU usage trends
- Response time evolution
- Error rate patterns

**Configuration:**
```
Visualization: Time series
Draw style: Lines, Bars, or Points
Line interpolation: Linear, Smooth, Step
Fill opacity: 0-100%
Point size: 1-20
Show points: Auto, Always, Never
```

**Example Query:**
```promql
rate(http_requests_total[5m])
```

#### 2. **Stat** (Single Value)
**Best for:** Current state, latest value, summary metrics

**Use cases:**
- Current active users
- Total requests today
- Latest deployment version
- Service uptime percentage

**Configuration:**
```
Visualization: Stat
Graph mode: None, Area, or Line
Color mode: Value, Background, or None
Text mode: Auto, Value, Value and name, Name
Orientation: Auto, Horizontal, Vertical
```

**Example Query:**
```promql
sum(active_connections)
```

#### 3. **Gauge**
**Best for:** Percentage-based metrics, capacity utilization

**Use cases:**
- Memory usage (0-100%)
- CPU utilization
- Disk space remaining
- Connection pool usage
- SLO/SLA compliance

**Configuration:**
```
Visualization: Gauge
Show threshold labels: Yes/No
Show threshold markers: Yes/No
Min: 0
Max: 100
Thresholds:
  - Green: 0-70
  - Yellow: 70-85
  - Red: 85-100
```

**Example Query:**
```promql
(nodejs_heap_size_used_bytes / nodejs_heap_size_total_bytes) * 100
```

#### 4. **Bar Chart**
**Best for:** Comparing values across categories

**Use cases:**
- Requests by endpoint
- Errors by type
- Users by region
- Top N slowest endpoints

**Configuration:**
```
Visualization: Bar chart
Orientation: Horizontal or Vertical
Group mode: Stacked or Side by side
Show values: Auto, Always, Never
Bar width: 0.1-1.0
```

**Example Query:**
```promql
topk(10, sum(rate(http_requests_total[1h])) by (route))
```

#### 5. **Pie Chart / Donut**
**Best for:** Proportions and distributions

**Use cases:**
- HTTP status code distribution
- Success vs failure ratio
- Traffic by endpoint
- User distribution by platform

**Configuration:**
```
Visualization: Pie chart
Pie chart type: Pie or Donut
Legend placement: Right, Bottom
Legend values: Value, Percent
Tooltip: Single series, All series
```

**Example Query:**
```promql
sum(increase(http_requests_total[1h])) by (status_code)
```

#### 6. **Table**
**Best for:** Detailed data, multiple metrics per entity

**Use cases:**
- Service health overview (name, status, uptime)
- Top errors with counts
- Resource usage by container
- Detailed endpoint statistics

**Configuration:**
```
Visualization: Table
Column filters: Show/hide columns
Column styles: Custom formatting per column
Cell display mode: Auto, Color text, Color background, Gradient gauge
```

**Example Queries (Multiple):**
```promql
# Query A: Uptime
up{job="taskflow-backend"}

# Query B: Request rate
rate(http_requests_total{job="taskflow-backend"}[5m])

# Query C: Error rate
rate(http_requests_total{job="taskflow-backend",status_code=~"5.."}[5m])
```

#### 7. **Heatmap**
**Best for:** Distribution over time, identifying patterns

**Use cases:**
- Request latency distribution
- Response time buckets
- Activity patterns by hour/day
- Load distribution

**Configuration:**
```
Visualization: Heatmap
Calculate from data: Yes
Data format: Time series buckets
Y Axis unit: Short, Time, Bytes
Color scheme: Interpolated, Quantize
```

**Example Query:**
```promql
sum(rate(http_request_duration_seconds_bucket[5m])) by (le)
```

#### 8. **State Timeline**
**Best for:** State changes over time

**Use cases:**
- Service up/down status
- Deployment timeline
- Alert firing periods
- Feature flag changes

**Example Query:**
```promql
up{job="taskflow-backend"}
```

#### 9. **Bar Gauge**
**Best for:** Comparing current values with thresholds

**Use cases:**
- Resource limits vs usage
- SLO targets vs actual
- Quota consumption

**Configuration:**
```
Visualization: Bar gauge
Display mode: Basic, LCD, Gradient
Show unfilled area: Yes/No
```

#### 10. **Logs Panel**
**Best for:** Log exploration (if using Loki)

**Note:** Requires Loki data source, not applicable for Prometheus-only setup.

---

## Query Builder: Code vs Builder Mode

### Builder Mode (Visual)

**Pros:**
- Beginner-friendly
- No PromQL knowledge required
- Guided metric selection
- Label filters as dropdowns

**Cons:**
- Limited to basic queries
- Slower for complex queries
- Less control over result

**When to use:**
- Learning Grafana
- Simple metric queries
- Exploring available metrics

**Example Workflow:**
1. Click **"Metric"** dropdown → Select `http_requests_total`
2. Click **"Label filters"** → Add `method = GET`
3. Click **"Operations"** → Select `Rate` → Set `5m`
4. Result: `rate(http_requests_total{method="GET"}[5m])`

### Code Mode (Recommended)

**Pros:**
- Full PromQL power
- Faster workflow
- Copy-paste queries
- Better for complex operations

**Cons:**
- Requires PromQL knowledge
- Syntax errors possible

**When to use:**
- Production dashboards
- Complex queries
- Math operations
- Advanced aggregations

**Toggle:** Click **"Code"** button (top-right of query editor)

**Example Queries:**
```promql
# Simple metric
active_connections

# With label filter
http_requests_total{method="POST"}

# Rate calculation
rate(http_requests_total[5m])

# Math operation
process_resident_memory_bytes / 1024 / 1024

# Aggregation
sum(rate(http_requests_total[5m])) by (route)

# Percentage
(nodejs_heap_size_used_bytes / nodejs_heap_size_total_bytes) * 100

# Histogram percentile
histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))
```

---

## Essential Dashboard Panels

### Panel 1: Request Rate
**Visualization:** Time series

**Query:**
```promql
sum(rate(http_requests_total[5m])) by (route)
```

**Configuration:**
- **Title:** "HTTP Request Rate"
- **Description:** "Requests per second by endpoint"
- **Unit:** requests/sec (ops)
- **Legend:** `{{route}}`
- **Y-axis:** Min = 0

**Panel options:**
- Draw style: Lines
- Fill opacity: 10
- Point size: 0

### Panel 2: Response Time (P50, P95, P99)
**Visualization:** Time series

**Queries:**
```promql
# Query A - P50
histogram_quantile(0.50, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))

# Query B - P95
histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))

# Query C - P99
histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))
```

**Configuration:**
- **Title:** "Response Time Percentiles"
- **Unit:** seconds (s)
- **Legend:** P50, P95, P99
- **Thresholds:**
  - Yellow: 1s
  - Red: 3s

**Panel options:**
- Multiple queries with different legends
- Color: Green (P50), Yellow (P95), Red (P99)

### Panel 3: Error Rate
**Visualization:** Stat with sparkline

**Query:**
```promql
(sum(rate(http_requests_total{status_code=~"5.."}[5m])) /
 sum(rate(http_requests_total[5m]))) * 100
```

**Configuration:**
- **Title:** "Error Rate (%)"
- **Unit:** percent (0-100)
- **Decimals:** 2
- **Thresholds:**
  - Green: < 1%
  - Yellow: 1-5%
  - Red: > 5%
- **Graph mode:** Area
- **Color mode:** Background

### Panel 4: Memory Usage
**Visualization:** Gauge

**Query:**
```promql
(nodejs_heap_size_used_bytes / nodejs_heap_size_total_bytes) * 100
```

**Configuration:**
- **Title:** "Heap Memory Usage"
- **Unit:** percent (0-100)
- **Min:** 0
- **Max:** 100
- **Thresholds:**
  - Green: 0-70
  - Yellow: 70-85
  - Red: 85-100
- **Show threshold markers:** Yes

### Panel 5: Active Connections
**Visualization:** Stat

**Query:**
```promql
active_connections
```

**Configuration:**
- **Title:** "Active Connections"
- **Color mode:** Value
- **Graph mode:** Area
- **Text size:** Auto

### Panel 6: HTTP Status Distribution
**Visualization:** Pie chart

**Query:**
```promql
sum(increase(http_requests_total[1h])) by (status_code)
```

**Configuration:**
- **Title:** "Status Code Distribution (1h)"
- **Legend placement:** Right
- **Legend values:** Value + Percent
- **Pie chart type:** Donut

### Panel 7: Top 10 Endpoints
**Visualization:** Bar chart (horizontal)

**Query:**
```promql
topk(10, sum(rate(http_requests_total[1h])) by (route))
```

**Configuration:**
- **Title:** "Top 10 Endpoints by Traffic"
- **Orientation:** Horizontal
- **Show values:** Always
- **Unit:** requests/sec

### Panel 8: Event Loop Lag
**Visualization:** Time series

**Query:**
```promql
nodejs_eventloop_lag_seconds * 1000
```

**Configuration:**
- **Title:** "Event Loop Lag"
- **Unit:** milliseconds (ms)
- **Thresholds:**
  - Green: < 50ms
  - Yellow: 50-100ms
  - Red: > 100ms

### Panel 9: Authentication Stats
**Visualization:** Bar chart

**Query:**
```promql
sum(increase(auth_attempts_total[1h])) by (status)
```

**Configuration:**
- **Title:** "Authentication Attempts (1h)"
- **Legend:** `{{status}}`
- **Show values:** Always

### Panel 10: Service Uptime
**Visualization:** Stat

**Query:**
```promql
avg_over_time(up{job="taskflow-backend"}[24h]) * 100
```

**Configuration:**
- **Title:** "Uptime (24h)"
- **Unit:** percent (0-100)
- **Decimals:** 3
- **Thresholds:**
  - Red: < 99.9%
  - Yellow: 99.9-99.99%
  - Green: > 99.99%

---

## Variables & Templating

Variables make dashboards dynamic and reusable.

### Creating a Variable

**1. Dashboard Settings → Variables → Add variable**

**2. Configure Variable:**

**Example: Environment Selector**
```
Name: environment
Type: Query
Label: Environment
Data source: Prometheus
Query: label_values(up, environment)
Multi-value: No
Include All option: Yes
```

**Example: Time Interval**
```
Name: interval
Type: Interval
Values: 1m,5m,10m,30m,1h
Auto: Yes
```

**Example: Instance Selector**
```
Name: instance
Type: Query
Query: label_values(up{job="taskflow-backend"}, instance)
Multi-value: Yes
Include All option: Yes
```

### Using Variables in Queries

**In PromQL:**
```promql
# Single variable
http_requests_total{environment="$environment"}

# Multiple variables
http_requests_total{environment="$environment", instance=~"$instance"}

# In aggregation
sum(rate(http_requests_total{environment="$environment"}[$interval])) by (route)
```

**In Panel Titles:**
```
Title: Request Rate - $environment
Description: Requests per second for $instance
```

### Variable Types

**1. Query:**
- Populated from Prometheus query
- Example: `label_values(http_requests_total, method)`

**2. Custom:**
- Manual list of values
- Example: `production,staging,development`

**3. Constant:**
- Single hidden value
- Example: `taskflow-backend`

**4. Interval:**
- Time range selection
- Example: `1m,5m,15m,30m,1h`

**5. Data source:**
- Switch between Prometheus instances
- Useful for multi-cluster setups

**6. Ad hoc filters:**
- Dynamic label-based filtering
- Automatically added to all queries

### Advanced Variable Techniques

**Chained Variables:**
```
Variable 1: $environment
Query: label_values(up, environment)

Variable 2: $service
Query: label_values(up{environment="$environment"}, service)
```

**Regex Filtering:**
```
Variable: $route
Query: label_values(http_requests_total, route)
Regex: /api/.*
```

**Default Value:**
```
Variable: $interval
Values: 5m,10m,30m,1h
Default: 5m
```

---

## Thresholds & Alerting

### Setting Thresholds

Thresholds change panel colors based on values.

**Configure Thresholds:**

**1. Edit Panel → Standard options → Thresholds**

**2. Add Threshold Values:**
```
Base (Green): 0
Yellow: 70
Red: 85
```

**3. Threshold Mode:**
- **Absolute:** Fixed values (e.g., 70, 85)
- **Percentage:** Relative to min/max (e.g., 70%, 85%)

**Examples:**

**Memory Usage:**
```
Min: 0
Max: 100
Thresholds:
  - Green: 0
  - Yellow: 70
  - Red: 85
Color mode: Background
```

**Error Rate:**
```
Thresholds:
  - Green: 0
  - Yellow: 1
  - Red: 5
Unit: percent (0-100)
```

**Response Time:**
```
Thresholds:
  - Green: 0
  - Yellow: 1
  - Red: 3
Unit: seconds (s)
```

### Creating Alerts in Grafana

**Note:** Grafana alerts work with Prometheus as data source.

**1. Edit Panel → Alert tab → Create Alert**

**2. Configure Alert Rule:**

**Alert Condition:**
```
WHEN: last()
OF: query(A, 5m, now)
IS ABOVE: 85
```

**Alert Evaluation:**
- **Evaluate every:** 1m
- **For:** 5m (wait before firing)

**3. Alert Details:**
```
Alert name: High Memory Usage
Message: Memory usage is above 85%
Tags: critical, backend, memory
```

**4. Notifications:**
- Configure contact points (email, Slack, PagerDuty)
- Set notification channels

**Example Alert Rules:**

**High Error Rate:**
```
Query: (sum(rate(http_requests_total{status_code=~"5.."}[5m])) / sum(rate(http_requests_total[5m]))) * 100
Condition: IS ABOVE 5
For: 5m
Severity: Warning
```

**Memory Critical:**
```
Query: (nodejs_heap_size_used_bytes / nodejs_heap_size_total_bytes) * 100
Condition: IS ABOVE 90
For: 2m
Severity: Critical
```

**Service Down:**
```
Query: up{job="taskflow-backend"}
Condition: IS BELOW 1
For: 1m
Severity: Critical
```

---

## Dashboard Organization

### Best Practices

**1. Row Organization:**

Group related panels in rows:
```
Row 1: Golden Signals (Request Rate, Error Rate, Duration)
Row 2: Resource Usage (CPU, Memory, Disk)
Row 3: Business Metrics (Users, Tasks, Logins)
Row 4: Infrastructure (Database, Cache, Network)
```

**Add Row:**
- Click **"Add"** → **"Row"**
- Name the row
- Drag panels into row
- Collapse/expand rows

**2. Panel Sizing:**

Standard sizes:
- **Full width stat panels:** 1 row, 24 columns
- **Half width panels:** 1 row, 12 columns (2 per row)
- **Third width panels:** 1 row, 8 columns (3 per row)
- **Quarter width panels:** 1 row, 6 columns (4 per row)

**3. Color Consistency:**

Use consistent colors across dashboards:
- **Green:** Healthy/success
- **Yellow:** Warning
- **Red:** Critical/error
- **Blue:** Information

**4. Naming Conventions:**

Clear, descriptive titles:
- ✅ "HTTP Request Rate (req/s)"
- ✅ "P95 Response Time by Endpoint"
- ❌ "Graph 1"
- ❌ "Metric"

**5. Dashboard Tags:**

Tag dashboards for easy discovery:
```
Tags: monitoring, backend, nodejs, production
```

**6. Descriptions:**

Add context to panels:
```
Description: Shows the 95th percentile response time for all API endpoints.
Values above 1s (yellow) or 3s (red) indicate performance degradation.
```

### Dashboard Hierarchy

**Create a logical navigation:**

**Level 1: Overview Dashboards**
- System Health Overview
- Application Performance Summary
- Business Metrics Summary

**Level 2: Service Dashboards**
- Backend API Dashboard
- Frontend Performance
- Database Dashboard

**Level 3: Deep Dive Dashboards**
- Endpoint Performance Details
- Error Analysis
- Resource Utilization Details

**Link Dashboards:**
- Add "Dashboard list" panel
- Use dashboard links in panel titles
- Create drill-down flows

---

## Advanced Techniques

### 1. Panel Links

Create clickable panels that navigate to related dashboards:

**Edit Panel → Panel links → Add link:**
```
Title: View Details
URL: /d/endpoint-details
Type: Dashboard
Include time range: Yes
Include variables: Yes
```

### 2. Repeating Panels

Auto-generate panels based on variable values:

**Edit Panel → Repeat options:**
```
Repeat by variable: $instance
Repeat direction: Horizontal or Vertical
Max per row: 4
```

**Result:** One panel per instance automatically!

### 3. Transformations

Modify query results before visualization:

**Edit Panel → Transform tab:**

**Useful transformations:**

**Merge:**
- Combine multiple queries into one table

**Filter by value:**
- Show only rows where value > 100

**Add field from calculation:**
- Create new column: `Response Time (ms) = Response Time (s) * 1000`

**Rename by regex:**
- Clean up metric names

**Sort by:**
- Order rows by specific column

**Example: Calculate Percentage**
```
Query A: nodejs_heap_size_used_bytes
Query B: nodejs_heap_size_total_bytes

Transform: Add field from calculation
Calculation: A / B * 100
Alias: Heap Usage %
```

### 4. Overrides

Customize individual series appearance:

**Edit Panel → Overrides → Add field override:**

**Example: Color specific endpoint red**
```
Fields with name: /api/critical
Standard options → Color: Red
```

**Example: Hide health check from legend**
```
Fields with name: /health
Legend → Hide from: Tooltip and legend
```

### 5. Annotations

Mark events on graphs:

**Dashboard Settings → Annotations → Add annotation query:**

```
Name: Deployments
Data source: Prometheus
Query: changes(process_start_time_seconds[5m]) > 0
Text: Deployment
Tags: release
Color: Blue
```

### 6. Mixed Data Sources

Combine Prometheus with other sources:

**Example: Prometheus + Loki**
```
Query A (Prometheus): rate(http_requests_total[5m])
Query B (Loki): {job="backend"} |= "error"
```

Visualize metrics alongside logs!

### 7. Value Mappings

Map metric values to text:

**Edit Panel → Value mappings:**
```
Value: 0 → Text: "Down" (Red)
Value: 1 → Text: "Up" (Green)
```

**Example: Status Panel**
```
Query: up{job="taskflow-backend"}
Mapping:
  0 = "Offline" (Red)
  1 = "Online" (Green)
Visualization: Stat
```

---

## Production-Ready Dashboards

### Dashboard 1: Application Health

**Purpose:** Real-time service health monitoring

**Layout:**
```
Row 1: Overview Stats (4 panels)
  - Uptime % (Stat)
  - Request Rate (Stat)
  - Error Rate (Stat)
  - Avg Response Time (Stat)

Row 2: Golden Signals (3 panels)
  - Request Rate by Endpoint (Time series)
  - Error Rate % (Time series)
  - P95 Response Time (Time series)

Row 3: Resource Usage (3 panels)
  - Memory Usage % (Gauge)
  - CPU Usage % (Gauge)
  - Event Loop Lag (Time series)

Row 4: Detailed Metrics (2 panels)
  - Status Code Distribution (Pie chart)
  - Top 10 Endpoints (Bar chart)
```

### Dashboard 2: Performance Monitoring

**Purpose:** Deep performance analysis

**Layout:**
```
Row 1: Response Times
  - P50/P95/P99 Response Time (Time series)
  - Slowest Endpoints (Table)
  - Response Time Heatmap (Heatmap)

Row 2: Throughput
  - Requests per Second (Time series)
  - Requests by Method (Bar chart)
  - Request Volume Trend (Time series)

Row 3: Node.js Internals
  - Garbage Collection Duration (Time series)
  - Heap Memory Detailed (Time series)
  - Event Loop Lag Percentiles (Time series)
```

### Dashboard 3: Business Metrics

**Purpose:** Track business KPIs

**Layout:**
```
Row 1: User Activity
  - Active Users (Stat)
  - New Signups (Stat)
  - Login Success Rate (Gauge)

Row 2: Task Metrics
  - Tasks Created Today (Stat)
  - Tasks Completed Today (Stat)
  - Task Completion Rate (Gauge)

Row 3: API Usage
  - API Calls by Endpoint (Pie chart)
  - Peak Usage Hours (Heatmap)
  - API Usage Trend (Time series)
```

### Dashboard 4: SRE / On-Call

**Purpose:** Quick incident response

**Layout:**
```
Row 1: Service Status (collapsible=false)
  - Backend Status (Stat): Green/Red
  - Database Status (Stat): Green/Red
  - Redis Status (Stat): Green/Red
  - Error Budget Remaining (Gauge)

Row 2: Critical Metrics
  - Error Rate Last 5m (Stat): Large, Red if >1%
  - P99 Latency (Stat): Red if >3s
  - Failed Requests (Graph): Spikes visible
  - Alert Timeline (State timeline)

Row 3: Quick Diagnostics
  - Recent Errors (Table)
  - Slow Queries (Table)
  - Memory/CPU Pressure (Gauge)
```

---

## Performance Optimization

### Optimize Dashboard Load Time

**1. Limit Time Range**
```
Default: Last 6 hours (not 30 days)
User can change if needed
```

**2. Set Minimum Interval**
```
Edit Panel → Query options → Min interval: 30s

Prevents queries like rate(metric[1s]) for 7-day ranges
```

**3. Reduce Panel Count**
```
Max 15-20 panels per dashboard
Use multiple dashboards instead
```

**4. Use Recording Rules**

Pre-calculate expensive queries in Prometheus:
```yaml
# prometheus.yml
rules:
  - record: job:request_rate:5m
    expr: sum(rate(http_requests_total[5m])) by (job)
```

Then in Grafana:
```promql
job:request_rate:5m{job="taskflow-backend"}
```

**5. Cache Query Results**
```
Edit Panel → Query options → Cache timeout: 60s
```

**6. Limit Series**

Use `topk()` to reduce data:
```promql
# Instead of all endpoints
rate(http_requests_total[5m])

# Top 10 only
topk(10, rate(http_requests_total[5m]))
```

**7. Disable Unused Queries**

Toggle queries off instead of deleting:
```
Edit Panel → Query tab → Toggle eye icon to disable
```

### Query Best Practices

**❌ Avoid:**
```promql
# Expensive: All label combinations
http_request_duration_seconds_bucket

# Expensive: Long time range without rate
sum(http_requests_total[7d])
```

**✅ Use:**
```promql
# Efficient: Aggregated with rate
sum(rate(http_request_duration_seconds_bucket[5m])) by (le)

# Efficient: Rate with appropriate window
rate(http_requests_total[5m])
```

---

## Troubleshooting

### Issue: "No Data" in Panel

**Solution 1: Check Time Range**
- Ensure time range includes data
- Try "Last 6 hours" or "Last 24 hours"

**Solution 2: Verify Data Source**
- Configuration → Data Sources → Prometheus
- Click "Test" button → Should be green

**Solution 3: Test Query in Prometheus**
1. Go to http://localhost:9090
2. Run the same query
3. If no data in Prometheus, query is wrong

**Solution 4: Check Query Syntax**
- Switch to Code mode
- Look for red error indicators
- Common errors:
  - Missing closing brace: `{method="GET"`
  - Wrong metric name
  - Invalid label filter

### Issue: Panel Loading Slowly

**Solution 1: Reduce Time Range**
- Use 6h or 12h instead of 7d or 30d

**Solution 2: Increase Min Interval**
- Query options → Min interval: 30s or 1m

**Solution 3: Simplify Query**
- Use fewer label filters
- Aggregate before calculation
- Use recording rules

**Solution 4: Limit Series**
```promql
# Instead of this (100s of series)
rate(http_requests_total[5m])

# Use this (top 10 only)
topk(10, rate(http_requests_total[5m]))
```

### Issue: Variables Not Working

**Solution: Check Variable Query**

**Common variable queries:**
```promql
# All values for a label
label_values(http_requests_total, route)

# Filtered values
label_values(http_requests_total{environment="production"}, route)

# With another variable
label_values(up{environment="$environment"}, instance)
```

**Test variable:**
- Dashboard settings → Variables → Select variable
- Click "Preview of values" → Should show list

### Issue: Thresholds Not Showing

**Solution:**
1. Check threshold values match data range
2. Ensure "Color mode" is set (Value, Background, or Both)
3. Verify thresholds in right order (ascending)

### Issue: Alerts Not Firing

**Solution:**
1. Check alert evaluation interval
2. Verify "For" duration isn't too long
3. Test query returns expected values
4. Check notification channel configuration

### Issue: Dashboard Not Saving

**Solution:**
1. Check permissions (need Editor role)
2. Ensure dashboard name is unique
3. Try exporting JSON instead

### Issue: Histogram Queries Return No Data

**Check query format:**
```promql
# ✅ Correct: Include 'by (le)'
histogram_quantile(0.95,
  sum(rate(http_request_duration_seconds_bucket[5m])) by (le)
)

# ❌ Wrong: Missing 'by (le)'
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))
```

---

## Pro Tips & Tricks

### 1. Keyboard Shortcuts

- **`d + k`**: Dashboard search
- **`d + h`**: Home dashboard
- **`e`**: Expand/collapse all rows
- **`f`**: Time range picker
- **`Ctrl + S`**: Save dashboard
- **`Ctrl + H`**: Hide controls
- **`Esc`**: Exit panel edit mode

### 2. Quick Panel Duplication

- Edit panel
- Panel menu (three dots) → More → Duplicate
- Modify query/settings
- Saves time for similar panels

### 3. JSON Model Export

**Version control your dashboards:**
```bash
# Export
Dashboard Settings → JSON Model → Copy

# Save to file
dashboards/app-monitoring.json

# Import
Dashboards → Import → Paste JSON
```

### 4. Shared Crosshair

**Sync time selection across panels:**
```
Dashboard Settings → General → Graph tooltip → Shared crosshair
```

When you hover over one panel, all panels show data at same timestamp!

### 5. URL Sharing

**Share specific view:**
```
Panel menu → Share → Link
Options:
  - Lock time range
  - Include variables
  - Shortened URL
```

### 6. Playlist Mode

**Create rotating dashboard views:**
```
Playlists → Create playlist
Add dashboards
Set interval (e.g., 30s)
Use for TV displays / monitoring walls
```

### 7. Mobile-Friendly Panels

**Optimize for mobile:**
- Use single-column layout
- Large stat panels
- Avoid tables with many columns
- Test with "Mobile view" toggle

### 8. Library Panels

**Reuse panels across dashboards:**
```
Panel menu → More → Create library panel
Name: "Request Rate Panel"
Use in other dashboards: Add panel → Library panels
```

### 9. Annotations from Queries

**Auto-mark events:**
```
Dashboard Settings → Annotations
Query: changes(process_start_time_seconds[5m]) > 0
Shows: Deployment/restart markers
```

### 10. Dark/Light Theme

**Switch theme:**
- User icon → Preferences → UI Theme
- Options: Dark, Light, System

---

## Next Steps

**Beginner Level:**
1. ✅ Create your first dashboard with 5 panels
2. ✅ Learn Code mode for queries
3. ✅ Set up thresholds on gauge panels
4. ✅ Add panel descriptions

**Intermediate Level:**
5. ✅ Create dashboard variables (environment, service)
6. ✅ Organize panels into rows
7. ✅ Set up 3 alert rules
8. ✅ Export dashboard as JSON

**Advanced Level:**
9. ✅ Create repeating panels
10. ✅ Use transformations
11. ✅ Build SRE on-call dashboard
12. ✅ Set up annotations

---

## Resources

**Official Documentation:**
- [Grafana Documentation](https://grafana.com/docs/)
- [Panel Types Guide](https://grafana.com/docs/grafana/latest/panels-visualizations/)
- [Variables Documentation](https://grafana.com/docs/grafana/latest/dashboards/variables/)

**Community:**
- [Grafana Community Forums](https://community.grafana.com/)
- [Grafana Dashboard Library](https://grafana.com/grafana/dashboards/)
- [YouTube: Grafana Channel](https://www.youtube.com/c/Grafana)

**Import Pre-Built Dashboards:**
- Node.js Dashboard: #11159
- Prometheus Stats: #2
- Kubernetes Cluster: #7249

**Search:** https://grafana.com/grafana/dashboards/

---

**Master Grafana, Master Observability!** 📊🚀💡
