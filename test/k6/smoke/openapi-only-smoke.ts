/* test/k6/smoke/openapi-only-smoke.ts */

// K6 smoke test for OpenAPI endpoint only - tests / endpoint (OpenAPI spec generation)

import http from 'k6/http';
import { check, sleep } from 'k6';
import { getConfig, getPerformanceThresholds, getScenarioConfig } from '../utils/config.ts';

const config = getConfig();
const thresholds = getPerformanceThresholds();
const scenarios = getScenarioConfig();

export const options = {
  scenarios: {
    openapi_only_smoke: scenarios.smoke
  },
  thresholds: thresholds.health.smoke // Reuse health thresholds for now
};

export default function() {
  const baseUrl = config.baseUrl;

  // Test OpenAPI endpoint only (served at root)
  const openapiResponse = http.get(`${baseUrl}/`);
  check(openapiResponse, {
    'openapi status is 200': (r) => r.status === 200,
    'openapi contains spec': (r) => {
      const body = typeof r.body === 'string' ? r.body : '';
      return body.includes('"openapi": "3.0.3"');
    },
    'openapi has info section': (r) => {
      const body = typeof r.body === 'string' ? r.body : '';
      return body.includes('"info"');
    },
    'openapi has paths': (r) => {
      const body = typeof r.body === 'string' ? r.body : '';
      return body.includes('"paths"');
    },
    'openapi has components': (r) => {
      const body = typeof r.body === 'string' ? r.body : '';
      return body.includes('"components"');
    },
    'openapi has schemas': (r) => {
      const body = typeof r.body === 'string' ? r.body : '';
      return body.includes('"schemas"');
    },
  });

  // Test with YAML Accept header
  const yamlResponse = http.get(`${baseUrl}/`, {
    headers: { 'Accept': 'application/yaml' }
  });
  check(yamlResponse, {
    'yaml openapi status is 200': (r) => r.status === 200,
    'yaml contains openapi version': (r) => {
      const body = typeof r.body === 'string' ? r.body : '';
      return body.includes('openapi: "3.0.3"');
    },
    'yaml content type is yaml': (r) => {
      const contentType = r.headers['Content-Type'];
      return contentType ? contentType.includes('yaml') : false;
    },
  });

  sleep(1);
}