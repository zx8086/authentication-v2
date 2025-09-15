/* test/k6/smoke/health-smoke-fixed.ts */

// Fixed smoke test using simple working pattern

import { sleep } from 'k6';
import { Options } from 'k6/options';
import { executeHealthCheck, executeMetricsCheck, executeOpenAPICheck } from '../utils/simple-helpers.ts';

export const options: Options = {
  scenarios: {
    health_smoke: {
      executor: 'constant-vus',
      vus: 3,
      duration: '30s'  // Shortened for quick validation
    }
  },
  thresholds: {
    'http_req_duration': ['p(95)<50', 'p(99)<100'],
    'http_req_failed': ['rate<0.01']
  }
};

export default function(): void {
  // Test all health-related endpoints
  executeHealthCheck();
  sleep(0.5);

  executeMetricsCheck();
  sleep(0.5);

  executeOpenAPICheck();
  sleep(1);
}