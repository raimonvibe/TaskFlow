/**
 * Load Test
 *
 * Purpose: Test system performance under expected load
 * Duration: ~16 minutes
 * VUs: 10-20
 *
 * Run: k6 run load-test.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { config, sleepDuration, generateTask } from './config.js';

// Custom metrics
const errorRate = new Rate('errors');
const taskCreationTime = new Trend('task_creation_duration');
const taskRetrievalTime = new Trend('task_retrieval_duration');
const apiCallCount = new Counter('api_calls');

export const options = {
  stages: config.stages.load,
  thresholds: {
    ...config.thresholds,
    'errors': ['rate<0.05'], // Error rate should be less than 5%
    'task_creation_duration': ['p(95)<300'],
    'task_retrieval_duration': ['p(95)<200'],
  },
};

export function setup() {
  // Login to get auth token
  const loginRes = http.post(`${config.baseURL}/api/auth/login`, JSON.stringify({
    email: config.testUser.email,
    password: config.testUser.password,
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  if (loginRes.status === 200) {
    const body = JSON.parse(loginRes.body);
    return { token: body.token };
  }

  throw new Error('Failed to login during setup');
}

export default function (data) {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${data.token}`,
  };

  // Scenario 1: Browse tasks (60% of users)
  if (Math.random() < 0.6) {
    group('Browse Tasks', function () {
      const start = Date.now();
      const res = http.get(`${config.baseURL}/api/tasks`, { headers });
      taskRetrievalTime.add(Date.now() - start);
      apiCallCount.add(1);

      const success = check(res, {
        'status is 200': (r) => r.status === 200,
        'response time < 500ms': (r) => r.timings.duration < 500,
      });

      errorRate.add(!success);
    });

    sleep(sleepDuration.short);

    // Get task statistics
    group('View Statistics', function () {
      const res = http.get(`${config.baseURL}/api/tasks/stats`, { headers });
      apiCallCount.add(1);

      const success = check(res, {
        'stats status is 200': (r) => r.status === 200,
      });

      errorRate.add(!success);
    });
  }

  // Scenario 2: Create and manage tasks (30% of users)
  else if (Math.random() < 0.75) {
    group('Create Task', function () {
      const newTask = generateTask();
      const start = Date.now();
      const res = http.post(
        `${config.baseURL}/api/tasks`,
        JSON.stringify(newTask),
        { headers }
      );
      taskCreationTime.add(Date.now() - start);
      apiCallCount.add(1);

      const success = check(res, {
        'create status is 201': (r) => r.status === 201,
        'create time < 300ms': (r) => r.timings.duration < 300,
      });

      errorRate.add(!success);

      if (res.status === 201) {
        const taskId = JSON.parse(res.body).id;

        sleep(sleepDuration.short);

        // Update the task
        group('Update Task', function () {
          const updateRes = http.put(
            `${config.baseURL}/api/tasks/${taskId}`,
            JSON.stringify({ status: 'in_progress' }),
            { headers }
          );
          apiCallCount.add(1);

          const updateSuccess = check(updateRes, {
            'update status is 200': (r) => r.status === 200,
          });

          errorRate.add(!updateSuccess);
        });

        sleep(sleepDuration.short);

        // Complete the task
        group('Complete Task', function () {
          const completeRes = http.put(
            `${config.baseURL}/api/tasks/${taskId}`,
            JSON.stringify({ status: 'done' }),
            { headers }
          );
          apiCallCount.add(1);

          const completeSuccess = check(completeRes, {
            'complete status is 200': (r) => r.status === 200,
          });

          errorRate.add(!completeSuccess);
        });
      }
    });
  }

  // Scenario 3: Search and filter (10% of users)
  else {
    group('Search and Filter', function () {
      // Filter by status
      const statusRes = http.get(
        `${config.baseURL}/api/tasks?status=in_progress`,
        { headers }
      );
      apiCallCount.add(1);

      check(statusRes, {
        'filter by status works': (r) => r.status === 200,
      });

      sleep(sleepDuration.short);

      // Filter by priority
      const priorityRes = http.get(
        `${config.baseURL}/api/tasks?priority=high`,
        { headers }
      );
      apiCallCount.add(1);

      check(priorityRes, {
        'filter by priority works': (r) => r.status === 200,
      });
    });
  }

  sleep(sleepDuration.medium);

  // Health check (all users occasionally)
  if (Math.random() < 0.1) {
    group('Health Check', function () {
      const healthRes = http.get(`${config.baseURL}/health`);
      apiCallCount.add(1);

      check(healthRes, {
        'health check ok': (r) => r.status === 200,
      });
    });
  }

  sleep(sleepDuration.short);
}

export function teardown(data) {
  console.log('Load test completed');
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'load-test-results.json': JSON.stringify(data),
  };
}

function textSummary(data, options = {}) {
  return `
  Load Test Summary
  =================

  Total Requests: ${data.metrics.http_reqs.values.count}
  Request Rate: ${data.metrics.http_reqs.values.rate.toFixed(2)}/s

  Response Times:
    - Average: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms
    - P95: ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms
    - P99: ${data.metrics.http_req_duration.values['p(99)'].toFixed(2)}ms

  Error Rate: ${(data.metrics.errors?.values.rate * 100 || 0).toFixed(2)}%
  Failed Requests: ${(data.metrics.http_req_failed?.values.rate * 100 || 0).toFixed(2)}%

  Custom Metrics:
    - API Calls: ${data.metrics.api_calls?.values.count || 0}
    - Avg Task Creation: ${data.metrics.task_creation_duration?.values.avg.toFixed(2)}ms
    - Avg Task Retrieval: ${data.metrics.task_retrieval_duration?.values.avg.toFixed(2)}ms
  `;
}
