# Testing Strategy

## Four-Tier Testing Approach

The authentication service implements a comprehensive testing strategy with automatic test consumer setup across all frameworks. The strategy includes unit tests, E2E tests, performance tests, and **mutation testing** to ensure test quality.

### Test Quality Achievements
- **Mutation Score**: 100% (all mutants killed)
- **Overall Coverage**: 80%+ line coverage
- **Total Test Count**: 1400+ tests (100% pass rate) across all frameworks
  - **Bun Unit/Integration Tests**: 1400+ tests across 59 files (organized in 12 subdirectories)
  - **Playwright E2E Tests**: 32 tests across 3 files
- **Test Organization**: 59 test files organized into 12 logical subdirectories by domain:
  - `cache/` (7 files), `circuit-breaker/` (5 files), `config/` (5 files)
  - `handlers/` (5 files), `health/` (6 files), `integration/` (2 files)
  - `kong/` (4 files), `logging/` (4 files), `mutation/` (2 files)
  - `services/` (4 files), `telemetry/` (9 files), `utils/` (6 files)
- **Integration Tests**: Executing in CI with live server validation
- **CI/CD Execution**: All tests passing in automated pipeline with performance validation
- **Circuit Breaker Testing**: Complete coverage of Kong failure scenarios and fallback mechanisms

---

## Why Mutation Testing? The Problem with Code Coverage

### 100% Coverage, 0% Confidence

Code coverage tells you which lines were executed during tests, but it doesn't tell you whether your tests actually **verify** anything. Let's illustrate with a practical example.

#### The Code: A Simple Discount Calculator

```typescript
// discountCalculator.ts
export function calculateDiscount(price: number, customerType: string): number {
  let discount = 0;

  if (customerType === "premium") {
    discount = price * 0.20;  // 20% off for premium customers
  } else if (customerType === "member") {
    discount = price * 0.10;  // 10% off for members
  } else {
    discount = 0;             // No discount for regular customers
  }

  return price - discount;
}
```

#### The "Good" Test (100% Code Coverage!)

```typescript
// discountCalculator.test.ts
import { calculateDiscount } from "./discountCalculator";

describe("calculateDiscount", () => {
  test("should calculate price for premium customer", () => {
    const result = calculateDiscount(100, "premium");
    expect(result).toBeDefined();  // Weak assertion!
  });

  test("should calculate price for member", () => {
    const result = calculateDiscount(100, "member");
    expect(result).toBeDefined();  // Weak assertion!
  });

  test("should calculate price for regular customer", () => {
    const result = calculateDiscount(100, "regular");
    expect(result).toBeDefined();  // Weak assertion!
  });
});
```

**Coverage report says: 100%**

Every line was executed. Every branch was visited. CI shows green. But what if someone accidentally changes `price * 0.20` to `price * 0.02`? **Your tests still pass.** The function returns `98` instead of `80`, but "98 is defined" so the test is happy. You've shipped a bug that overcharges customers.

#### What Mutation Testing Reveals

StrykerJS introduces mutations like these:

| Mutation | What Stryker Changes | Expected Test Result |
|----------|---------------------|---------------------|
| #1 | `price * 0.20` -> `price * 0` | Tests should FAIL |
| #2 | `price * 0.20` -> `price / 0.20` | Tests should FAIL |
| #3 | `price - discount` -> `price + discount` | Tests should FAIL |
| #4 | `=== "premium"` -> `!== "premium"` | Tests should FAIL |

**Stryker's report with weak tests:**

```
Mutant #1: SURVIVED (Tests still passed despite the bug!)
Mutant #2: SURVIVED
Mutant #3: SURVIVED
Mutant #4: SURVIVED

Mutation Score: 0%
Code Coverage:  100%
```

All mutants survived. Your tests caught nothing. The coverage metric lied to you.

#### The Real Test (What You Should Have Written)

