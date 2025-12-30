// Load Testing Configuration
export const config = {
  // Base URL - change this for different environments
  baseURL: __ENV.BASE_URL || 'http://localhost:3000',

  // Test user credentials
  testUser: {
    email: __ENV.TEST_USER_EMAIL || 'demo@taskflow.com',
    password: __ENV.TEST_USER_PASSWORD || 'demo123',
  },

  // Performance thresholds
  thresholds: {
    // HTTP errors should be less than 1%
    http_req_failed: ['rate<0.01'],

    // 95% of requests should be below 500ms
    http_req_duration: ['p(95)<500'],

    // 99% of requests should be below 1000ms
    'http_req_duration{expected_response:true}': ['p(99)<1000'],

    // Average response time should be below 200ms
    http_req_duration_avg: ['value<200'],

    // Request rate should be maintained
    http_reqs: ['rate>10'],
  },

  // VU (Virtual User) configurations
  stages: {
    smoke: [
      { duration: '30s', target: 1 }, // 1 user for 30 seconds
    ],

    load: [
      { duration: '2m', target: 10 },  // Ramp up to 10 users
      { duration: '5m', target: 10 },  // Stay at 10 users
      { duration: '2m', target: 20 },  // Ramp up to 20 users
      { duration: '5m', target: 20 },  // Stay at 20 users
      { duration: '2m', target: 0 },   // Ramp down to 0 users
    ],

    stress: [
      { duration: '2m', target: 10 },   // Warm up
      { duration: '5m', target: 50 },   // Ramp to 50
      { duration: '5m', target: 100 },  // Ramp to 100
      { duration: '5m', target: 200 },  // Ramp to 200
      { duration: '10m', target: 200 }, // Stay at 200
      { duration: '5m', target: 0 },    // Recovery
    ],

    spike: [
      { duration: '1m', target: 10 },   // Normal load
      { duration: '30s', target: 200 }, // Spike!
      { duration: '1m', target: 10 },   // Back to normal
      { duration: '30s', target: 300 }, // Bigger spike!
      { duration: '1m', target: 10 },   // Recovery
    ],

    soak: [
      { duration: '2m', target: 20 },   // Ramp up
      { duration: '60m', target: 20 },  // Stay for 1 hour
      { duration: '2m', target: 0 },    // Ramp down
    ],
  },
};

// Sleep durations (in seconds)
export const sleepDuration = {
  short: 1,
  medium: 3,
  long: 5,
};

// Test data generators
export function generateTask() {
  return {
    title: `Test Task ${Date.now()}`,
    description: `This is a test task created during load testing at ${new Date().toISOString()}`,
    status: 'todo',
    priority: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  };
}

export function generateUser() {
  const timestamp = Date.now();
  return {
    username: `testuser_${timestamp}`,
    email: `testuser_${timestamp}@example.com`,
    password: 'TestPassword123!',
  };
}
