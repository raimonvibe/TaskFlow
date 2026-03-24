/**
 * Soak Test (Endurance Test)
 *
 * Purpose: Test system stability over extended period
 * Duration: ~64 minutes (1 hour + ramp)
 * VUs: 20
 *
 * Run: k6 run soak-test.js
 *
 * Note: This test runs for over 1 hour. Use for production readiness validation.
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { config, sleepDuration, generateTask } from './config.js';

const errorRate = new Rate('errors');
const memoryLeakIndicator = new Trend('response_time_trend');
const totalRequests = new Counter('total_requests');

export const options = {
  stages: config.stages.soak,
  thresholds: {
    'http_req_failed': ['rate<0.01'], // Should be stable
    'http_req_duration': ['p(95)<600'], // Should not degrade over time
    'errors': ['rate<0.02'],
  },
};

export function setup() {
  const loginRes = http.post(`${config.baseURL}/api/auth/login`, JSON.stringify({
    email: config.testUser.email,
    password: config.testUser.password,
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  if (loginRes.status === 200) {
    const body = JSON.parse(loginRes.body);
    return { token: body.token, startTime: Date.now() };
  }

  throw new Error('Failed to login during setup');
}

export default function (data) {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${data.token}`,
  };

  totalRequests.add(1);

  // Realistic user behavior over extended time
  const scenario = Math.random();

  if (scenario < 0.5) {
    // 50%: Browse tasks
    const start = Date.now();
    const res = http.get(`${config.baseURL}/api/tasks`, { headers });
    memoryLeakIndicator.add(Date.now() - start);

    const success = check(res, {
      'browse tasks ok': (r) => r.status === 200,
      'response time stable': (r) => r.timings.duration < 1000,
    });

    errorRate.add(!success);

  } else if (scenario < 0.8) {
    // 30%: Create and update task
    const newTask = generateTask();
    const createRes = http.post(
      `${config.baseURL}/api/tasks`,
      JSON.stringify(newTask),
      { headers }
    );

    const success = check(createRes, {
      'create task ok': (r) => r.status === 201,
    });

    errorRate.add(!success);

    if (createRes.status === 201) {
      const taskId = JSON.parse(createRes.body).id;

      sleep(sleepDuration.medium);

      // Update task
      http.put(
        `${config.baseURL}/api/tasks/${taskId}`,
        JSON.stringify({ status: 'done' }),
        { headers }
      );
    }

  } else {
    // 20%: Get statistics
    const statsRes = http.get(`${config.baseURL}/api/tasks/stats`, { headers });

    check(statsRes, {
      'stats ok': (r) => r.status === 200,
    });
  }

  // Periodic health checks
  if (totalRequests.count % 100 === 0) {
    const healthRes = http.get(`${config.baseURL}/health`);
    check(healthRes, {
      'health still ok after extended time': (r) => r.status === 200,
    });

    // Log progress
    const elapsedMinutes = Math.floor((Date.now() - data.startTime) / 60000);
    console.log(`Soak test running: ${elapsedMinutes} minutes, ${totalRequests.count} requests`);
  }

  sleep(sleepDuration.medium);
}

export function teardown(data) {
  const duration = Math.floor((Date.now() - data.startTime) / 60000);
  console.log(`Soak test completed after ${duration} minutes`);
  console.log('Check for memory leaks, resource exhaustion, or performance degradation');
}
