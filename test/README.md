# Authentication Service Testing Suite

Comprehensive testing for the Bun-based authentication service with three-tier testing strategy: unit/integration (Bun), end-to-end scenarios (Playwright), and performance validation (K6). Current test suite includes 50 test files with 460+ individual tests across 21 Bun unit tests, 3 Playwright E2E suites, and 18 K6 performance tests.

## Directory Structure

```
test/
├── bun/              # Unit & Integration Tests (21 test files, 392+ tests)
├── k6/               # Performance Tests (K6 Load Testing, 18 test files)
│   ├── smoke/        # Quick validation tests (6 smoke test variants)
│   ├── load/         # Production load simulation
│   ├── stress/       # Breaking point analysis
│   ├── spike/        # Traffic burst testing
│   ├── soak/         # Extended endurance testing
│   └── utils/        # Shared utilities and configurations
├── playwright/       # E2E Scenarios (3 test suites, 68+ tests)
├── shared/           # Shared test utilities and consumer setup
├── telemetry/        # Telemetry-specific test files
├── compatibility/    # Compatibility and migration tests
├── unit/             # Legacy unit test directory
├── results/          # Test execution results and reports
└── README.md         # This file
```

## Testing Strategy Overview

### 1. Bun Tests - Unit & Integration Testing
**Purpose**: Fast feedback, component validation, mocked dependencies
**Framework**: Bun native test runner
**When to run**: During development, pre-commit, CI/CD

**Test Files** (21 files, 392+ tests):
- `jwt.service.test.ts` - JWT generation and validation logic
- `kong.adapter.test.ts` - Unified Kong adapter testing
- `kong.service.test.ts` - Kong service integration with mocking
- `kong.factory.test.ts` - Kong service factory patterns
- `server.test.ts` - Full server integration tests with HTTP requests
- `config.test.ts` - Configuration validation and schema testing
- `api-versioning.*.test.ts` - API versioning middleware and routing (3 files)
- `v2-*.test.ts` - API v2 specific features (3 files)
- `memory-pressure.test.ts` - Memory management and pressure testing
- `metrics.test.ts` - Telemetry and metrics collection
- `profiling.test.ts` - Performance profiling capabilities
- `circuit-breaker-error-classification.test.ts` - Circuit breaker resilience
- `*-cache.test.ts` - Caching strategies (2 files)
- `type-validation.test.ts` - TypeScript type safety
- `logger.test.ts` - Logging infrastructure
- `config-helpers.test.ts` - Configuration utility functions

**Commands**:
```bash
bun test                                    # All Bun tests
bun test test/bun/jwt.service.test.ts      # Specific test file
bun test --watch                           # Watch mode
bun test --coverage                        # With coverage
```

### 2. Playwright Tests - E2E Scenarios
**Purpose**: End-to-end business logic validation, real API testing
**Framework**: Playwright for API testing
**When to run**: Pre-deployment, staging validation, comprehensive testing

**Test Files** (3 suites, 68+ tests):
- `consolidated-business.e2e.ts` - Core business logic and JWT token flows
- `api-versioning.e2e.ts` - API versioning and backward compatibility
- `profiling.e2e.ts` - Performance profiling endpoint testing

**Commands**:
```bash
bun run playwright:test                   # All E2E tests (headless)
bun run playwright:ui                     # Interactive test UI
```

**What Playwright Tests Cover**:
- ✅ Health Check endpoint with Kong dependency status
- ✅ OpenAPI specification serving and validation
- ✅ Performance metrics and telemetry endpoints
- ✅ JWT token generation with valid Kong headers
- ✅ Anonymous consumer rejection and authentication failures
- ✅ Missing/invalid header validation
- ✅ Multiple users get unique tokens
- ✅ API versioning (v1/v2) with Accept-Version headers
- ✅ V2 security headers and audit logging
- ✅ Circuit breaker behavior under Kong failures
- ✅ Memory monitoring and pressure management
- ✅ Profiling endpoints and session management
- ✅ Unknown endpoints return 404
- ✅ Service monitoring endpoint availability

