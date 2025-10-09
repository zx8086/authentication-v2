/* test/k6/run-all-tests.ts */

// Comprehensive test suite runner for authentication service K6 tests
// Executes all test scenarios in sequence with proper reporting

export interface TestSuite {
  name: string;
  description: string;
  scriptPath: string;
  estimatedDuration: string;
  category: 'smoke' | 'load' | 'stress' | 'scenarios';
  requirements: string[];
}

export const testSuites: TestSuite[] = [
  {
    name: 'Health Smoke Test',
    description: 'Health endpoint validation only',
    scriptPath: 'test/k6/smoke/health-only-smoke.ts',
    estimatedDuration: '3 minutes',
    category: 'smoke',
    requirements: ['Service running at localhost:3000']
  },
  {
    name: 'Metrics Smoke Test',
    description: 'Metrics endpoint validation only',
    scriptPath: 'test/k6/smoke/metrics-only-smoke.ts',
    estimatedDuration: '3 minutes',
    category: 'smoke',
    requirements: ['Service running at localhost:3000']
  },
  {
    name: 'OpenAPI Smoke Test',
    description: 'OpenAPI specification endpoint validation',
    scriptPath: 'test/k6/smoke/openapi-only-smoke.ts',
    estimatedDuration: '3 minutes',
    category: 'smoke',
    requirements: ['Service running at localhost:3000']
  },
  {
    name: 'Token Smoke Test',
    description: 'JWT token generation validation and error handling',
    scriptPath: 'test/k6/smoke/tokens-smoke.ts',
    estimatedDuration: '3 minutes',
    category: 'smoke',
    requirements: ['Service running', 'Kong integration (auto-provisioned)']
  },
  {
    name: 'All Endpoints Smoke Test',
    description: 'Combined validation of all service endpoints',
    scriptPath: 'test/k6/smoke/all-endpoints-smoke.ts',
    estimatedDuration: '3 minutes',
    category: 'smoke',
    requirements: ['Service running at localhost:3000']
  },
  {
    name: 'Authentication Load Test',
    description: 'Normal production load testing with 10-20 VUs over 10 minutes',
    scriptPath: 'test/k6/load/auth-load.ts',
    estimatedDuration: '10 minutes',
    category: 'load',
    requirements: ['Service running', 'Stable network connection', 'Kong available']
  },
  {
    name: 'System Stress Test',
    description: 'Find breaking points with gradual load increase to 250 VUs',
    scriptPath: 'test/k6/stress/system-stress.ts',
    estimatedDuration: '18 minutes',
    category: 'stress',
    requirements: ['Service running', 'High resource availability', 'Kong available']
  },
  {
    name: 'Spike Test',
    description: 'Sudden traffic burst simulation to test system resilience',
    scriptPath: 'test/k6/spike/spike-test.ts',
    estimatedDuration: '8 minutes',
    category: 'scenarios',
    requirements: ['Service running', 'Kong available', 'Monitoring enabled']
  }
];

export const testCategories = {
  smoke: {
    description: 'Quick validation tests (1-3 VUs, 3 minutes each)',
    purpose: 'Verify basic functionality before comprehensive testing',
    totalDuration: '15 minutes (for all 5 smoke tests)',
    tests: testSuites.filter(t => t.category === 'smoke')
  },
  load: {
    description: 'Normal production load simulation',
    purpose: 'Validate performance under expected traffic patterns',
    totalDuration: '10 minutes',
    tests: testSuites.filter(t => t.category === 'load')
  },
  stress: {
    description: 'Breaking point analysis',
    purpose: 'Find system limits and failure modes',
    totalDuration: '18 minutes',
    tests: testSuites.filter(t => t.category === 'stress')
  },
  scenarios: {
    description: 'Spike testing for traffic bursts',
    purpose: 'Validate system resilience under sudden load increases',
    totalDuration: '8 minutes',
    tests: testSuites.filter(t => t.category === 'scenarios')
  }
};

export const executionStrategies = {
  full: {
    name: 'Full Test Suite',
    description: 'Execute all tests in recommended sequence',
    sequence: ['smoke', 'load', 'stress', 'scenarios'],
    totalDuration: '45+ minutes',
    commands: [
      'bun run k6:smoke:health',
      'bun run k6:smoke:metrics',
      'bun run k6:smoke:openapi',
      'bun run k6:smoke:tokens',
      'bun run k6:smoke:all-endpoints',
      'bun run k6:load',
      'bun run k6:stress',
      'bun run k6:spike'
    ]
  },
  quick: {
    name: 'Quick Validation',
    description: 'Essential smoke tests for rapid feedback',
    sequence: ['smoke'],
    totalDuration: '6 minutes',
    commands: [
      'bun run k6:smoke:health',
      'bun run k6:smoke:tokens'
    ]
  },
  comprehensive_smoke: {
    name: 'Comprehensive Smoke Tests',
    description: 'All smoke tests for thorough validation',
    sequence: ['smoke'],
    totalDuration: '15 minutes',
    commands: [
      'bun run k6:smoke:health',
      'bun run k6:smoke:metrics',
      'bun run k6:smoke:openapi',
      'bun run k6:smoke:tokens',
      'bun run k6:smoke:all-endpoints'
    ]
  },
  performance: {
    name: 'Performance Focus',
    description: 'Load and stress tests for performance validation',
    sequence: ['smoke', 'load', 'stress'],
    totalDuration: '34 minutes',
    commands: [
      'bun run k6:smoke:health',
      'bun run k6:load',
      'bun run k6:stress'
    ]
  },
  spike: {
    name: 'Spike Testing',
    description: 'Spike tests for traffic burst validation',
    sequence: ['smoke', 'scenarios'],
    totalDuration: '14 minutes',
    commands: [
      'bun run k6:smoke:health',
      'bun run k6:smoke:tokens',
      'bun run k6:spike'
    ]
  }
};

