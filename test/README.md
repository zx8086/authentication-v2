# Authentication Service Testing Suite

Comprehensive testing for the Bun-based authentication service with four-tier testing strategy: unit tests (Bun), integration tests, end-to-end scenarios (Playwright), and performance validation (K6).

**Current Test Suite**: 1523 tests across 73 files (100% pass rate)

| Category | Files | Tests | Framework |
|----------|-------|-------|-----------|
| Unit Tests | 59 | 1400+ | Bun |
| Integration Tests | 4 | 50+ | Bun |
| E2E Tests | 3 | 32 | Playwright |
| Performance Tests | 19 | - | K6 |

## Directory Structure

```
test/
├── bun/              # Unit Tests (59 test files in 12 subdirectories)
│   ├── cache/        # Caching functionality (7 files)
│   ├── circuit-breaker/  # Circuit breaker patterns (5 files)
│   ├── config/       # Configuration management (5 files)
│   ├── handlers/     # HTTP request handlers (5 files)
│   ├── health/       # Health check endpoints (6 files)
│   ├── integration/  # Integration tests (2 files)
│   ├── kong/         # Kong API Gateway integration (4 files)
│   ├── logging/      # Logging functionality (4 files)
│   ├── mutation/     # Mutation-specific tests (2 files)
│   ├── services/     # Service layer tests (4 files)
│   ├── telemetry/    # Observability (9 files)
│   └── utils/        # Utility functions (6 files)
├── integration/      # Integration Tests (4 test files)
├── k6/               # Performance Tests (19 test files)
│   ├── smoke/        # Quick validation tests
│   ├── load/         # Production load simulation
│   ├── stress/       # Breaking point analysis
│   ├── spike/        # Traffic burst testing
│   ├── soak/         # Extended endurance testing
│   └── utils/        # Shared utilities and configurations
├── playwright/       # E2E Scenarios (3 test suites)
├── kong-simulator/   # Kong proxy simulator for testing
├── shared/           # Shared test utilities and consumer setup
├── telemetry/        # Telemetry-specific test files
├── results/          # Test execution results and reports
└── README.md         # This file
```

## Testing Strategy Overview

### 1. Bun Tests - Unit & Integration Testing
**Purpose**: Fast feedback, component validation, mocked dependencies
**Framework**: Bun native test runner
**When to run**: During development, pre-commit, CI/CD

**Test Files** (59 files organized by subdirectory):

**cache/ (7 files)** - Caching functionality:
- `cache-factory.test.ts` - Cache factory infrastructure
- `cache-factory-errors.test.ts` - Cache factory error handling
- `cache-manager.test.ts` - Cache manager operations
- `cache-health-edge-cases.test.ts` - Cache health edge cases
- `cache-stale-operations.test.ts` - Stale data handling
- `local-memory-cache.test.ts` - In-memory cache implementation
- `local-memory-cache-maxentries.test.ts` - Cache size limits

**circuit-breaker/ (5 files)** - Circuit breaker patterns:
- `circuit-breaker-per-operation.test.ts` - Per-operation circuit breakers
- `circuit-breaker-state-transitions.test.ts` - State transition logic
- `circuit-breaker-thresholds.test.ts` - Threshold configurations
- `circuit-breaker.mutation.test.ts` - Mutation-resistant tests
- `telemetry-circuit-breaker.test.ts` - Telemetry integration

**config/ (5 files)** - Configuration management:
- `config.test.ts` - Core configuration validation
- `config-getters.test.ts` - Configuration getter methods
- `config-helpers.test.ts` - Configuration helper functions
- `config-schemas.test.ts` - Schema validation
- `defaults.test.ts` - Default value handling

**handlers/ (5 files)** - HTTP request handlers:
- `tokens-handler.test.ts` - Token endpoint handling
- `tokens.mutation.test.ts` - Token mutation tests
- `openapi-handler.test.ts` - OpenAPI specification serving
- `openapi-generator.test.ts` - OpenAPI spec generation
- `openapi-yaml-converter.test.ts` - YAML conversion

**health/ (6 files)** - Health check endpoints:
- `health-handlers.test.ts` - Health endpoint logic
- `health-branches.test.ts` - Branch coverage
- `health-fetch-spy.test.ts` - Fetch mocking
- `health-telemetry-branches.test.ts` - Telemetry branches
- `health-mutation-killers.test.ts` - Mutation killers
- `health.mutation.test.ts` - Mutation-resistant tests

