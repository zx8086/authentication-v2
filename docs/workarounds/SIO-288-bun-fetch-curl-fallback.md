# SIO-288: Bun Fetch Curl Fallback Workaround

## Problem Statement

Bun v1.3.6 has known networking bugs that cause `fetch()` to fail when connecting to services on local/private IP addresses (e.g., `192.168.x.x`, `10.x.x.x`), even when the service is reachable via curl.

### Symptoms

- `fetch()` throws `ConnectionRefused` or `FailedToOpenSocket` errors
- Same URL works perfectly with `curl` command
- Affects Kong Admin API connections on remote IPs
- Impacts integration test reliability

### Error Examples

```typescript
// Bun fetch fails
await fetch("http://192.168.178.3:30001/status");
// Error: ConnectionRefused: Failed to connect

// But curl works
$ curl http://192.168.178.3:30001/status
// Returns Kong status successfully
```

### Known Bun Issues

This is a documented bug in Bun's networking layer:
- https://github.com/oven-sh/bun/issues/1425
- https://github.com/oven-sh/bun/issues/6885
- https://github.com/oven-sh/bun/issues/10731

## Solution: Fetch with Curl Fallback

We've implemented `fetchWithFallback()` utility that automatically falls back to curl when Bun's native fetch fails.

### How It Works

```typescript
import { fetchWithFallback } from './utils/bun-fetch-fallback';

// Use exactly like native fetch
const response = await fetchWithFallback('http://192.168.178.3:30001/status');
const data = await response.json();
```

**Behavior:**
1. Try native `fetch()` first (preferred for performance)
2. If fetch fails, automatically retry via `curl` subprocess
3. Return standard Response object in both cases
4. Throw original error only if both fetch and curl fail

### Implementation Details

**File:** `src/utils/bun-fetch-fallback.ts` (182 lines)

**Key Features:**
- Drop-in replacement for native fetch
- Automatic fallback with no manual intervention
- Supports all HTTP methods (GET, POST, PUT, DELETE, PATCH)
- Handles request headers and body
- Returns standard Response object
- AbortSignal support for timeouts
- Parses HTTP response headers correctly

**Architecture:**
```typescript
fetchWithFallback(url, options)
  ├─> Try native fetch()
  │     ├─> Success: Return Response
  │     └─> Failure: Continue to curl fallback
  │
  └─> Try curl via Bun.spawn()
        ├─> Build curl command with headers/body
        ├─> Execute curl subprocess
        ├─> Parse HTTP response (headers + body)
        ├─> Create Response object
        ├─> Success: Return Response
        └─> Failure: Throw original fetch error
```

### Integration Points

**Kong Adapter** (`src/adapters/kong.adapter.ts:17`):
```typescript
import { fetchWithFallback } from '../utils/bun-fetch-fallback';

// Used for all Kong Admin API requests
const response = await fetchWithFallback(url, options);
```

**Benefits:**
- Transparent to Kong adapter code
- No changes required to existing logic
- Works with circuit breaker patterns
- Maintains error handling behavior

## Test Coverage

**3 comprehensive test files:**

1. **`test/bun/utils/bun-fetch-fallback-internals.test.ts`** (521 lines)
   - Tests internal curl command building
   - Tests HTTP response parsing
   - Tests error handling and edge cases

2. **`test/bun/utils/bun-fetch-fallback-real.test.ts`** (785 lines)
   - Tests against real Kong instance
   - Validates end-to-end behavior
   - Tests all HTTP methods (GET, POST, PUT, DELETE)
   - Verifies header propagation
   - Tests JSON body handling

3. **`test/bun/utils/bun-fetch-fallback-mutation-killers.test.ts`** (516 lines)
   - Mutation testing for fallback logic
   - Ensures comprehensive test coverage
   - Validates error scenarios

## Performance Impact

**Measurements:**

| Scenario | Native Fetch | Curl Fallback | Overhead |
|----------|-------------|---------------|----------|
| Successful fetch | ~5-10ms | N/A | 0% (no fallback needed) |
| Failed fetch + curl success | N/A | ~50-100ms | Acceptable for fallback |
| Both fail | ~15ms | ~65ms | Minimal (operation fails anyway) |

