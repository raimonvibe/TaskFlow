/**
 * Spike Test
 *
 * Purpose: Test system behavior under sudden traffic spikes
 * Duration: ~4 minutes
 * VUs: 10-300
 *
 * Run: k6 run spike-test.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';
import { config, sleepDuration, generateTask } from './config.js';

const errorRate = new Rate('errors');
const recoveryRate = new Rate('recovery');

export const options = {
  stages: config.stages.spike,
  thresholds: {
    'http_req_failed': ['rate<0.2'], // Allow 20% failures during spike
    'errors': ['rate<0.25'],
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

  // During spike: Create tasks aggressively
  const newTask = generateTask();
  const createRes = http.post(
    `${config.baseURL}/api/tasks`,
    JSON.stringify(newTask),
    { headers }
  );

  const success = check(createRes, {
    'request succeeds or rate limited': (r) =>
      r.status === 201 || r.status === 429 || r.status === 503,
  });

  errorRate.add(!success);

  // Check if system recovers after spike
  if (createRes.status === 200 || createRes.status === 201) {
    recoveryRate.add(1);
  } else {
    recoveryRate.add(0);
  }

  sleep(0.5); // Minimal sleep during spike

  // Test read operations
  const getRes = http.get(`${config.baseURL}/api/tasks`, { headers });
  check(getRes, {
    'can still read during spike': (r) => r.status === 200 || r.status === 429,
  });

  sleep(sleepDuration.short);
}

export function teardown(data) {
  console.log('Spike test completed - Verify system recovery');
}