**integration/ (2 files)** - Integration tests:
- `api-versioning.test.ts` - API versioning (v1/v2)
- `shutdown-cleanup.test.ts` - Graceful shutdown

**kong/ (4 files)** - Kong API Gateway integration:
- `kong.adapter.test.ts` - Kong adapter with mocking
- `kong-adapter-fetch.test.ts` - Fetch-specific tests
- `kong-mode-strategies.test.ts` - Mode strategy selection
- `kong-utils.test.ts` - Kong utility functions

**logging/ (4 files)** - Logging functionality:
- `logger.test.ts` - Core logger functionality
- `logger-output.test.ts` - Logger output validation
- `logger-fallback.test.ts` - Fallback behavior
- `winston-logger-methods.test.ts` - Winston integration

**mutation/ (2 files)** - Mutation-specific tests:
- `jwt.mutation.test.ts` - JWT mutation tests
- `mutation-killer.test.ts` - Mutation killer patterns

**services/ (4 files)** - Service layer tests:
- `jwt.service.test.ts` - JWT generation/validation
- `jwt-error-path.test.ts` - JWT error paths
- `api-gateway.service.test.ts` - API gateway service
- `cache-health.service.test.ts` - Cache health service

**telemetry/ (9 files)** - Observability:
- `metrics.test.ts` - Metrics collection
- `metrics-attributes.test.ts` - Metric attributes
- `metrics-initialized.test.ts` - Metrics initialization
- `gc-metrics.test.ts` - Garbage collection metrics
- `gc-metrics-operations.test.ts` - GC metric operations
- `tracer-operations.test.ts` - Tracing operations
- `instrumentation-operations.test.ts` - Instrumentation
- `instrumentation-coverage.test.ts` - Coverage tracking
- `redis-instrumentation-utils.test.ts` - Redis instrumentation (16 tests)
  - **What it validates**: Trace context propagation for Redis operations
  - **Span hierarchy**: Redis spans appear as child spans under HTTP requests
  - **Span attributes**: Operation type, cache keys, result types, error tracking
  - **Log correlation**: Automatic trace.id and span.id in Redis operation logs
  - **Implementation**: Tests verify `src/telemetry/redis-instrumentation.ts` behavior
  - **Trace continuity**: HTTP → Kong → JWT → Redis (full distributed tracing)

**utils/ (6 files)** - Utility functions:
- `error-codes.test.ts` - Structured error codes
- `type-validation.test.ts` - TypeScript type safety
- `header-validation.test.ts` - Request header validation
- `response.mutation.test.ts` - Response mutations
- `retry.test.ts` - Retry logic
- `cardinality-guard.test.ts` - Cardinality protection

**Commands**:
```bash
bun test                                    # All Bun tests
bun test test/bun/jwt.service.test.ts      # Specific test file
bun test test/bun/cache/                   # All cache tests (selective testing)
bun test test/bun/kong/                    # All Kong integration tests
bun test --watch                           # Watch mode
bun test --coverage                        # With coverage
```

**Benefits of Subdirectory Organization**:
- **Improved Discoverability**: Tests organized by domain make it easier to find related tests
- **Selective Testing**: Run tests by subdirectory: `bun test test/bun/cache/`
- **Cleaner IDE Navigation**: Better file tree organization in your editor
- **Easier Code Review**: Review tests by domain during pull requests
- **Better Maintainability**: Related tests are grouped together
- **Git History Preserved**: All files moved with `git mv` to maintain history

### 2. Integration Tests
**Purpose**: Service-to-service integration validation, real dependency testing
**Framework**: Bun native test runner
**When to run**: After unit tests pass, before E2E tests

**Test Files** (4 files):
- `kong-adapter.integration.test.ts` - Kong adapter integration with real API calls
- `kong-service.integration.test.ts` - Kong service layer integration
- `circuit-breaker.integration.test.ts` - Circuit breaker behavior with real failures
- `redis-cache.integration.test.ts` - Redis cache integration patterns

**Commands**:
```bash
bun test test/integration/           # All integration tests
bun test test/integration/kong*.ts   # Kong-specific integration
```

### 3. Playwright Tests - E2E Scenarios
**Purpose**: End-to-end business logic validation, real API testing
**Framework**: Playwright for API testing
**When to run**: Pre-deployment, staging validation, comprehensive testing