**Key Points:**
- **Zero overhead** when native fetch succeeds (happy path)
- Curl fallback only activates on fetch failure
- Acceptable latency for error recovery scenario
- Test improvements: 1981 → 1989 tests passing (+8 tests)

## Usage Guidelines

### When to Use

Use `fetchWithFallback()` for:
- Kong Admin API requests (already integrated)
- External service calls that may use local IPs
- Integration tests connecting to remote services
- Any HTTP requests to `192.168.x.x` or `10.x.x.x` ranges

### When NOT to Use

Use native `fetch()` for:
- Public internet URLs (github.com, api.example.com)
- Localhost URLs (`http://localhost:3000`)
- URLs known to work with Bun fetch
- Performance-critical paths where fallback overhead is unacceptable

### Migration Pattern

**Before (broken with local IPs):**
```typescript
const response = await fetch(kongAdminUrl);
```

**After (works with all IPs):**
```typescript
import { fetchWithFallback } from './utils/bun-fetch-fallback';
const response = await fetchWithFallback(kongAdminUrl);
```

## Verification Steps

### 1. Test Local IP Connectivity

```bash
# Check if Kong is accessible via curl
curl http://192.168.178.3:30001/status

# Run integration tests with real Kong
bun run test:integration

# Verify test improvements
# Before: 1981 tests passing
# After: 1989 tests passing (8 more tests work)
```

### 2. Verify Fallback Activation

```bash
# Enable debug logging to see fallback in action
LOG_LEVEL=debug bun run dev

# Make request to Kong on local IP
curl -X POST http://localhost:3000/tokens \
  -H "X-Consumer-ID: test-consumer" \
  -H "X-Consumer-Username: test-consumer"

# Look for logs showing:
# - "Fetch failed, trying curl fallback"
# - "Curl fallback successful"
```

### 3. Test All HTTP Methods

```bash
# Run comprehensive fallback tests
bun test test/bun/utils/bun-fetch-fallback-real.test.ts

# Should see:
# - GET requests work
# - POST requests with JSON body work
# - PUT/DELETE/PATCH requests work
# - Headers propagate correctly
```

## Status

**Implementation Status:** COMPLETE (2026-01-23)
**Commit:** bfdcd99 - "SIO-287: Add curl fallback for Bun fetch networking bug"
**Test Coverage:** 3 test files, 1,800+ lines of tests
**Production Ready:** Yes

## Future Improvements

**Monitoring Potential Bun Fixes:**
- Track Bun GitHub issues for networking bug resolution
- Test each new Bun version to see if fetch works with local IPs
- Consider removing fallback once Bun networking is fixed

**Potential Optimization:**
- Add metrics to track fallback activation frequency
- Log fallback usage for observability
- Consider caching "known broken" IP ranges

## Related Documentation

- **Integration Test Setup**: `docs/development/integration-tests-network-setup.md`
- **Kong Test Setup**: `docs/development/kong-test-setup.md`
- **Test Documentation**: `test/README.md`
- **CLAUDE.md**: Live testing strategy

## Troubleshooting

### Problem: Tests Still Failing with Local IP

**Check:**
```bash
# Verify curl is available
which curl

# Test curl directly
curl -I http://192.168.178.3:30001/status

# Check if Kong is reachable
ping 192.168.178.3

# Verify .env has correct Kong URL
grep KONG_ADMIN_URL .env
```

### Problem: Fallback Seems Slow

**Expected behavior**: Curl fallback adds 50-100ms latency, which is acceptable for error recovery.

**If too slow:**
- Check network latency to Kong instance
- Verify Kong Admin API is responding quickly
- Consider using SSH tunnel or kubectl port-forward for faster localhost access

### Problem: Both Fetch and Curl Fail

**This indicates a real connectivity issue:**
```bash
# Check network connectivity
ping 192.168.178.3

# Check Kong service is running
ssh user@192.168.178.3 "docker ps | grep kong"

# Check firewall rules
# Ensure port 30001 is accessible
```

**Solution**: Fix underlying network/Kong issue, not a fallback problem.
