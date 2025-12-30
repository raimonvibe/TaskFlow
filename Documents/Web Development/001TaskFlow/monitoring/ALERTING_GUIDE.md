# 🚨 TaskFlow Alerting Guide

**Version:** 1.0
**Last Updated:** November 17, 2025

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Alert Severity Levels](#alert-severity-levels)
3. [Alert Configuration](#alert-configuration)
4. [Notification Channels](#notification-channels)
5. [Alert Response](#alert-response)
6. [Alert Management](#alert-management)
7. [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

TaskFlow uses Prometheus Alertmanager for comprehensive monitoring and alerting. This guide covers how to configure, manage, and respond to alerts in production.

### Alert Philosophy

- **Alert on symptoms, not causes** - Focus on user-impacting issues
- **Actionable alerts only** - Every alert should require action
- **Appropriate severity** - Use severity levels correctly
- **Clear messaging** - Annotations should guide response
- **Runbook links** - Include links to resolution steps

---

## 📊 Alert Severity Levels

### Critical (P1)

**When to use:**
- Production service completely down
- Data loss or corruption
- Security breach
- Error rate > 10%

**Response time:** < 15 minutes
**Notification:** Phone call, SMS, PagerDuty
**Escalation:** Immediate

**Examples:**
- `ProductionServiceDown`
- `DataLossDetected`
- `DatabaseConnectionPoolExhausted`

---

### High (P2)

**When to use:**
- Severe performance degradation
- Critical resource exhaustion
- Impending service failure
- High error rates (5-10%)

**Response time:** < 30 minutes
**Notification:** Slack, Email, SMS
**Escalation:** After 30 minutes

**Examples:**
- `CriticalMemoryUsage`
- `SeverePerformanceDegradation`
- `BackupFailed`

---

### Medium (P3)

**When to use:**
- Performance issues
- Resource warnings
- Non-critical errors
- Capacity concerns

**Response time:** < 2 hours
**Notification:** Slack, Email
**Escalation:** During business hours

**Examples:**
- `HighCPUUsage`
- `DatabaseQueryPerformanceDegraded`
- `RateLimitExceeded`

---

### Low (P4)

**When to use:**
- Informational alerts
- Business metrics
- Trends and patterns
- Planning concerns

**Response time:** Next business day
**Notification:** Email, Dashboard
**Escalation:** None

**Examples:**
- `UnusualUserActivity`
- `TaskCreationStopped` (non-business hours)

---

## ⚙️ Alert Configuration

### Prometheus Alert Rules

**Location:** `monitoring/prometheus/alerts/`

```yaml
groups:
  - name: my_alert_group
    interval: 30s
    rules:
      - alert: MyAlert
        expr: metric_name > threshold
        for: 5m
        labels:
          severity: critical
          priority: P1
          category: availability
        annotations:
          summary: "Brief description"
          description: "Detailed description with {{ $value }}"
          runbook_url: "https://docs.taskflow.com/runbooks/my-alert"
```

### Alert Rule Components

| Component | Purpose | Example |
|-----------|---------|---------|
| **expr** | PromQL query | `up == 0` |
| **for** | Duration threshold | `5m` |
| **labels** | Alert metadata | `severity: critical` |
| **annotations** | Alert details | `summary: "Service down"` |

---

## 📢 Notification Channels

### 1. Slack Integration

**Setup:**

```yaml
# alertmanager.yml
receivers:
  - name: 'slack-critical'
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL'
        channel: '#alerts-critical'
        title: '🚨 {{ .GroupLabels.alertname }}'
        text: |
          *Summary:* {{ .CommonAnnotations.summary }}
          *Description:* {{ .CommonAnnotations.description }}
          *Severity:* {{ .CommonLabels.severity }}
        send_resolved: true
```

**Channels:**
- `#alerts-critical` - P1 alerts
- `#alerts-high` - P2 alerts
- `#alerts-warning` - P3 alerts
- `#alerts-info` - P4 alerts

---

### 2. Email Notifications

**Setup:**

```yaml
receivers:
  - name: 'email-ops'
    email_configs:
      - to: 'ops-team@taskflow.com'
        from: 'alerts@taskflow.com'
        smarthost: 'smtp.gmail.com:587'
        auth_username: 'alerts@taskflow.com'
        auth_password: '{{ EMAIL_PASSWORD }}'
        headers:
          Subject: '[{{ .Status | toUpper }}] {{ .CommonLabels.alertname }}'
```

---

### 3. PagerDuty Integration

**Setup:**

```yaml
receivers:
  - name: 'pagerduty-oncall'
    pagerduty_configs:
      - service_key: '{{ PAGERDUTY_SERVICE_KEY }}'
        severity: '{{ .CommonLabels.severity }}'
        description: '{{ .CommonAnnotations.summary }}'
        details:
          firing: '{{ .Alerts.Firing | len }}'
          resolved: '{{ .Alerts.Resolved | len }}'
```

---

### 4. Webhook (Custom)

**Setup:**

```yaml
receivers:
  - name: 'webhook-custom'
    webhook_configs:
      - url: 'https://api.taskflow.com/alerts/webhook'
        send_resolved: true
        http_config:
          bearer_token: '{{ WEBHOOK_TOKEN }}'
```

---

## 🔀 Alert Routing

**File:** `monitoring/alertmanager/alertmanager.yml`

```yaml
route:
  group_by: ['alertname', 'cluster', 'service']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 12h
  receiver: 'default'

  routes:
    # Critical alerts - immediate notification
    - match:
        severity: critical
      receiver: 'pagerduty-oncall'
      group_wait: 0s
      repeat_interval: 5m
      continue: true

    - match:
        severity: critical
      receiver: 'slack-critical'
      continue: true

    # High priority
    - match:
        severity: warning
        priority: P2
      receiver: 'slack-high'
      repeat_interval: 30m

    # Medium priority
    - match:
        severity: warning
        priority: P3
      receiver: 'slack-warning'
      repeat_interval: 2h

    # Low priority
    - match:
        severity: info
      receiver: 'email-ops'
      repeat_interval: 24h

# Inhibition rules - suppress redundant alerts
inhibit_rules:
  - source_match:
      severity: critical
    target_match:
      severity: warning
    equal: ['alertname', 'instance']

  - source_match:
      alertname: ProductionServiceDown
    target_match_re:
      alertname: High.*
    equal: ['instance']
```

---

## 🚑 Alert Response

### Response Workflow

```
Alert Fired
    ↓
Acknowledge Alert (5 min)
    ↓
Initial Assessment (10 min)
    ↓
    ├─→ False Positive → Silence & Document
    ├─→ Known Issue → Apply Fix
    └─→ New Issue → Investigate & Resolve
        ↓
    Verify Resolution
        ↓
    Document Incident
        ↓
    Post-Mortem (if P1/P2)
```

### Response Checklist

#### 1. Acknowledge (< 5 min)
- [ ] Acknowledge alert in Alertmanager/PagerDuty
- [ ] Post in Slack: "Investigating [AlertName]"
- [ ] Check if others are already investigating

#### 2. Assess (< 10 min)
- [ ] Read alert description and runbook
- [ ] Check Grafana dashboards
- [ ] Review recent deployments/changes
- [ ] Determine actual impact
- [ ] Update stakeholders

#### 3. Mitigate (< 30 min for P1)
- [ ] Apply immediate fix if known
- [ ] Rollback if deployment-related
- [ ] Scale resources if capacity issue
- [ ] Failover if infrastructure issue

#### 4. Resolve
- [ ] Fix root cause
- [ ] Verify metrics return to normal
- [ ] Monitor for 15 minutes
- [ ] Mark alert as resolved

#### 5. Document
- [ ] Update incident log
- [ ] Document resolution steps
- [ ] Create/update runbook
- [ ] Schedule post-mortem if needed

---

## 🔧 Alert Management

### Silencing Alerts

**When to silence:**
- Planned maintenance
- Known issues being fixed
- False positives (temporarily)

**Command line:**
```bash
# Silence alert for 2 hours
amtool silence add \
  alertname="HighCPUUsage" \
  instance="backend-pod-1" \
  --duration=2h \
  --author="ops@taskflow.com" \
  --comment="Planned load test"

# List silences
amtool silence query

# Expire silence
amtool silence expire <silence-id>
```

**UI:**
- Access Alertmanager UI: `http://alertmanager:9093`
- Click "Silences" → "New Silence"
- Set matchers and duration

---

### Modifying Alerts

```bash
# Edit alert rules
vim monitoring/prometheus/alerts/rules.yml

# Validate syntax
promtool check rules monitoring/prometheus/alerts/*.yml

# Reload Prometheus
curl -X POST http://prometheus:9090/-/reload

# Or restart pod
kubectl rollout restart deployment/prometheus -n monitoring
```

---

### Testing Alerts

```bash
# Fire test alert
curl -X POST http://prometheus:9090/api/v1/alerts \
  -d '[{
    "labels": {
      "alertname": "TestAlert",
      "severity": "warning"
    },
    "annotations": {
      "summary": "This is a test alert"
    }
  }]'

# Check Alertmanager
curl http://alertmanager:9093/api/v2/alerts
```

---

## 📈 Alert Metrics

### Key Metrics to Monitor

```promql
# Alert firing rate
rate(prometheus_notifications_sent_total[5m])

# Alert resolution time
histogram_quantile(0.95,
  rate(prometheus_notification_duration_seconds_bucket[5m])
)

# Failed notifications
rate(prometheus_notifications_errors_total[5m])

# Active alerts by severity
count by (severity) (ALERTS{alertstate="firing"})
```

---

## 🎯 Best Practices

### DO ✅

- Write clear, actionable alert descriptions
- Include runbook links in critical alerts
- Test alerts before deploying
- Review and tune alert thresholds regularly
- Document all incidents
- Use appropriate severity levels
- Group related alerts
- Silence alerts during maintenance

### DON'T ❌

- Alert on everything
- Use generic alert names
- Skip runbook documentation
- Ignore repeated alerts
- Set thresholds too tight
- Over-notify team members
- Leave alerts unacknowledged
- Disable alerts permanently

---

## 🔍 Troubleshooting

### Alert Not Firing

**Check:**
```bash
# Verify alert rule syntax
promtool check rules alerts/rules.yml

# Check Prometheus targets
curl http://prometheus:9090/api/v1/targets

# Query manually
curl "http://prometheus:9090/api/v1/query?query=up==0"

# Check rule evaluation
curl http://prometheus:9090/api/v1/rules
```

**Common causes:**
- Metric not being collected
- Query syntax error
- `for` duration not met
- Target down

---

### Alert Firing But No Notification

**Check:**
```bash
# Alertmanager status
curl http://alertmanager:9093/api/v2/status

# Check routes
curl http://alertmanager:9093/api/v2/alerts

# Check silences
amtool silence query

# Test notification
amtool alert add alertname="test"
```

**Common causes:**
- Alert is silenced
- Route misconfigured
- Receiver misconfigured
- Notification rate limiting

---

### Too Many Alerts (Alert Fatigue)

**Solutions:**
1. **Increase thresholds**
   ```yaml
   - alert: HighCPUUsage
     expr: cpu_usage > 0.9  # Was 0.7
     for: 10m               # Was 5m
   ```

2. **Add inhibition rules**
   ```yaml
   inhibit_rules:
     - source_match:
         alertname: ServiceDown
       target_match:
         service: backend
   ```

3. **Group similar alerts**
   ```yaml
   route:
     group_by: ['alertname', 'service']
     group_interval: 5m
   ```

4. **Review and remove noisy alerts**

---

## 📚 Resources

- **Prometheus Alerting:** https://prometheus.io/docs/alerting/latest/
- **Alertmanager:** https://prometheus.io/docs/alerting/latest/alertmanager/
- **PromQL:** https://prometheus.io/docs/prometheus/latest/querying/basics/
- **Runbooks:** `/docs/runbooks/`
- **Grafana Dashboards:** http://grafana:3001

---

## 📞 Escalation Path

| Level | Response Time | Contact |
|-------|---------------|---------|
| **L1 - On-Call** | 15 min | +1-XXX-XXX-XXXX |
| **L2 - DevOps Lead** | 30 min | +1-XXX-XXX-XXXX |
| **L3 - Engineering Manager** | 1 hour | +1-XXX-XXX-XXXX |
| **L4 - CTO** | 2 hours | +1-XXX-XXX-XXXX |

---

**Remember:** Good alerting is about signal, not noise. Every alert should be actionable and valuable.
