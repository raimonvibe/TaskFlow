/**
 * Smoke Test
 *
 * Purpose: Verify the system works under minimal load
 * Duration: ~1 minute
 * VUs: 1-2
 *
 * Run: k6 run smoke-test.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { config, sleepDuration, generateTask } from './config.js';

export const options = {
  stages: config.stages.smoke,
  thresholds: config.thresholds,
};

let authToken = null;

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

  console.error('Failed to login during setup');
  return null;
}

export default function (data) {
  if (!data || !data.token) {
    console.error('No auth token available');
    return;
  }

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${data.token}`,
  };

  // Test 1: Health check
  const healthRes = http.get(`${config.baseURL}/health`);
  check(healthRes, {
    'health check status is 200': (r) => r.status === 200,
    'health check response time < 100ms': (r) => r.timings.duration < 100,
  });

  sleep(sleepDuration.short);

  // Test 2: Get current user
  const userRes = http.get(`${config.baseURL}/api/auth/me`, { headers });
  check(userRes, {
    'get user status is 200': (r) => r.status === 200,
    'get user has email': (r) => JSON.parse(r.body).email !== undefined,
  });

  sleep(sleepDuration.short);

  // Test 3: Get tasks
  const tasksRes = http.get(`${config.baseURL}/api/tasks`, { headers });
  check(tasksRes, {
    'get tasks status is 200': (r) => r.status === 200,
    'get tasks returns array': (r) => Array.isArray(JSON.parse(r.body)),
  });

  sleep(sleepDuration.short);

  // Test 4: Create a task
  const newTask = generateTask();
  const createRes = http.post(
    `${config.baseURL}/api/tasks`,
    JSON.stringify(newTask),
    { headers }
  );
  check(createRes, {
    'create task status is 201': (r) => r.status === 201,
    'create task returns id': (r) => JSON.parse(r.body).id !== undefined,
  });

  if (createRes.status === 201) {
    const taskId = JSON.parse(createRes.body).id;

    sleep(sleepDuration.short);

    // Test 5: Get specific task
    const getTaskRes = http.get(`${config.baseURL}/api/tasks/${taskId}`, { headers });
    check(getTaskRes, {
      'get task status is 200': (r) => r.status === 200,
      'get task returns correct id': (r) => JSON.parse(r.body).id === taskId,
    });

    sleep(sleepDuration.short);

    // Test 6: Update task
    const updateRes = http.put(
      `${config.baseURL}/api/tasks/${taskId}`,
      JSON.stringify({ status: 'in_progress' }),
      { headers }
    );
    check(updateRes, {
      'update task status is 200': (r) => r.status === 200,
    });

    sleep(sleepDuration.short);

    // Test 7: Delete task
    const deleteRes = http.del(`${config.baseURL}/api/tasks/${taskId}`, { headers });
    check(deleteRes, {
      'delete task status is 200 or 204': (r) => r.status === 200 || r.status === 204,
    });
  }

  sleep(sleepDuration.short);

  // Test 8: Get task statistics
  const statsRes = http.get(`${config.baseURL}/api/tasks/stats`, { headers });
  check(statsRes, {
    'get stats status is 200': (r) => r.status === 200,
  });

  sleep(sleepDuration.medium);
}

export function teardown(data) {
  console.log('Smoke test completed');
}
