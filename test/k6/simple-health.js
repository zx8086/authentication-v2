import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    health_test: {
      executor: 'constant-vus',
      vus: 3,
      duration: '30s'
    }
  },
  thresholds: {
    'http_req_duration': ['p(95)<50', 'p(99)<100'],
    'http_req_failed': ['rate<0.01']
  }
};

export default function() {
  const baseUrl = 'http://192.168.178.10:3000';

  // Test health endpoint
  const healthResponse = http.get(`${baseUrl}/health`);
  check(healthResponse, {
    'health status is 200': (r) => r.status === 200,
    'health response time < 50ms': (r) => r.timings.duration < 50,
  });

  sleep(0.5);

  // Test metrics endpoint
  const metricsResponse = http.get(`${baseUrl}/metrics`);
  check(metricsResponse, {
    'metrics status is 200': (r) => r.status === 200,
    'metrics response time < 30ms': (r) => r.timings.duration < 30,
  });

  sleep(0.5);

  // Test OpenAPI endpoint (served at root)
  const openapiResponse = http.get(`${baseUrl}/`);
  check(openapiResponse, {
    'openapi status is 200': (r) => r.status === 200,
    'openapi response time < 20ms': (r) => r.timings.duration < 20,
    'openapi contains spec': (r) => r.body.includes('"openapi": "3.0.3"'),
  });

  sleep(1);
}