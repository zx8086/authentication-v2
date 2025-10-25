/* test/k6/utils/config.ts */

// Centralized configuration for K6 authentication service tests

import { getTestConsumer as getStandardTestConsumer } from "./test-consumers.js";

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
  const host = __ENV.TARGET_HOST || "localhost";
  const port = Number.parseInt(__ENV.TARGET_PORT || "3000", 10);
  const protocol = __ENV.TARGET_PROTOCOL || "http";

  return {
    host,
    port,
    baseUrl: `${protocol}://${host}:${port}`,
    timeout: __ENV.K6_TIMEOUT || __ENV.TIMEOUT || "30s",
    userAgent: "K6-AuthService-LoadTest/1.0",
    protocol,
  };
};

export const getTestConsumer = (index: number = 0): ConsumerConfig => {
  // Use environment variables if provided, otherwise fall back to standard test consumers
  if (__ENV.TEST_CONSUMER_ID_1 || __ENV.TEST_CONSUMER_USERNAME_1) {
    const consumers = [
      {
        id: __ENV.TEST_CONSUMER_ID_1 || "test-consumer-001",
        username: __ENV.TEST_CONSUMER_USERNAME_1 || "loadtest-user-001",
        isAnonymous: false,
      },
      {
        id: __ENV.TEST_CONSUMER_ID_2 || "test-consumer-002",
        username: __ENV.TEST_CONSUMER_USERNAME_2 || "loadtest-user-002",
        isAnonymous: false,
      },
      {
        id: __ENV.TEST_CONSUMER_ID_3 || "test-consumer-003",
        username: __ENV.TEST_CONSUMER_USERNAME_3 || "loadtest-user-003",
        isAnonymous: false,
      },
      {
        id: __ENV.TEST_CONSUMER_ID_4 || "test-consumer-004",
        username: __ENV.TEST_CONSUMER_USERNAME_4 || "loadtest-user-004",
        isAnonymous: false,
      },
      {
        id: __ENV.TEST_CONSUMER_ID_5 || "test-consumer-005",
        username: __ENV.TEST_CONSUMER_USERNAME_5 || "loadtest-user-005",
        isAnonymous: false,
      },
    ];
    return consumers[index % consumers.length];
  }

  // Use standard test consumers from shared configuration
  const standardConsumer = getStandardTestConsumer(index);
  return {
    id: standardConsumer.id,
    username: standardConsumer.username,
    isAnonymous: false,
  };
};

export const getHeaders = (
  consumer: ConsumerConfig,
  additionalHeaders: Record<string, string> = {}
) => {
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    "User-Agent": "K6-AuthService-LoadTest/1.0",
    "X-Consumer-Id": consumer.id,
    "X-Consumer-Username": consumer.username,
    "X-Anonymous-Consumer": consumer.isAnonymous.toString(),
    ...additionalHeaders,
  };
};

export const getPerformanceThresholds = () => {
  // Production-grade thresholds aligned with 100k+ req/sec target
  const healthP95 = Number.parseInt(__ENV.K6_HEALTH_P95_THRESHOLD || "30", 10);
  const healthP99 = Number.parseInt(__ENV.K6_HEALTH_P99_THRESHOLD || "50", 10);
  const tokensP95 = Number.parseInt(__ENV.K6_TOKENS_P95_THRESHOLD || "10", 10);  // Sub-10ms target
  const tokensP99 = Number.parseInt(__ENV.K6_TOKENS_P99_THRESHOLD || "50", 10);
  const metricsP95 = Number.parseInt(__ENV.K6_METRICS_P95_THRESHOLD || "20", 10);
  const metricsP99 = Number.parseInt(__ENV.K6_METRICS_P99_THRESHOLD || "30", 10);
  const errorRate = Number.parseFloat(__ENV.K6_ERROR_RATE_THRESHOLD || "0.005");  // 99.5% success
  const stressErrorRate = Number.parseFloat(__ENV.K6_STRESS_ERROR_RATE_THRESHOLD || "0.02");  // 98% under stress
  const throughputMinimum = Number.parseInt(__ENV.K6_THROUGHPUT_MINIMUM || "1000", 10);  // 1k req/sec minimum

  // Check if thresholds should be non-blocking (continue execution even if violated)
  const nonBlocking = __ENV.K6_THRESHOLDS_NON_BLOCKING === "true";

  // If non-blocking is enabled, return structure with empty thresholds
  if (nonBlocking) {
    console.log("⚠️  Non-blocking mode enabled: Threshold violations will not stop test execution");
    return {
      health: {
        smoke: {},
        load: {},
        stress: {},
      },
      tokens: {
        smoke: {},
        load: {},
        stress: {},
      },
      metrics: {
        smoke: {},
        load: {},
      },
    };
  }

  return {
    health: {
      smoke: {
        'http_req_duration{endpoint:health}': [`p(95)<${healthP95}`, `p(99)<${healthP99}`, `avg<15`],
        'http_req_failed{endpoint:health}': [`rate<${errorRate}`],
      },
      load: {
        'http_req_duration{endpoint:health}': [`p(95)<${healthP95}`, `p(99)<${healthP99}`, `avg<20`],
        'http_req_failed{endpoint:health}': [`rate<${errorRate}`],
        'http_reqs{endpoint:health}': [`rate>${throughputMinimum / 10}`], // 10% of total throughput
      },
      stress: {
        'http_req_duration{endpoint:health}': [`p(95)<${healthP95 * 3}`, `p(99)<${healthP99 * 4}`],
        'http_req_failed{endpoint:health}': [`rate<${stressErrorRate}`],
      },
    },
    tokens: {
      smoke: {
        'http_req_duration{endpoint:tokens}': [`p(95)<${tokensP95}`, `p(99)<${tokensP99}`, `avg<5`],
        'http_req_failed{endpoint:tokens}': [`rate<${errorRate}`],
        'jwt_signing_time': [`p(95)<5`, `p(99)<10`], // Sub-10ms JWT signing
      },
      load: {
        'http_req_duration{endpoint:tokens}': [`p(95)<${tokensP95}`, `p(99)<${tokensP99}`, `avg<8`],
        'http_req_failed{endpoint:tokens}': [`rate<${errorRate}`],
        'http_reqs{endpoint:tokens}': [`rate>${throughputMinimum}`], // 1k+ tokens/sec
        'token_generation_rate': [`rate>0.95`], // 95% success rate
      },
      stress: {
        'http_req_duration{endpoint:tokens}': [`p(95)<${tokensP95 * 3}`, `p(99)<${tokensP99 * 3}`],
        'http_req_failed{endpoint:tokens}': [`rate<${stressErrorRate}`],
        'http_reqs{endpoint:tokens}': [`rate>${throughputMinimum / 2}`], // 500+ tokens/sec under stress
      },
    },
    metrics: {
      smoke: {
        http_req_duration: [`p(95)<${metricsP95}`, `p(99)<${metricsP99}`],
        http_req_failed: [`rate<${errorRate}`],
      },
      load: {
        http_req_duration: [`p(95)<${metricsP95 + 20}`, `p(99)<${metricsP99 + 50}`],
        http_req_failed: [`rate<${errorRate}`],
      },
    },
    soak: {
      // Soak test thresholds - focus on stability over time
      http_req_duration: [`p(95)<${healthP95}`, `p(99)<${healthP99}`, `avg<200`],
      http_req_failed: [`rate<${errorRate}`],
      // Key soak metrics - performance shouldn't degrade over time
      "http_req_duration{endpoint:tokens}": [`p(95)<${tokensP95}`, `avg<30`],
      "http_req_duration{endpoint:health}": [`p(95)<${healthP95}`, `avg<100`],
    },
  };
};

