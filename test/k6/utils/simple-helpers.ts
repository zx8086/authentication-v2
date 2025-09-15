/* test/k6/utils/simple-helpers.ts */

// Simplified test helpers based on the working simple test pattern

import http from 'k6/http';
import { check, sleep } from 'k6';

const baseUrl = 'http://192.168.178.10:3000';

export const executeHealthCheck = () => {
  const response = http.get(`${baseUrl}/health`);
  return check(response, {
    'health status is 200': (r) => r.status === 200,
    'health response time < 50ms': (r) => r.timings.duration < 50,
    'health has status field': (r) => r.body.includes('"status"'),
  });
};

export const executeMetricsCheck = () => {
  const response = http.get(`${baseUrl}/metrics`);
  return check(response, {
    'metrics status is 200': (r) => r.status === 200,
    'metrics response time < 30ms': (r) => r.timings.duration < 30,
  });
};

export const executeOpenAPICheck = () => {
  const response = http.get(`${baseUrl}/`);
  return check(response, {
    'openapi status is 200': (r) => r.status === 200,
    'openapi response time < 20ms': (r) => r.timings.duration < 20,
    'openapi contains spec': (r) => r.body.includes('"openapi": "3.0.3"'),
  });
};

export const executeTokenRequest = (consumerId = 'test-consumer-001', username = 'loadtest-user-001') => {
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'User-Agent': 'K6-AuthService-LoadTest/1.0',
    'X-Consumer-Id': consumerId,
    'X-Consumer-Username': username,
    'X-Anonymous-Consumer': 'false',
  };

  const response = http.get(`${baseUrl}/tokens`, { headers });
  return check(response, {
    'token status is 200': (r) => r.status === 200,
    'token response time < 50ms': (r) => r.timings.duration < 50,
    'token has access_token': (r) => r.body.includes('"access_token"'),
    'token has expires_in': (r) => r.body.includes('"expires_in": 900'),
  });
};

export const executeUserJourney = (userIndex = 0) => {
  const consumerId = `test-consumer-${String(userIndex + 1).padStart(3, '0')}`;
  const username = `loadtest-user-${String(userIndex + 1).padStart(3, '0')}`;

  // Step 1: Check service health
  executeHealthCheck();
  sleep(0.5);

  // Step 2: Check metrics
  executeMetricsCheck();
  sleep(0.5);

  // Step 3: Generate token
  executeTokenRequest(consumerId, username);
  sleep(0.5);

  // Step 4: Check OpenAPI spec
  executeOpenAPICheck();
  sleep(1);
};

export const executeLoadTest = (userIndex = 0) => {
  const consumerId = `load-consumer-${String(userIndex + 1).padStart(3, '0')}`;
  const username = `load-user-${String(userIndex + 1).padStart(3, '0')}`;

  // Focus on token generation for load testing
  executeTokenRequest(consumerId, username);
  sleep(0.2);
};

export const executeStressTest = (userIndex = 0) => {
  const consumerId = `stress-consumer-${String(userIndex + 1).padStart(3, '0')}`;
  const username = `stress-user-${String(userIndex + 1).padStart(3, '0')}`;

  // Rapid token requests for stress testing
  executeTokenRequest(consumerId, username);
  sleep(0.1);
};