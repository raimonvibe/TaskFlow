/**
 * Stress Test
 *
 * Purpose: Find the breaking point of the system
 * Duration: ~32 minutes
 * VUs: 10-200
 *
 * Run: k6 run stress-test.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { config, sleepDuration, generateTask } from './config.js';

const errorRate = new Rate('errors');
const responseTime = new Trend('response_time');

export const options = {
  stages: config.stages.stress,
  thresholds: {
    'http_req_failed': ['rate<0.1'], // Allow up to 10% failures in stress test
    'http_req_duration': ['p(95)<2000'], // More lenient threshold
    'errors': ['rate<0.15'],
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
    return { token: body.token };
  }

  throw new Error('Failed to login during setup');
}

export default function (data) {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${data.token}`,
  };

  // Stress test: Rapid task operations
  group('Rapid Task Operations', function () {
    // Create multiple tasks quickly
    for (let i = 0; i < 3; i++) {
      const newTask = generateTask();
      const start = Date.now();
      const createRes = http.post(
        `${config.baseURL}/api/tasks`,
        JSON.stringify(newTask),
        { headers }
      );

      responseTime.add(Date.now() - start);

      const success = check(createRes, {
        'create status is 201 or 429': (r) => r.status === 201 || r.status === 429,
      });

      errorRate.add(!success);

      if (createRes.status === 201) {
        const taskId = JSON.parse(createRes.body).id;

        // Immediate update
        http.put(
          `${config.baseURL}/api/tasks/${taskId}`,
          JSON.stringify({ status: 'in_progress' }),
          { headers }
        );
      }

      // Very short sleep
      sleep(0.1);
    }
  });

  sleep(sleepDuration.short);

  // Heavy read operations
  group('Heavy Reads', function () {
    const getRes = http.get(`${config.baseURL}/api/tasks`, { headers });

    check(getRes, {
      'get tasks succeeds under stress': (r) => r.status === 200 || r.status === 503,
    });
  });

  sleep(sleepDuration.short);

  // Check system health under stress
  const healthRes = http.get(`${config.baseURL}/health`);
  check(healthRes, {
    'system still responds': (r) => r.status > 0,
  });

  sleep(sleepDuration.short);
}

export function teardown(data) {
  console.log('Stress test completed - Check results for breaking points');
}