**Test Files** (3 suites):
- `consolidated-business.e2e.ts` - Core business logic and JWT token flows
- `ci-safe.e2e.ts` - CI-safe subset of E2E tests
- `profiling.e2e.ts` - Performance profiling endpoint testing

**Commands**:
```bash
bun run test:e2e                          # All E2E tests (headless)
bun run test:e2e:headed                   # Run in headed mode (visible browser)
bun run test:e2e:ui                       # Interactive test UI
```

**What Playwright Tests Cover**:
- Health Check endpoint with Kong dependency status
- OpenAPI specification serving and validation
- Performance metrics and telemetry endpoints
- JWT token generation with valid Kong headers
- Anonymous consumer rejection and authentication failures
- Missing/invalid header validation
- Multiple users get unique tokens
- API versioning (v1/v2) with Accept-Version headers
- V2 security headers and audit logging
- Circuit breaker behavior under Kong failures
- Memory monitoring and pressure management
- Profiling endpoints and session management
- Unknown endpoints return 404
- Service monitoring endpoint availability

**What Playwright Does NOT Test** (handled by Kong/infrastructure):
- CORS headers - Kong handles cross-origin requests
- Rate limiting - Kong implements rate limiting policies
- Method not allowed (405) - Service returns 404 for unknown routes
- Request/response timing headers - Not implemented by service
- Custom error formatting - Service uses simple error responses

### 4. K6 Tests - Performance Testing
**Purpose**: Load testing, stress testing, performance validation
**Framework**: K6 performance testing tool
**When to run**: Performance validation, capacity planning, pre-production

## K6 Performance Testing

### Test Categories

#### Smoke Tests - Quick Validation (6 variants)
**Health Only Smoke Test** (`k6:smoke:health`)
- **Duration**: 3 minutes, 3 VUs
- **Endpoints**: `/health` endpoint focused testing
- **Thresholds**: P95 < 50ms, error rate < 1%

**Metrics Only Smoke Test** (`k6:smoke:metrics`)
- **Duration**: 3 minutes, 3 VUs
- **Endpoints**: `/metrics` and related monitoring endpoints
- **Thresholds**: P95 < 30ms, error rate < 1%

**OpenAPI Only Smoke Test** (`k6:smoke:openapi`)
- **Duration**: 3 minutes, 3 VUs
- **Endpoints**: `/` (OpenAPI specification serving)
- **Thresholds**: P95 < 10ms, error rate < 1%

**Token Smoke Test** (`k6:smoke:tokens`)
- **Duration**: 3 minutes, 3 VUs
- **Focus**: JWT generation, validation, error scenarios
- **Thresholds**: P95 < 50ms, P99 < 100ms, success rate > 99%

**All Endpoints Smoke Test** (`k6:smoke:all-endpoints`)
- **Duration**: 3 minutes, 3 VUs
- **Endpoints**: Comprehensive test of all endpoints including profiling and memory
- **Thresholds**: Mixed based on endpoint type

**Profiling Smoke Test** (`k6:smoke:profiling`)
- **Duration**: 3 minutes, 3 VUs
- **Endpoints**: Performance profiling endpoints (dev/staging only)
- **Thresholds**: P95 < 100ms, error rate < 1%

#### Load Tests - Production Simulation
**Authentication Load Test** (`k6:load`)
- **Duration**: 10 minutes, 10-20 ramped VUs
- **Pattern**: Realistic user behavior (70% tokens, 20% journeys, 10% health)
- **Thresholds**: P95 < 200ms, P99 < 500ms, error rate < 5%

#### Stress Tests - Breaking Point Analysis
**System Stress Test** (`k6:stress`)
- **Duration**: 18 minutes, 50-100 ramped VUs
- **Purpose**: Find breaking points and validate system limits
- **Thresholds**: P95 < 500ms, error rate < 10%, relaxed tolerance

#### Spike Tests - Traffic Burst Simulation
**Spike Test** (`k6:spike`)
- **Duration**: 8 minutes, 25 → 200 → 25 VUs
- **Purpose**: Sudden traffic burst simulation
- **Focus**: System recovery and resilience

### K6 Commands

**Quick Test Combinations**:
```bash
bun run test:k6:quick               # Health + tokens smoke tests (6min)
```

