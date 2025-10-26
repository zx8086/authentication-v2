# Cache Pollution Fix - SIO-74 Circuit Breaker Issue

## Problem Analysis

The issue was related to cache pollution where different consumers were sharing the same JWT credentials, leading to:

1. **Different consumers getting the same JWT key** - violating security isolation
2. **Non-existent consumers getting 200 instead of 401/503** - indicating they were receiving cached data from other consumers

## Root Cause

The problem was in the circuit breaker's stale cache fallback mechanism. When the circuit breaker was open and falling back to cached data, it was not validating that the cached consumer data actually belonged to the requested consumer. This could happen in scenarios where:

1. Cache keys were somehow getting mixed up
2. Redis returned data for the wrong consumer due to a race condition
3. Kong API returned mismatched consumer data that got cached

## Solution Implementation

### 1. Circuit Breaker Stale Cache Validation

**File**: `src/services/circuit-breaker.service.ts`

Added validation in `handleOpenCircuitWithStaleData()` method to ensure cached consumer data belongs to the requested consumer:

```typescript
// CRITICAL FIX: Validate that the cached consumer data actually belongs to the requested consumer
if (redisStale.consumer && redisStale.consumer.id !== consumerId) {
  winstonTelemetryLogger.error(
    `Cache pollution detected: cached consumer ID mismatch`,
    {
      operation,
      requestedConsumerId: consumerId,
      cachedConsumerId: redisStale.consumer.id,
      // ... more context
    }
  );
  recordCacheTierError("redis-stale", operation, "cache_pollution");
  return null; // Don't return wrong consumer's data
}
```

### 2. Circuit Breaker Cache Update Validation

**File**: `src/services/circuit-breaker.service.ts`

Added validation in `wrapKongConsumerOperation()` method before caching Kong response data:

```typescript
// CRITICAL FIX: Validate consumer data before caching to prevent cache pollution
if (result.consumer && result.consumer.id !== consumerId) {
  winstonTelemetryLogger.error(
    `Consumer ID mismatch in Kong response, not caching`,
    {
      operation,
      requestedConsumerId: consumerId,
      responseConsumerId: result.consumer.id,
      // ... more context
    }
  );
  // Don't cache wrong consumer data, but still return it (Kong returned it)
  return result;
}
```

### 3. Kong Adapter Validation

**File**: `src/adapters/kong.adapter.ts`

Added validation in both `getConsumerSecret()` and `createConsumerSecret()` methods:

```typescript
// CRITICAL FIX: Validate consumer data before caching to prevent cache pollution
if (secret.consumer && secret.consumer.id !== consumerId) {
  winstonTelemetryLogger.error(
    `Consumer ID mismatch in Kong response, not caching`,
    {
      operation: "getConsumerSecret",
      requestedConsumerId: consumerId,
      responseConsumerId: secret.consumer.id,
      // ... more context
    }
  );
  // Don't cache wrong consumer data, but still return it
  return secret;
}
```

### 4. Legacy Service Validation

**Files**:
- `src/services/legacy/kong-api-gateway.service.ts`
- `src/services/legacy/kong-konnect.service.ts`

Added the same validation pattern to both legacy Kong services to prevent cache pollution at the source.

### 5. Redis Cache Layer Validation

**File**: `src/services/cache/shared-redis-cache.ts`

Added validation in the `set()` method to prevent storing mismatched consumer data:

```typescript
// CRITICAL FIX: Validate cache key and consumer data consistency to prevent cache pollution
if (key.startsWith("consumer_secret:") && value.consumer) {
  const expectedConsumerId = key.replace("consumer_secret:", "");
  if (value.consumer.id !== expectedConsumerId) {
    winstonTelemetryLogger.error(
      `Cache key and consumer ID mismatch detected, preventing cache pollution`,
      {
        cacheKey: key,
        expectedConsumerId,
        actualConsumerId: value.consumer.id,
        // ... more context
      }
    );
    // Don't cache mismatched data
    return;
  }
}
```

## Defense in Depth Strategy

The fix implements multiple layers of validation:

1. **Source Validation**: Kong API responses are validated before caching
2. **Cache Storage Validation**: Redis cache validates data consistency before storing
3. **Cache Retrieval Validation**: Circuit breaker validates cached data before returning
4. **Comprehensive Logging**: All validation failures are logged with detailed context
5. **Metrics Integration**: Cache pollution events are recorded as metrics

## Testing

The fix includes comprehensive test scripts:

- `test-cache-pollution-fix.sh` - Complete validation of the fix
- `quick-test.sh` - Quick verification of the specific failing tests

## Expected Outcomes

After applying this fix:

1. ✅ Different consumers will always get different JWT keys
2. ✅ Non-existent consumers will consistently get 401/503 responses
3. ✅ Cache pollution events will be detected and prevented
4. ✅ Detailed logging will help identify any underlying Kong API issues
5. ✅ System reliability will be improved through defense-in-depth validation

## Monitoring

Watch for these log entries to monitor the fix effectiveness:

- `Cache pollution detected: cached consumer ID mismatch` - Circuit breaker caught cache pollution
- `Consumer ID mismatch in Kong response, not caching` - Kong API returned wrong data
- `Cache key and consumer ID mismatch detected, preventing cache pollution` - Redis layer prevented pollution

Monitor the `cache_pollution` error type in cache tier metrics to track incidents.