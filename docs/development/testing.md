# Testing Strategy

## Three-Tier Testing Approach

The authentication service implements a comprehensive testing strategy with automatic test consumer setup across all frameworks. Recent improvements include enhanced test coverage (80.78% overall) and modular test architecture with proper isolation.

### Test Coverage Achievements
- **Overall Coverage**: 80%+ line coverage
- **Total Test Count**: 210+ tests (100% pass rate) across all frameworks
  - **Bun Unit/Integration Tests**: 178 tests across 10 files
  - **Playwright E2E Tests**: 32 tests across 3 files
- **Integration Tests**: Executing in CI with live server validation
- **Kong Service Test Suite**: 83 comprehensive test cases across 4 service files (100% coverage)
  - **Kong API Gateway Service**: 33 test cases (100% coverage)
  - **Kong Konnect Service**: 24 test cases covering cloud and self-hosted environments
  - **Circuit Breaker Service**: 26 test cases for Kong Admin API resilience and stale cache fallback
  - **Shared Circuit Breaker**: Comprehensive testing with real endpoint integration
- **Kong Factory Pattern**: 100% coverage with mode validation
- **Logger Utility**: 46.58% coverage with error-free execution validation
- **Server Integration**: Complete HTTP endpoint testing with proper mock isolation
- **CI/CD Execution**: All tests passing in automated pipeline with performance validation
- **Circuit Breaker Testing**: Complete coverage of Kong failure scenarios and fallback mechanisms

## 1. Bun Unit & Integration Tests

Located in `test/bun/` directory.

### Running Tests
```bash
# Run all tests
bun run bun:test

# Run specific test files
bun test test/bun/config.test.ts
bun test test/bun/jwt.service.test.ts
bun test test/bun/kong.service.test.ts
bun test test/bun/kong-api-gateway.service.test.ts
bun test test/bun/kong-konnect.service.test.ts
bun test test/bun/circuit-breaker.service.test.ts
bun test test/bun/kong.factory.test.ts
bun test test/bun/logger.test.ts
bun test test/bun/server.test.ts

# Run with coverage
bun run bun:test:coverage

# Watch mode for development
bun run bun:test:watch

# Concurrent execution (faster)
bun run bun:test:concurrent
```

### Test Categories
- **Configuration Tests**: Validate 4-pillar configuration pattern
- **JWT Service Tests**: Token generation and validation
- **Kong Integration Tests**: API Gateway and Konnect modes
- **Circuit Breaker Tests**: Resilience and failover scenarios
- **Cache Tests**: In-memory and Redis cache implementations
- **Server Tests**: HTTP endpoint integration

## 2. Playwright E2E Tests

Located in `test/playwright/` directory.

### Running E2E Tests
```bash
# Run all E2E tests
bun run playwright:test

# Run CI-safe tests only (no Kong dependency)
npx playwright test --project=ci-chromium

# Run full business tests (requires Kong)
npx playwright test --project=chromium

# Interactive test runner
bun run playwright:ui

# Debug mode
npx playwright test --debug

# Specific test files
npx playwright test test/playwright/ci-safe.e2e.ts
npx playwright test test/playwright/consolidated-business.e2e.ts
```

### Test Projects
- **ci-safe**: Kong-independent API validation tests
- **chromium/firefox/webkit**: Full business flow tests
- **mobile**: Mobile browser testing
- **profiling**: Performance analysis tests

### CI-Safe Tests
Tests that run in CI without Kong dependencies:
- Health endpoint validation
- Metrics endpoint functionality
- OpenAPI documentation availability
- Error handling consistency
- CORS support validation

### Full Business Tests
Comprehensive tests requiring Kong Gateway:
- JWT token generation flow
- Consumer authentication
- Security enforcement
- Performance characteristics
- Telemetry and observability

## 3. K6 Performance Testing

Located in `test/k6/` directory.

### Running Performance Tests
```bash
# Quick smoke tests
bun run k6:quick               # Health + tokens smoke tests
bun run k6:smoke:health        # Health endpoint only
bun run k6:smoke:tokens        # JWT token generation

# Load testing
bun run k6:load                # Sustained load testing

# Stress testing
bun run k6:stress              # High-load stress testing

# Individual test files
k6 run test/k6/smoke/health-smoke.ts
k6 run test/k6/smoke/tokens-smoke.ts
k6 run test/k6/load/auth-load.ts
k6 run test/k6/stress/system-stress.ts
```

### Performance Test Categories

#### Smoke Tests
- **Health Smoke**: Basic health endpoint validation
- **Tokens Smoke**: JWT generation performance baseline
- **OpenAPI Smoke**: Documentation endpoint performance