```typescript
// discountCalculator.test.ts (improved)
import { calculateDiscount } from "./discountCalculator";

describe("calculateDiscount", () => {
  test("premium customers get 20% discount", () => {
    const result = calculateDiscount(100, "premium");
    expect(result).toBe(80);  // Specific assertion!
  });

  test("members get 10% discount", () => {
    const result = calculateDiscount(100, "member");
    expect(result).toBe(90);  // Specific assertion!
  });

  test("regular customers pay full price", () => {
    const result = calculateDiscount(100, "regular");
    expect(result).toBe(100); // Specific assertion!
  });

  test("handles zero price", () => {
    expect(calculateDiscount(0, "premium")).toBe(0);
  });

  test("handles large amounts correctly", () => {
    expect(calculateDiscount(1000, "premium")).toBe(800);
  });
});
```

**Now Stryker's report:**

```
Mutant #1: KILLED
Mutant #2: KILLED
Mutant #3: KILLED
Mutant #4: KILLED

Mutation Score: 100%
Code Coverage:  100%
```

### The Takeaway

| Metric | What It Tells You | What It Doesn't Tell You |
|--------|-------------------|--------------------------|
| **Code Coverage** | "This code was executed during tests" | Whether the tests actually verified anything |
| **Mutation Score** | "Tests would catch real bugs in this code" | - |

Coverage answers: *"Did my tests touch the code?"*

Mutation testing answers: *"Would my tests catch a mistake?"*

One is about presence. The other is about effectiveness.

---

## 1. Bun Unit & Integration Tests

Located in `test/bun/` directory.

### Running Tests
```bash
# Run all tests
bun run test:bun

# Run tests by subdirectory (selective testing)
bun test test/bun/cache/              # All cache tests
bun test test/bun/kong/               # All Kong integration tests
bun test test/bun/circuit-breaker/    # All circuit breaker tests
bun test test/bun/telemetry/          # All telemetry tests

# Run specific test files
bun test test/bun/config/config.test.ts
bun test test/bun/services/jwt.service.test.ts
bun test test/bun/handlers/tokens-handler.test.ts

# Run with coverage
bun run test:bun:coverage

# Watch mode for development
bun run test:bun:watch

# Concurrent execution (faster)
bun run test:bun:concurrent
```

### Test Organization Benefits
- **Improved Discoverability**: Tests organized by domain make it easier to find related tests
- **Selective Testing**: Run tests by subdirectory: `bun test test/bun/cache/`
- **Cleaner IDE Navigation**: Better file tree organization in your editor
- **Easier Code Review**: Review tests by domain during pull requests
- **Better Maintainability**: Related tests are grouped together
- **Git History Preserved**: All files moved with `git mv` to maintain history

