/* test/k6/utils/config.ts */

// Centralized configuration for K6 authentication service tests

export interface K6Config {
  host: string;
  port: number;
  baseUrl: string;
  timeout: string;
  userAgent: string;
  protocol: string;
}

export interface ConsumerConfig {
  id: string;
  username: string;
  isAnonymous: boolean;
}

export const getConfig = (): K6Config => {
  const host = __ENV.TARGET_HOST || '192.168.178.10';
  const port = parseInt(__ENV.TARGET_PORT || '3000', 10);
  const protocol = __ENV.TARGET_PROTOCOL || 'http';

  return {
    host,
    port,
    baseUrl: `${protocol}://${host}:${port}`,
    timeout: __ENV.TIMEOUT || '30s',
    userAgent: 'K6-AuthService-LoadTest/1.0',
    protocol
  };
};

export const getTestConsumer = (index: number = 0): ConsumerConfig => {
  const consumers = [
    { id: 'test-consumer-001', username: 'loadtest-user-001', isAnonymous: false },
    { id: 'test-consumer-002', username: 'loadtest-user-002', isAnonymous: false },
    { id: 'test-consumer-003', username: 'loadtest-user-003', isAnonymous: false },
    { id: 'test-consumer-004', username: 'loadtest-user-004', isAnonymous: false },
    { id: 'test-consumer-005', username: 'loadtest-user-005', isAnonymous: false }
  ];

  return consumers[index % consumers.length];
};

export const getHeaders = (consumer: ConsumerConfig, additionalHeaders: Record<string, string> = {}) => {
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'User-Agent': 'K6-AuthService-LoadTest/1.0',
    'X-Consumer-Id': consumer.id,
    'X-Consumer-Username': consumer.username,
    'X-Anonymous-Consumer': consumer.isAnonymous.toString(),
    ...additionalHeaders
  };
};

export const performanceThresholds = {
  health: {
    smoke: {
      'http_req_duration': ['p(95)<50', 'p(99)<100'],
      'http_req_failed': ['rate<0.01']
    },
    load: {
      'http_req_duration': ['p(95)<100', 'p(99)<200'],
      'http_req_failed': ['rate<0.01']
    },
    stress: {
      'http_req_duration': ['p(95)<200', 'p(99)<500'],
      'http_req_failed': ['rate<0.05']
    }
  },
  tokens: {
    smoke: {
      'http_req_duration{endpoint:tokens}': ['p(95)<50', 'p(99)<100'],
      'http_req_failed{endpoint:tokens}': ['rate<0.01'],
      'token_generation_rate': ['rate>0.99']
    },
    load: {
      'http_req_duration{endpoint:tokens}': ['p(95)<50', 'p(99)<100'],
      'http_req_failed{endpoint:tokens}': ['rate<0.01'],
      'token_generation_rate': ['rate>0.99'],
      'tokens_per_second': ['rate>1000']
    },
    stress: {
      'http_req_duration{endpoint:tokens}': ['p(95)<100', 'p(99)<200'],
      'http_req_failed{endpoint:tokens}': ['rate<0.05'],
      'token_generation_rate': ['rate>0.95']
    }
  },
  metrics: {
    smoke: {
      'http_req_duration{endpoint:metrics}': ['p(95)<30', 'p(99)<50'],
      'http_req_failed{endpoint:metrics}': ['rate<0.01']
    },
    load: {
      'http_req_duration{endpoint:metrics}': ['p(95)<50', 'p(99)<100'],
      'http_req_failed{endpoint:metrics}': ['rate<0.01']
    }
  }
};

export const getScenarioConfig = () => ({
  smoke: {
    executor: 'constant-vus',
    vus: 3,
    duration: '3m'
  },
  load: {
    executor: 'ramping-vus',
    stages: [
      { duration: '2m', target: 10 },
      { duration: '5m', target: 20 },
      { duration: '2m', target: 0 }
    ]
  },
  stress: {
    executor: 'ramping-vus',
    stages: [
      { duration: '2m', target: 50 },
      { duration: '5m', target: 100 },
      { duration: '3m', target: 200 },
      { duration: '2m', target: 0 }
    ]
  },
  spike: {
    executor: 'ramping-vus',
    stages: [
      { duration: '1m', target: 10 },
      { duration: '30s', target: 100 },
      { duration: '3m', target: 100 },
      { duration: '30s', target: 10 },
      { duration: '1m', target: 0 }
    ]
  },
  rampingArrivalRate: {
    executor: 'ramping-arrival-rate',
    startRate: 100,
    timeUnit: '1s',
    preAllocatedVUs: 20,
    maxVUs: 100,
    stages: [
      { target: 500, duration: '2m' },
      { target: 1000, duration: '5m' },
      { target: 2000, duration: '3m' },
      { target: 0, duration: '2m' }
    ]
  }
});

export const commonParams = {
  headers: {
    'User-Agent': 'K6-AuthService-LoadTest/1.0'
  },
  timeout: '30s'
};