export const getScenarioConfig = () => ({
  smoke: {
    executor: "constant-vus",
    vus: Number.parseInt(__ENV.K6_SMOKE_VUS || "3", 10),
    duration: __ENV.K6_SMOKE_DURATION || "3m",
  },
  load: {
    executor: "ramping-vus",
    stages: [
      {
        duration: __ENV.K6_LOAD_RAMP_UP_DURATION || "2m",
        target: Number.parseInt(__ENV.K6_LOAD_INITIAL_VUS || "10", 10),
      },
      {
        duration: __ENV.K6_LOAD_STEADY_DURATION || "5m",
        target: Number.parseInt(__ENV.K6_LOAD_TARGET_VUS || "20", 10),
      },
      {
        duration: __ENV.K6_LOAD_RAMP_DOWN_DURATION || "2m",
        target: 0,
      },
    ],
  },
  stress: {
    executor: "ramping-vus",
    stages: [
      {
        duration: "2m",
        target: Number.parseInt(__ENV.K6_STRESS_INITIAL_VUS || "50", 10),
      },
      {
        duration: __ENV.K6_STRESS_DURATION || "5m",
        target: Number.parseInt(__ENV.K6_STRESS_TARGET_VUS || "100", 10),
      },
      {
        duration: "3m",
        target: Number.parseInt(__ENV.K6_STRESS_PEAK_VUS || "200", 10),
      },
      {
        duration: "2m",
        target: 0,
      },
    ],
  },
  spike: {
    executor: "ramping-vus",
    stages: [
      {
        duration: "1m",
        target: Number.parseInt(__ENV.K6_SPIKE_BASELINE_VUS || "10", 10),
      },
      {
        duration: "30s",
        target: Number.parseInt(__ENV.K6_SPIKE_TARGET_VUS || "100", 10),
      },
      {
        duration: __ENV.K6_SPIKE_DURATION || "3m",
        target: Number.parseInt(__ENV.K6_SPIKE_TARGET_VUS || "100", 10),
      },
      {
        duration: "30s",
        target: Number.parseInt(__ENV.K6_SPIKE_BASELINE_VUS || "10", 10),
      },
      {
        duration: "1m",
        target: 0,
      },
    ],
  },
  soak: {
    executor: "constant-vus",
    vus: Number.parseInt(__ENV.K6_SOAK_VUS || "10", 10),
    duration: __ENV.K6_SOAK_DURATION || "2h",
  },
  rampingArrivalRate: {
    executor: "ramping-arrival-rate",
    startRate: 100,
    timeUnit: "1s",
    preAllocatedVUs: 20,
    maxVUs: Number.parseInt(__ENV.K6_LOAD_TARGET_VUS || "100", 10),
    stages: [
      { target: 500, duration: "2m" },
      { target: 1000, duration: "5m" },
      { target: 2000, duration: "3m" },
      { target: 0, duration: "2m" },
    ],
  },
});

export const commonParams = {
  headers: {
    "User-Agent": "K6-AuthService-LoadTest/1.0",
  },
  timeout: "30s",
};