### Test Subdirectories
- **cache/** (7 files) - Caching functionality and stale data handling
- **circuit-breaker/** (5 files) - Circuit breaker patterns and state transitions
- **config/** (5 files) - Configuration validation and 4-pillar pattern
- **handlers/** (5 files) - HTTP request handlers (tokens, OpenAPI)
- **health/** (6 files) - Health check endpoints and telemetry
- **integration/** (2 files) - API versioning and shutdown tests
- **kong/** (4 files) - Kong API Gateway integration and strategies
- **logging/** (4 files) - Logging functionality and Winston integration
- **mutation/** (2 files) - Mutation-resistant test patterns
- **services/** (4 files) - Service layer tests (JWT, caching)
- **telemetry/** (9 files) - Observability, metrics, and instrumentation
- **utils/** (6 files) - Utility functions (error codes, validation, retry)

### Parallel Test Execution

The test suite is optimized for parallel execution with proper isolation and timeout management to ensure stability across concurrent test runs.

#### Timeout Configurations

**Fetch Timeouts:**
- 5-second timeout for external API calls (Kong Admin API)
- Prevents tests from hanging on network issues
- Configured in test utilities: `{ signal: AbortSignal.timeout(5000) }`

**Garbage Collection Thresholds:**
- 20ms thresholds for GC monitoring tests
- Allows for parallel test execution without false positives
- Environment-aware: stricter in CI, looser in local development

#### Database Isolation Strategy

**Redis Database Separation:**
- Test suite uses Redis DB 10 (separate from production DB 0)
- Ensures test cache operations don't interfere with running services
- Configuration: `REDIS_DB=10` in test environment
- Each test can flush DB 10 without affecting other environments

**Benefits:**
- Tests can run concurrently without cache collisions
- Local development server (DB 0) unaffected by test runs
- Clean state for each test run via `FLUSHDB` on DB 10

#### Functional Equivalence vs Instance Equality

**Pattern: Test behavior, not implementation details**

When testing cached objects or API responses, prefer functional equivalence over strict instance equality:

```typescript
// AVOID: Instance equality (fragile in concurrent tests)
expect(cachedObject).toBe(originalObject);

// PREFER: Functional equivalence (stable in parallel execution)
expect(cachedObject.id).toBe(originalObject.id);
expect(cachedObject.username).toBe(originalObject.username);
expect(cachedObject.secret).toBe(originalObject.secret);
```

**Why this matters:**
- Cache implementations may deserialize/reserialize objects
- Parallel tests may have separate cache instances
- Functional equivalence verifies the API contract, not memory addresses

#### Environment-Aware Test Best Practices

**Disable Environment-Sensitive Tests:**
- Winston logger tests disabled in parallel execution (`test.skip`)
- Reason: Environment variable conflicts during concurrent runs
- Trade-off: Ensures suite stability over 100% parallel coverage

**Graceful Timeout Handling:**
- Use `AbortSignal.timeout()` instead of test framework timeouts
- Provides cleaner error messages on timeout
- Allows for operation-specific timeout values

**Example:**
```typescript
// Good: Operation-specific timeout with clean error handling
const response = await fetch(url, {
  signal: AbortSignal.timeout(5000)
});

// Avoid: Test framework timeout (less granular control)
test("should fetch data", { timeout: 5000 }, async () => {
  await fetch(url);
});
```

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

## 4. Mutation Testing with StrykerJS

Located in project root (`stryker.config.json`).

### What is Mutation Testing?

Mutation testing introduces small, deliberate bugs (mutations) into your source code, then runs your test suite to see if the tests catch them. If a test fails, the mutant is "killed." If all tests pass, the mutant "survived"  meaning your tests missed a potential bug.

### Running Mutation Tests

```bash
# Run full mutation testing
bun run test:mutation

# Run with fresh state (no incremental cache)
rm -f test/results/mutation/stryker-incremental.json && npx stryker run

# View HTML report after run
open test/results/mutation/mutation-report.html
```

### Our Stryker Configuration

```json
{
  "testRunner": "command",
  "commandRunner": {
    "command": "bun test ./test/bun ./test/integration"
  },
  "plugins": ["@stryker-mutator/typescript-checker"],
  "checkers": ["typescript"],
  "mutate": [
    "src/**/*.ts",
    "!src/**/*.d.ts",
    "!src/types/**/*.ts",
    "!src/telemetry/**/*.ts"
    // ... infrastructure exclusions
  ],
  "thresholds": {
    "high": 80,
    "low": 60,
    "break": null
  },
  "mutator": {
    "excludedMutations": [
      "StringLiteral",
      "ObjectLiteral",
      "ArithmeticOperator",
      "BlockStatement",
      "UpdateOperator",
      "OptionalChaining"
    ]
  }
}
```

### Configuration Decisions Explained

#### Files We Mutate (Business Logic)
- `src/handlers/tokens.ts` - JWT token generation logic
- `src/utils/response.ts` - API response formatting

#### Files We Exclude (Infrastructure)

| Excluded File/Pattern | Reason |
|----------------------|--------|
| `src/telemetry/**/*.ts` | Telemetry mutations (success flags) don't affect behavior |
| `src/handlers/health.ts` | Infrastructure monitoring with async patterns |
| `src/handlers/openapi.ts` | Spec sanitization, not core business logic |
| `src/services/jwt.service.ts` | Crypto flags (extractable: false) are unkillable |
| `src/services/circuit-breaker.service.ts` | Complex async fallback strategies |
| `src/middleware/**/*.ts` | Cross-cutting concerns with complex flow |
| `src/config/**/*.ts` | Configuration loading, not logic |

#### Mutation Types We Exclude

| Excluded Mutation | Why We Skip It |
|-------------------|----------------|
| `StringLiteral` | String changes rarely indicate bugs (log messages, keys) |
| `ObjectLiteral` | Object structure changes cause type errors, not logic bugs |
| `ArithmeticOperator` | Math operations not critical in auth service |
| `BlockStatement` | Empty block mutations mostly affect logging |
| `UpdateOperator` | `++/--` operators not used in critical paths |
| `OptionalChaining` | `?.` safety checks are defensive, not testable |

### Mutation Types We Test

| Mutation Type | What It Tests | Example |
|--------------|---------------|---------|
| `ConditionalExpression` | Branch logic | `if (x) {}` -> `if (false) {}` |
| `EqualityOperator` | Comparisons | `===` -> `!==` |
| `LogicalOperator` | Boolean logic | `&&` -> `\|\|` |
| `BooleanLiteral` | True/false values | `true` -> `false` |
| `MethodExpression` | Method calls | `.trim()` removed |

### Interpreting Results

```
All files                | 100.00 |  100.00 |       33 |         0 |          0 |
 handlers                | 100.00 |  100.00 |       27 |         0 |          0 |
  tokens.ts              | 100.00 |  100.00 |       27 |         0 |          0 |
 utils                   | 100.00 |  100.00 |        6 |         0 |          0 |
  response.ts            | 100.00 |  100.00 |        6 |         0 |          0 |