**What Playwright Does NOT Test** (handled by Kong/infrastructure):
- ❌ CORS headers - Kong handles cross-origin requests
- ❌ Rate limiting - Kong implements rate limiting policies
- ❌ Method not allowed (405) - Service returns 404 for unknown routes
- ❌ Request/response timing headers - Not implemented by service
- ❌ Custom error formatting - Service uses simple error responses

### 3. K6 Tests - Performance Testing
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
bun run k6:quick               # Health + tokens smoke tests (6min)
```

**Individual Test Categories**:
```bash
# Smoke Tests (3min each)
bun run k6:smoke:health            # Health endpoint only
bun run k6:smoke:metrics           # Metrics endpoints only
bun run k6:smoke:openapi           # OpenAPI specification only
bun run k6:smoke:tokens            # JWT token generation
bun run k6:smoke:all-endpoints     # All endpoints comprehensive
bun run k6:smoke:profiling         # Profiling endpoints

# Load & Stress Tests
bun run k6:load                    # Production load simulation (10min)
bun run k6:stress                  # System breaking point (18min)
bun run k6:spike                   # Traffic burst testing (8min)
bun run k6:soak                    # Extended endurance testing
bun run k6:pressure:memory         # Memory pressure testing
```

**Test Information**:
```bash
bun run k6:info                # Display all available tests and strategies
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

K6 tests require Kong consumer headers:
```http
X-Consumer-Id: test-consumer-001
X-Consumer-Username: loadtest-user-001
X-Anonymous-Consumer: false
```

Expected JWT response format:
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "expires_in": 900
}
```

## Running All Tests

### Comprehensive Testing Strategy
```bash
# 1. Unit & Integration (fastest) - 30 seconds, 392+ tests
bun test

# 2. E2E Scenarios (thorough) - 2-3 minutes, 68+ tests
bun run playwright:test

# 3. Performance Testing (selective)
bun run k6:quick                 # Health + tokens validation - 6min
bun run k6:smoke:all-endpoints   # Comprehensive endpoint test - 3min

# 4. Clean up test artifacts
bun run test:clean               # Remove all test result files
```

### CI/CD Pipeline Testing
```bash
# Quick validation for CI/CD (6-8 minutes total)
bun run quality:check && bun test && bun run playwright:test && bun run k6:quick

# Full test suite validation (comprehensive)
bun run test:suite              # Bun + Playwright + K6 quick tests
```

### Full Performance Validation
```bash
# Complete performance testing (40+ minutes)
bun run k6:smoke:health
bun run k6:smoke:tokens
bun run k6:load
bun run k6:stress
bun run k6:spike
```

## Test Coverage Areas

### Functional Testing Coverage
- ✅ JWT token generation and validation
- ✅ Kong consumer authentication
- ✅ Anonymous consumer rejection
- ✅ Header validation and error handling
- ✅ Health and metrics endpoints
- ✅ OpenAPI specification serving
- ✅ Multi-user scenarios and token uniqueness
- ✅ Edge cases and malformed inputs
- ✅ Service monitoring and availability

### Performance Testing Coverage
- ✅ Response time percentiles (P95, P99)
- ✅ Throughput validation (requests/second)
- ✅ Concurrent user handling
- ✅ System resource usage monitoring
- ✅ Breaking point analysis
- ✅ Traffic spike resilience
- ✅ Kong integration efficiency
- ✅ Error rate distribution under load

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
🎉 OpenAPI Generation Complete!
📊 Generation Statistics:
   ⏱️  Duration: 3ms
   📁 Files: 2 generated
      ✅ public/openapi.json
      ✅ public/openapi-generated.yaml
   📦 Total size: 49.3 KB
   🛣️  Routes: 9 endpoints
   📋 Schemas: 8 components
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