**Individual Test Categories**:
```bash
# Smoke Tests (3min each)
bun run test:k6:smoke:health        # Health endpoint only
bun run test:k6:smoke:metrics       # Metrics endpoints only
bun run test:k6:smoke:openapi       # OpenAPI specification only
bun run test:k6:smoke:tokens        # JWT token generation
bun run test:k6:smoke:all-endpoints # All endpoints comprehensive
bun run test:k6:smoke:profiling     # Profiling endpoints

# Load & Stress Tests
bun run test:k6:load                # Production load simulation (10min)
bun run test:k6:stress              # System breaking point (18min)
bun run test:k6:spike               # Traffic burst testing (8min)
bun run test:k6:soak                # Extended endurance testing
bun run test:k6:pressure:memory     # Memory pressure testing
```

**Test Information**:
```bash
bun run test:k6:info                # Display all available tests and strategies
```

### Performance Targets

| Endpoint | P95 Target | P99 Target | Notes |
|----------|------------|------------|-------|
| `/tokens` | < 50ms | < 100ms | Primary JWT generation |
| `/health` | < 30ms | < 50ms | Health check endpoint |
| `/metrics` | < 20ms | < 50ms | Performance metrics |
| `/` | < 10ms | < 20ms | OpenAPI specification |

**System Targets**:
- **Throughput**: > 1,000 tokens/second
- **Concurrent Users**: > 100 sustained, > 200 peak
- **Memory Usage**: < 512MB at 100 VUs
- **Error Rate**: < 1% normal load, < 10% stress conditions

### Environment Configuration

All testing parameters can be configured via environment variables for maximum flexibility across different environments and testing scenarios.

#### Playwright E2E Testing
```bash
# Target service URL for E2E tests
export API_BASE_URL=http://localhost:3000
```

#### K6 Performance Testing Configuration

**Target Configuration**:
```bash
export TARGET_HOST=localhost           # Target service host
export TARGET_PORT=3000               # Target service port
export TARGET_PROTOCOL=http           # http or https
export K6_TIMEOUT=30s                 # Request timeout
```

**Test Execution Parameters**:
```bash
# Smoke test configuration
export K6_SMOKE_VUS=3                 # Virtual users for smoke tests
export K6_SMOKE_DURATION=3m           # Smoke test duration

# Load test configuration
export K6_LOAD_INITIAL_VUS=10         # Load test starting VUs
export K6_LOAD_TARGET_VUS=20          # Load test target VUs
export K6_LOAD_RAMP_UP_DURATION=2m    # Time to ramp up
export K6_LOAD_STEADY_DURATION=5m     # Sustained load duration
export K6_LOAD_RAMP_DOWN_DURATION=2m  # Time to ramp down

# Stress test configuration
export K6_STRESS_INITIAL_VUS=50       # Stress test starting VUs
export K6_STRESS_TARGET_VUS=100       # Stress test target VUs
export K6_STRESS_PEAK_VUS=200         # Stress test peak VUs
export K6_STRESS_DURATION=5m          # Stress test duration

# Spike test configuration
export K6_SPIKE_BASELINE_VUS=10       # Spike baseline VUs
export K6_SPIKE_TARGET_VUS=100        # Spike peak VUs
export K6_SPIKE_DURATION=3m           # Spike duration
```

**Performance Thresholds**:
```bash
# Response time thresholds (milliseconds)
export K6_HEALTH_P95_THRESHOLD=50     # Health endpoint P95
export K6_HEALTH_P99_THRESHOLD=100    # Health endpoint P99
export K6_TOKENS_P95_THRESHOLD=50     # Tokens endpoint P95
export K6_TOKENS_P99_THRESHOLD=100    # Tokens endpoint P99
export K6_METRICS_P95_THRESHOLD=30    # Metrics endpoint P95
export K6_METRICS_P99_THRESHOLD=50    # Metrics endpoint P99

# Error rate thresholds (decimal format)
export K6_ERROR_RATE_THRESHOLD=0.01   # Normal error rate (1%)
export K6_STRESS_ERROR_RATE_THRESHOLD=0.05  # Stress error rate (5%)

# Test behavior configuration
export K6_THRESHOLDS_NON_BLOCKING=false  # Set to 'true' to make threshold violations non-blocking
```