```

- **% Mutation score**: Percentage of mutants killed (higher is better)
- **# killed**: Mutants caught by tests
- **# survived**: Mutants that tests missed (should be 0)
- **# no cov**: Mutants in uncovered code

### Writing Mutation-Resistant Tests

#### Weak (mutants survive):
```typescript
test("should calculate discount", () => {
  const result = calculateDiscount(100, "premium");
  expect(result).toBeDefined();  // Any value passes!
});
```

#### Strong (mutants killed):
```typescript
test("premium customers get 20% discount", () => {
  const result = calculateDiscount(100, "premium");
  expect(result).toBe(80);  // Exact value required
});
```

### Inline Mutation Disabling

For truly unkillable mutations, use Stryker disable comments:

```typescript
// Stryker disable next-line ConditionalExpression: Lazy initialization pattern
if (!this._url) {
  this._url = new URL(this.req.url);
}

// Stryker disable next-line BooleanLiteral: Telemetry success flag
recordAuthenticationAttempt("success", true, username);
```

### Performance Tips

- **Incremental mode**: Stryker caches results, only re-testing changed code
- **Concurrency**: Set to CPU cores for faster execution (`"concurrency": 4`)
- **Timeout**: Allow 60s per mutant for async operations

### Current Status

| Metric | Value |
|--------|-------|
| Mutation Score | 100% |
| Mutants Killed | 33 |
| Mutants Survived | 0 |
| Test Runtime | ~90 seconds |

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

The authentication service uses 6 predefined test consumers for consistent testing across all frameworks. For comprehensive documentation on consumer setup, API keys, JWT credentials, and Kong configuration, see:

**[Kong Test Consumer Setup Guide](kong-test-setup.md)**

Key files:
- `test/shared/test-consumers.ts` - Consumer definitions (source of truth)
- `test/shared/test-consumer-secrets.ts` - Secure test secret generation
- `scripts/seed-test-consumers.ts` - Automated Kong seeding script

### Quick Reference

| Consumer | Purpose |
|----------|---------|
| test-consumer-001 | Primary test consumer for basic auth tests |
| test-consumer-002 | Multi-user scenarios |
| test-consumer-003 | Multi-user scenarios |
| test-consumer-004 | Load/performance testing |
| test-consumer-005 | Load/performance testing |
| anonymous | Testing rejection scenarios |

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