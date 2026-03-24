# 🚀 TaskFlow Load Testing

Comprehensive load testing suite for TaskFlow using k6.

## 📋 Table of Contents

- [Overview](#overview)
- [Installation](#installation)
- [Test Types](#test-types)
- [Running Tests](#running-tests)
- [Configuration](#configuration)
- [Interpreting Results](#interpreting-results)
- [CI/CD Integration](#cicd-integration)
- [Best Practices](#best-practices)

---

## 🎯 Overview

This load testing suite uses [k6](https://k6.io/), a modern, developer-friendly load testing tool. It includes various test types to validate TaskFlow's performance under different conditions.

### Test Coverage

- ✅ **Smoke Test** - Minimal load verification
- ✅ **Load Test** - Expected production load
- ✅ **Stress Test** - Beyond normal capacity
- ✅ **Spike Test** - Sudden traffic bursts
- ✅ **Soak Test** - Extended duration stability

---

## 📦 Installation

### Install k6

#### macOS
```bash
brew install k6
```

#### Linux (Debian/Ubuntu)
```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

#### Windows
```bash
choco install k6
```

#### Docker
```bash
docker pull grafana/k6:latest
```

### Verify Installation
```bash
k6 version
```

---

## 🧪 Test Types

### 1. Smoke Test

**Purpose:** Verify basic functionality under minimal load

**Duration:** ~1 minute
**Virtual Users:** 1-2
**When to run:** Before every deployment

```bash
npm run test:smoke
# or
k6 run smoke-test.js
```

**Success Criteria:**
- All endpoints respond
- No errors
- Response times < 100ms

---

### 2. Load Test

**Purpose:** Test system under expected production load

**Duration:** ~16 minutes
**Virtual Users:** 10-20
**When to run:** Before major releases

```bash
npm run test:load
# or
k6 run load-test.js
```

**Success Criteria:**
- Error rate < 1%
- 95% of requests < 500ms
- System remains stable

**Scenarios Tested:**
- 60% - Browsing tasks
- 30% - Creating/updating tasks
- 10% - Searching/filtering

---

### 3. Stress Test

**Purpose:** Find the system's breaking point

**Duration:** ~32 minutes
**Virtual Users:** 10-200
**When to run:** Capacity planning

```bash
npm run test:stress
# or
k6 run stress-test.js
```

**Success Criteria:**
- Identify maximum capacity
- System degrades gracefully
- No data corruption
- Recovery after load decrease

---

### 4. Spike Test

**Purpose:** Test behavior under sudden traffic spikes

**Duration:** ~4 minutes
**Virtual Users:** 10-300 (sudden spikes)
**When to run:** Before traffic events (launches, marketing campaigns)

```bash
npm run test:spike
# or
k6 run spike-test.js
```

**Success Criteria:**
- System handles spikes or fails gracefully
- Rate limiting works correctly
- Quick recovery after spike
- No cascading failures

---

### 5. Soak Test

**Purpose:** Test stability over extended period

**Duration:** ~64 minutes (1+ hour)
**Virtual Users:** 20 (sustained)
**When to run:** Before production deployment

```bash
npm run test:soak
# or
k6 run soak-test.js
```

**Success Criteria:**
- No performance degradation over time
- No memory leaks
- No resource exhaustion
- Stable error rates

---

## ⚙️ Configuration

### Environment Variables

```bash
# Set custom API URL
export BASE_URL=http://your-api-url:3000

# Set custom test credentials
export TEST_USER_EMAIL=demo@taskflow.com
export TEST_USER_PASSWORD=demo123

# Run test
k6 run load-test.js
```

### Custom Configuration

Edit `config.js` to customize:

```javascript
export const config = {
  baseURL: 'http://localhost:3000',
  testUser: {
    email: 'demo@taskflow.com',
    password: 'demo123',
  },
  thresholds: {
    http_req_failed: ['rate<0.01'], // 1% error rate
    http_req_duration: ['p(95)<500'], // 95% under 500ms
  },
};
```

### Thresholds

Thresholds define pass/fail criteria:

| Metric | Threshold | Meaning |
|--------|-----------|---------|
| `http_req_failed` | rate<0.01 | Less than 1% errors |
| `http_req_duration` | p(95)<500 | 95th percentile under 500ms |
| `http_req_duration` | p(99)<1000 | 99th percentile under 1s |
| `http_reqs` | rate>10 | At least 10 requests/sec |

---

## 📊 Interpreting Results

### Sample Output

```
execution: local
     script: load-test.js
     output: -

  scenarios: (100.00%) 1 scenario, 20 max VUs, 16m30s max duration
           * default: Up to 20 looping VUs for 16m0s over 5 stages

  ✓ status is 200
  ✓ response time < 500ms

  checks.........................: 100.00% ✓ 14582    ✗ 0
  data_received..................: 4.2 MB  4.4 kB/s
  data_sent......................: 2.1 MB  2.2 kB/s
  http_req_blocked...............: avg=1.2ms    min=1µs      med=3µs      max=234ms    p(90)=5µs      p(95)=7µs
  http_req_connecting............: avg=623µs    min=0s       med=0s       max=121ms    p(90)=0s       p(95)=0s
  http_req_duration..............: avg=185ms    min=12ms     med=156ms    max=987ms    p(90)=324ms    p(95)=421ms
    { expected_response:true }...: avg=185ms    min=12ms     med=156ms    max=987ms    p(90)=324ms    p(95)=421ms
  http_req_failed................: 0.00%   ✓ 0        ✗ 7291
  http_req_receiving.............: avg=124µs    min=19µs     med=98µs     max=12ms     p(90)=187µs    p(95)=245µs
  http_req_sending...............: avg=32µs     min=7µs      med=23µs     max=8ms      p(90)=54µs     p(95)=71µs
  http_req_tls_handshaking.......: avg=0s       min=0s       med=0s       max=0s       p(90)=0s       p(95)=0s
  http_req_waiting...............: avg=184ms    min=12ms     med=155ms    max=987ms    p(90)=323ms    p(95)=420ms
  http_reqs......................: 7291    7.6/s
  iteration_duration.............: avg=2.63s    min=2.1s     med=2.5s     max=4.2s     p(90)=3.1s     p(95)=3.4s
  iterations.....................: 1458    1.5/s
  vus............................: 1       min=1      max=20
  vus_max........................: 20      min=20     max=20
```

### Key Metrics

| Metric | Description | Good Value |
|--------|-------------|------------|
| **http_req_duration** | Total request time | p(95) < 500ms |
| **http_req_failed** | Failed request rate | < 1% |
| **http_reqs** | Requests per second | Depends on capacity |
| **checks** | Test assertions passed | 100% |
| **iteration_duration** | Full test iteration time | Consistent |

### Red Flags 🚩

- ❌ Increasing response times over time (memory leak)
- ❌ High error rates (> 5%)
- ❌ Failed checks
- ❌ Timeouts
- ❌ Resource exhaustion

---

## 🔄 CI/CD Integration

### GitHub Actions

Add to `.github/workflows/load-test.yml`:

```yaml
name: Load Tests

on:
  schedule:
    - cron: '0 2 * * *' # Daily at 2 AM
  workflow_dispatch: # Manual trigger

jobs:
  load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup k6
        run: |
          curl https://github.com/grafana/k6/releases/download/v0.47.0/k6-v0.47.0-linux-amd64.tar.gz -L | tar xvz --strip-components 1

      - name: Start services
        run: docker-compose up -d

      - name: Wait for services
        run: sleep 30

      - name: Run smoke test
        run: ./k6 run load-testing/smoke-test.js

      - name: Run load test
        run: ./k6 run load-testing/load-test.js
        continue-on-error: true

      - name: Upload results
        uses: actions/upload-artifact@v3
        with:
          name: load-test-results
          path: load-test-results.json
```

### Docker

```bash
# Run test in Docker
docker run --rm -i grafana/k6:latest run --vus 10 --duration 30s - <smoke-test.js

# With custom env
docker run --rm -i \
  -e BASE_URL=http://host.docker.internal:3000 \
  grafana/k6:latest run - <load-test.js
```

---

## 📈 Best Practices

### Before Testing

1. **Test in non-production environment first**
2. **Ensure test data exists** (seed database)
3. **Verify credentials work**
4. **Check baseline performance**
5. **Clear caches**

### During Testing

1. **Monitor system metrics** (CPU, memory, disk)
2. **Watch application logs**
3. **Check database performance**
4. **Observe network traffic**

### After Testing

1. **Analyze results**
2. **Compare with previous runs**
3. **Identify bottlenecks**
4. **Document findings**
5. **Create optimization tasks**

### Testing Strategy

```
Development → Smoke Test (every commit)
           ↓
Staging    → Load Test (before release)
           ↓
Pre-Prod   → Stress + Spike (capacity planning)
           ↓
Production → Soak Test (major releases)
```

---

## 🎯 Performance Targets

### Response Times

| Endpoint | Target (p95) | Max (p99) |
|----------|--------------|-----------|
| Health check | < 50ms | < 100ms |
| Get tasks | < 200ms | < 500ms |
| Create task | < 300ms | < 600ms |
| Update task | < 200ms | < 500ms |
| Delete task | < 100ms | < 300ms |
| Get stats | < 300ms | < 700ms |

### Throughput

| Metric | Target | Notes |
|--------|--------|-------|
| **Requests/sec** | > 100 | At 20 concurrent users |
| **Concurrent users** | > 50 | Without degradation |
| **Database queries** | < 10ms | Average query time |
| **API latency** | < 200ms | Average response |

### Resource Usage

| Resource | Limit | Warning |
|----------|-------|---------|
| **CPU** | < 70% | At peak load |
| **Memory** | < 80% | No growth over time |
| **Database** | < 60% | Connection pool |
| **Network** | < 50% | Bandwidth |

---

## 🐛 Troubleshooting

### Common Issues

#### 1. Connection Refused
```
ERRO[0000] connection refused
```
**Solution:** Ensure application is running and accessible

#### 2. Rate Limited
```
✗ status is 201 429 Too Many Requests
```
**Solution:** Expected under high load. Verify rate limiting works correctly.

#### 3. Timeouts
```
WARN[0030] Request Failed error="request timeout"
```
**Solution:** Increase timeout or reduce load

#### 4. Failed Checks
```
✗ status is 200 (25% passed)
```
**Solution:** Investigate logs, check application health

---

## 📚 Resources

- **k6 Documentation:** https://k6.io/docs/
- **k6 Examples:** https://k6.io/docs/examples/
- **Performance Testing Guide:** https://k6.io/docs/test-types/introduction/
- **TaskFlow Monitoring:** http://localhost:3001 (Grafana)
- **Prometheus Metrics:** http://localhost:9090

---

## 🏆 Success Criteria Checklist

- [ ] Smoke test passes on every deployment
- [ ] Load test shows < 1% error rate
- [ ] Stress test identifies breaking point > 100 users
- [ ] Spike test shows graceful degradation
- [ ] Soak test runs 1 hour with no degradation
- [ ] All response times within targets
- [ ] No memory leaks detected
- [ ] Resource usage within limits
- [ ] Results documented and tracked

---

**Happy Load Testing! 🚀**

*For questions or issues, contact the DevOps team.*