export const environmentConfigs = {
  local: {
    TARGET_HOST: 'localhost',
    TARGET_PORT: '3000',
    TARGET_PROTOCOL: 'http',
    TIMEOUT: '30s'
  },
  docker: {
    TARGET_HOST: 'localhost',
    TARGET_PORT: '3000',
    TARGET_PROTOCOL: 'http',
    TIMEOUT: '30s'
  },
  staging: {
    TARGET_HOST: 'staging-auth.example.com',
    TARGET_PORT: '443',
    TARGET_PROTOCOL: 'https',
    TIMEOUT: '60s'
  }
};

export const prerequisites = [
  'Bun runtime installed (>= 1.1.35)',
  'K6 installed (>= 0.45.0)',
  'Authentication service running at target endpoint',
  'Kong Konnect integration available (for token tests)',
  'Network connectivity to target system',
  'Sufficient system resources for high-VU tests'
];

export const performanceTargets = {
  baselineExpectations: {
    healthEndpoint: {
      p95ResponseTime: '< 400ms',
      p99ResponseTime: '< 500ms',
      errorRate: '< 1%'
    },
    tokenGeneration: {
      p95ResponseTime: '< 50ms',
      p99ResponseTime: '< 100ms',
      errorRate: '< 1%',
      throughput: '> 1000 tokens/sec'
    },
    systemCapacity: {
      sustainableConcurrentUsers: '> 100',
      peakConcurrentUsers: '> 200',
      memoryUsage: '< 512MB at 100 VUs'
    }
  },
  performanceBudgets: {
    tokenGeneration: '50ms (P95)',
    healthCheck: '30ms (P95)',
    metricsEndpoint: '20ms (P95)',
    openapiSpec: '10ms (P95)'
  },
  slaTargets: {
    availability: '99.9%',
    responseTime: 'P95 < 100ms',
    throughput: '> 10,000 req/min',
    errorRate: '< 0.1%'
  }
};

export const reportingAndAnalysis = {
  metricsToTrack: [
    'Token generation success rate',
    'Response time percentiles (P50, P95, P99)',
    'Requests per second',
    'Error rates by endpoint',
    'Kong cache hit rates',
    'Memory usage patterns',
    'Concurrent user handling',
    'Rate limiting effectiveness'
  ],
  outputFormats: [
    'Console summary (real-time)',
    'JSON results (machine-readable)',
    'Performance trend analysis',
    'Threshold compliance report',
    'Business KPI dashboard'
  ],
  alertThresholds: {
    criticalFailures: [
      'Token generation success rate < 99%',
      'P95 response time > 100ms',
      'Error rate > 1%',
      'System errors > 10 in any test'
    ],
    performanceWarnings: [
      'P95 response time > 50ms',
      'Kong cache hit rate < 80%',
      'Memory usage > 256MB at low load',
      'Performance budget violations > 5%'
    ]
  }
};

// Helper function to display test suite information
export function displayTestInfo() {
  console.log(`
=== AUTHENTICATION SERVICE K6 TEST SUITE ===

📋 AVAILABLE TEST CATEGORIES:
${Object.entries(testCategories).map(([category, info]) => `
  ${category.toUpperCase()}:
    Description: ${info.description}
    Purpose: ${info.purpose}
    Duration: ${info.totalDuration}
    Tests: ${info.tests.length}
`).join('')}

🚀 EXECUTION STRATEGIES:
${Object.entries(executionStrategies).map(([strategy, info]) => `
  ${strategy.toUpperCase()}:
    ${info.description}
    Duration: ${info.totalDuration}
    Commands: ${info.commands.join(' && ')}
`).join('')}

🎯 PERFORMANCE TARGETS:
  Token Generation: ${performanceTargets.baselineExpectations.tokenGeneration.p95ResponseTime}
  Health Checks: ${performanceTargets.baselineExpectations.healthEndpoint.p95ResponseTime}
  Throughput: ${performanceTargets.baselineExpectations.tokenGeneration.throughput}
  Concurrent Users: ${performanceTargets.baselineExpectations.systemCapacity.sustainableConcurrentUsers}

📊 PREREQUISITES:
${prerequisites.map(req => `  ✓ ${req}`).join('\n')}

=== END TEST SUITE INFO ===
  `);
}

export default {
  testSuites,
  testCategories,
  executionStrategies,
  environmentConfigs,
  prerequisites,
  performanceTargets,
  reportingAndAnalysis,
  displayTestInfo
};

// Execute the display function when script is run directly
if (import.meta.main) {
  displayTestInfo();
}