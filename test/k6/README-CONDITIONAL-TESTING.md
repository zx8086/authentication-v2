# K6 Conditional Testing Strategy

This document outlines the implementation of environment-aware K6 testing that supports both Kong Gateway-dependent and independent test execution.

## Problem Solved

Previously, K6 tests would fail in CI/CD environments where Kong Gateway is not available, making it impossible to run performance tests as part of the build pipeline.

## Solution Overview

### Environment Detection
- Automatic detection of Kong Gateway availability
- CI/CD environment awareness
- Conditional test execution based on dependencies

### Test Categories

#### Gateway-Independent Tests (CI-Safe)
- `health-only-smoke.ts` - Health endpoint testing
- `metrics-only-smoke.ts` - Metrics endpoint testing
- `openapi-only-smoke.ts` - OpenAPI schema testing
- `ci-safe-smoke.ts` - **NEW**: Combined CI-safe test suite

#### Gateway-Dependent Tests (Requires Kong)
- `tokens-smoke.ts` - JWT token generation (requires consumer headers)
- `auth-load.ts` - Load testing with authentication
- `system-stress.ts` - Stress testing with Kong integration
- `kong-gateway/kong-tokens-test.ts` - Kong Gateway specific tests

## Environment Variables

### CI/CD Detection
```bash
CI=true                    # Enables CI mode
GITHUB_ACTIONS=true        # GitHub Actions environment
```

### Kong Gateway Configuration
```bash
KONG_ADMIN_URL=https://...  # Kong Admin API URL
KONG_ADMIN_TOKEN=***       # Kong Admin API token
SKIP_KONG_TESTS=true       # Force skip Kong-dependent tests
```

### Test Target Configuration
```bash
TARGET_HOST=localhost      # Target hostname
TARGET_PORT=3000          # Target port
TARGET_PROTOCOL=http      # Target protocol
```

## Usage Examples

### Local Development (Kong Available)
```bash
# Run all tests including Kong-dependent ones
bun run k6:quick

# Run specific gateway-dependent test
bun run k6:smoke:tokens
```

### Local Development (No Kong)
```bash
# Run only gateway-independent tests
bun run k6:quick:ci

# Run specific gateway-independent test
bun run k6:smoke:health
```

### CI/CD Environment
```bash
# Automatically runs CI-safe tests only
bun run test:suite:ci

# Or directly
bun run k6:quick:ci
```

## Implementation Details

### Environment Detection (`test/k6/utils/environment.ts`)
```typescript
export function detectEnvironment(): EnvironmentConfig {
  const ciMode = Boolean(__ENV.CI || __ENV.GITHUB_ACTIONS);
  const kongAvailable = Boolean(__ENV.KONG_ADMIN_URL && __ENV.KONG_ADMIN_TOKEN);
  const forceSkipGateway = Boolean(__ENV.SKIP_KONG_TESTS);

  return {
    hasKongGateway: kongAvailable && !forceSkipGateway,
    ciMode,
    skipGatewayTests: ciMode && (!kongAvailable || forceSkipGateway)
  };
}
```

### Test Conditional Execution
```typescript
export function shouldRunTest(requiresKong: boolean): boolean {
  const env = detectEnvironment();

  if (!requiresKong) return true;  // Always run gateway-independent tests

  if (requiresKong && env.skipGatewayTests) {
    console.log("[SKIP] Kong Gateway not available - skipping test");
    return false;
  }

  return true;
}
```

### Modified Test Pattern
```typescript
// In gateway-dependent tests like tokens-smoke.ts
export function setup() {
  logEnvironmentInfo();

  if (!shouldRunTest(true)) {  // true = requires Kong
    return { skipTest: true };
  }

  // Continue with normal setup...
}

export default function (data) {
  if (data && data.skipTest) {
    console.log("[SKIP] Test skipped - Kong Gateway not available");
    return;
  }

  // Continue with normal test execution...
}
```

## CI/CD Integration

### GitHub Actions Workflow
The CI pipeline now includes K6 testing with automatic environment detection:

```yaml
- name: Install K6 for performance tests
  run: |
    # Install K6 from official repository
    sudo apt-get update && sudo apt-get install k6

- name: Run K6 CI-safe performance tests
  run: bun run k6:quick:ci
  env:
    CI: true
    SKIP_KONG_TESTS: true
    TARGET_HOST: localhost
    TARGET_PORT: 3000
```

## Benefits

1. **CI/CD Compatibility**: K6 tests can now run in any environment
2. **Automatic Fallback**: Tests gracefully skip when dependencies unavailable
3. **Performance Coverage**: Basic performance testing in every build
4. **Full Coverage Available**: Complete test suite available when Kong is present
5. **Zero Configuration**: Works out-of-the-box in most environments

## Test Execution Flow

```
Start K6 Test
     ↓
Detect Environment
     ↓
Kong Available? ─── Yes ──→ Run Full Test Suite
     ↓
     No
     ↓
CI Environment? ─── Yes ──→ Run CI-Safe Tests Only
     ↓
     No
     ↓
Skip Gateway Tests, Run Independent Tests
```

## Performance Characteristics

- **CI-Safe Test**: ~10-15 seconds (health, openapi, metrics)
- **Full Test Suite**: ~30-60 seconds (includes token generation, auth flows)
- **Load/Stress Tests**: 2-10 minutes (requires Kong, local only)

## Troubleshooting

### Test Skipped in CI
**Expected**: Gateway-dependent tests should skip in CI without Kong

### All Tests Skipped
**Issue**: Check environment variables and network connectivity

### Kong Tests Fail Locally
**Issue**: Verify `KONG_ADMIN_URL` and `KONG_ADMIN_TOKEN` are set correctly

### No K6 Results in CI
**Issue**: Check K6 installation step and test execution logs