#### Load Tests
- **Authentication Load**: Sustained JWT generation under load
- **System Load**: Complete system performance under normal load

#### Stress Tests
- **High Load**: System behavior under extreme load
- **Resource Limits**: Memory and CPU stress testing

### Performance Thresholds
```javascript
export const options = {
  thresholds: {
    http_req_duration: ['p(95)<100', 'p(99)<200'],
    http_req_failed: ['rate<0.01'],
    http_reqs: ['rate>1000'],
  },
};
```

## Test Environment Configuration

### Environment Variables for Testing
```bash
# Test execution parameters
K6_SMOKE_VUS=3
K6_SMOKE_DURATION=3m
K6_LOAD_TARGET_VUS=20
K6_STRESS_TARGET_VUS=100

# Target service configuration
TARGET_HOST=localhost
TARGET_PORT=3000
TARGET_PROTOCOL=http
K6_TIMEOUT=30s

# Playwright configuration
E2E_TRACE=on-first-retry
E2E_VIDEO=retain-on-failure
E2E_SCREENSHOT=only-on-failure
```

### Kong Test Configuration
```bash
# Kong test environment
KONG_MODE=API_GATEWAY
KONG_ADMIN_URL=http://kong-test:8001
KONG_ADMIN_TOKEN=test-token-123

# Test consumer setup
TEST_CONSUMER_ID=test-consumer-001
TEST_CONSUMER_USERNAME=test-consumer-001
```

## Testing Best Practices

### Unit Testing
- Mock external dependencies (Kong, Redis)
- Test business logic in isolation
- Validate error scenarios thoroughly
- Use descriptive test names and structure

### Integration Testing
- Test service interactions with real dependencies
- Validate circuit breaker behavior
- Test cache implementations and failover
- Verify telemetry and observability

### E2E Testing
- Test complete user flows
- Validate API contracts
- Test authentication and authorization
- Verify error handling and edge cases

### Performance Testing
- Establish performance baselines
- Test under various load conditions
- Monitor resource utilization
- Validate SLA compliance

## Test Data Management

### Test Consumers
Shared test consumer definitions in `test/shared/test-consumers.ts`:
```typescript
export const BASIC_TEST_CONSUMERS = [
  {
    id: "f48534e1-4caf-4106-9103-edf38eae7ebc",
    username: "test-consumer-001",
    custom_id: "test-consumer-001",
    description: "Primary test consumer for basic authentication tests",
  },
  // Additional test consumers...
];
```

### Test Secrets
Secure test secret management in `test/shared/test-consumer-secrets.ts`:
```typescript
export class TestConsumerSecretFactory {
  static generateTestSecret(consumerId: string): ConsumerSecret {
    return {
      key: `test-key-${consumerId}`,
      secret: `test-secret-${consumerId}-${Date.now()}`,
    };
  }
}
```

## CI/CD Integration

### GitHub Actions Workflow
Tests run automatically in CI with proper isolation:
- **Bun Tests**: Unit and integration tests with mocked dependencies
- **Playwright Tests**: CI-safe tests only (Kong-independent)
- **Performance Tests**: Basic smoke tests for regression detection

### Test Artifacts
- **Coverage Reports**: Uploaded to CI for tracking
- **Test Results**: JUnit XML for integration with CI tools
- **Performance Reports**: K6 results for performance monitoring
- **Screenshots/Videos**: Playwright test artifacts on failure

## Debugging Tests

### Debugging Bun Tests
```bash
# Run single test with debug output
bun test --verbose test/bun/specific.test.ts

# Debug with Node.js debugger
bun --inspect test specific.test.ts
```

### Debugging Playwright Tests
```bash
# Debug mode with browser
npx playwright test --debug

# Headed mode
npx playwright test --headed

# Trace viewer
npx playwright show-trace trace.zip
```

### Debugging K6 Tests
```bash
# Verbose output
k6 run --verbose test/k6/specific.ts

# Debug logging
K6_LOG_LEVEL=debug k6 run test/k6/specific.ts
```

## Test Maintenance

### Regular Tasks
- Update test dependencies monthly
- Review and update performance thresholds
- Validate test coverage remains above 80%
- Update test data and consumers as needed

### Adding New Tests
1. Follow existing test structure and naming conventions
2. Include both positive and negative test cases
3. Add appropriate assertions and error checking
4. Update test documentation and CI configuration

### Test Performance
- Keep test execution time reasonable (<5 minutes for full suite)
- Use parallel execution where possible
- Mock external dependencies to reduce flakiness
- Regular cleanup of test artifacts and temporary data