**Test Consumer Configuration**:
```bash
# Multiple consumers for load testing
export TEST_CONSUMER_ID_1=test-consumer-001
export TEST_CONSUMER_USERNAME_1=loadtest-user-001
export TEST_CONSUMER_ID_2=test-consumer-002
export TEST_CONSUMER_USERNAME_2=loadtest-user-002
# ... up to TEST_CONSUMER_ID_5 and TEST_CONSUMER_USERNAME_5
```

#### Environment Examples

**Local Development**:
```bash
export TARGET_HOST=localhost
export TARGET_PORT=3000
export TARGET_PROTOCOL=http
export API_BASE_URL=http://localhost:3000
```

**Docker Environment**:
```bash
export TARGET_HOST=authentication-service
export TARGET_PORT=3000
export TARGET_PROTOCOL=http
export API_BASE_URL=http://authentication-service:3000
```

**Staging Environment**:
```bash
export TARGET_HOST=staging-auth.example.com
export TARGET_PORT=443
export TARGET_PROTOCOL=https
export K6_TIMEOUT=60s
export API_BASE_URL=https://staging-auth.example.com
export K6_HEALTH_P95_THRESHOLD=100    # Relaxed thresholds for staging
export K6_ERROR_RATE_THRESHOLD=0.02   # Higher tolerance for staging
```

**CI/CD Environment**:
```bash
export TARGET_HOST=localhost
export TARGET_PORT=3000
export TARGET_PROTOCOL=http
export K6_SMOKE_VUS=2                 # Reduced VUs for CI
export K6_SMOKE_DURATION=1m           # Shorter duration for CI
export K6_HEALTH_P95_THRESHOLD=200    # Relaxed for CI resources
```

#### Non-Blocking Threshold Examples

**Development/Testing with Non-Blocking Thresholds**:
```bash
# Run tests without stopping on threshold violations (useful for exploration and debugging)
export K6_THRESHOLDS_NON_BLOCKING=true

# Quick smoke test that continues even with failures
K6_THRESHOLDS_NON_BLOCKING=true k6 run test/k6/smoke/health-smoke.ts

# Token test with high failure rates but still collect metrics
K6_THRESHOLDS_NON_BLOCKING=true K6_SMOKE_VUS=2 K6_SMOKE_DURATION=30s k6 run test/k6/smoke/tokens-smoke.ts

# Load test with relaxed behavior for development environments
K6_THRESHOLDS_NON_BLOCKING=true \
K6_LOAD_TARGET_VUS=50 \
K6_LOAD_STEADY_DURATION=10m \
k6 run test/k6/load/auth-load.ts

# Using bun scripts with non-blocking mode
K6_THRESHOLDS_NON_BLOCKING=true bun run k6:smoke:health
K6_THRESHOLDS_NON_BLOCKING=true bun run k6:load
K6_THRESHOLDS_NON_BLOCKING=true bun run k6:stress
```

**When to Use Non-Blocking Mode**:
- **Development**: Explore system behavior without test interruption
- **Debugging**: Collect full metrics even when thresholds are violated
- **CI/CD**: Allow builds to continue while still collecting performance data
- **Baseline Testing**: Establish performance baselines for new environments

### Kong Integration Requirements

**Automatic Curl Fallback:** The service automatically handles Bun networking bugs with remote Kong instances via `fetchWithFallback()` utility. No manual configuration needed for integration tests with remote Kong IPs (e.g., `192.168.x.x`).

**Documentation:** See `docs/workarounds/SIO-288-bun-fetch-curl-fallback.md` and `docs/development/integration-tests-network-setup.md` for details.

K6 tests require Kong consumer headers for all authenticated endpoints:

**Required Headers for `/tokens` (JWT generation)**:
```http
X-Consumer-Id: test-consumer-001
X-Consumer-Username: loadtest-user-001
X-Anonymous-Consumer: false
```

**Required Headers for `/tokens/validate` (JWT validation)**:
```http
X-Consumer-Id: test-consumer-001
X-Consumer-Username: loadtest-user-001
Authorization: Bearer <jwt-token>
```

**Expected `/tokens` Response Format**:
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "expires_in": 900
}
```

**Expected `/tokens/validate` Response Format**:
```json
{
  "valid": true,
  "claims": {
    "sub": "test-consumer-001",
    "username": "loadtest-user-001",
    "iss": "https://sts.example.com/",
    "aud": "http://api.example.com/",
    "exp": 1234567890,
    "iat": 1234567000,
    "nbf": 1234567000
  }
}
```

**Performance Considerations**:
- Token generation: P95 < 50ms, P99 < 100ms
- Token validation: P95 < 50ms, P99 < 100ms
- Metrics export timeout: 500ms threshold for large result sets

## Running All Tests

### Comprehensive Testing Strategy
```bash
# 1. Unit & Integration (fastest) - ~45 seconds, 1400+ tests
bun test

# 2. E2E Scenarios (thorough) - 2-3 minutes
bun run test:e2e

# 3. Performance Testing (selective)
bun run test:k6:quick                 # Health + tokens validation - 6min
bun run test:k6:smoke:all-endpoints   # Comprehensive endpoint test - 3min

# 4. Clean up test artifacts
bun run test:clean                    # Remove all test result files
```

### CI/CD Pipeline Testing
```bash
# Quick validation for CI/CD (6-8 minutes total)
bun run quality:check && bun test && bun run test:e2e && bun run test:k6:quick

# Full test suite validation (comprehensive)
bun run test:suite                    # Bun + Playwright + K6 quick tests
```

### Full Performance Validation
```bash
# Complete performance testing (40+ minutes)
bun run test:k6:smoke:health
bun run test:k6:smoke:tokens
bun run test:k6:load
bun run test:k6:stress
bun run test:k6:spike
```

## Test Coverage Areas

### Functional Testing Coverage
- JWT token generation and validation
- Kong consumer authentication
- Anonymous consumer rejection
- Header validation and error handling
- Health and metrics endpoints
- OpenAPI specification serving
- Multi-user scenarios and token uniqueness
- Edge cases and malformed inputs
- Service monitoring and availability

### Performance Testing Coverage
- Response time percentiles (P95, P99)
- Throughput validation (requests/second)
- Concurrent user handling
- System resource usage monitoring
- Breaking point analysis
- Traffic spike resilience
- Kong integration efficiency
- Error rate distribution under load

## Prerequisites

### Development Prerequisites
- **Bun**: >= 1.1.35
- **Node.js**: For Playwright (installed automatically)
- **K6**: >= 0.45.0

### Service Prerequisites
- Authentication service running at target endpoint
- Kong Konnect integration available (for token tests)
- Network connectivity to target system
- Sufficient system resources for high-VU tests (K6)

### Installation
```bash
# Install K6 (macOS)
brew install k6

# Install K6 (Linux)
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6

# Verify installations
k6 version
bun --version
```

## Configuration Files

- `bunfig.toml` - Bun test configuration
- `playwright.config.ts` - Playwright configuration
- `test/k6/utils/config.ts` - K6 test configuration and thresholds

## Documentation Generation

### OpenAPI Specification Generation
Generate comprehensive API documentation with detailed feedback:

```bash
# Generate both JSON and YAML formats (default)
bun run generate-docs

# Generate only JSON format
bun run generate-docs:json

# Generate only YAML format
bun run generate-docs:yaml

# Generate with detailed statistics
bun run generate-docs:verbose
```

**Example output with verbose mode**:
```
OpenAPI Generation Complete!
Generation Statistics:
   Duration: 3ms
   Files: 2 generated
      - public/openapi.json
      - public/openapi-generated.yaml
   Total size: 49.3 KB
   Routes: 9 endpoints
   Schemas: 8 components
```

Generated files are available at:
- `public/openapi.json` - Machine-readable JSON format
- `public/openapi-generated.yaml` - Human-readable YAML format with generation metadata

## Migration Validation

This test suite validates the .NET Core to Bun migration performance claims:

### Expected Improvements
- **3-4x Performance Improvement**: Validated through comparative load testing
- **60% Memory Reduction**: Monitored via system metrics
- **<100ms Cold Start**: Verified in spike test recovery patterns
- **5x Smaller Container**: Resource efficiency validated

### Troubleshooting

**Connection Issues**:
```bash
# Verify service is running
curl http://localhost:3000/health

# Check network connectivity
ping localhost
```

**High Error Rates**:
```bash
# Check service logs
docker logs <container-name>

# Verify Kong integration
curl -H "X-Consumer-Id: test" http://localhost:3000/tokens
```

**Performance Issues**:
```bash
# Monitor system resources
htop
docker stats

# Check memory patterns
grep "memory_usage_mb" *-results.json
```

---

**Note**: This testing suite is designed for the Bun-based authentication service with Kong Konnect Cloud integration. Adjust environment variables and consumer configurations based on your deployment.