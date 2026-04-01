# Instrumentation Guide

This guide covers how to add OpenTelemetry (OTel) instrumentation to code in this service. It starts with **generic OTel patterns** that work in any JavaScript/TypeScript project, then describes the **service-specific wrapper APIs** built on top of those primitives.

For the architecture of the telemetry pipeline itself (providers, exporters, SDK wiring), see [telemetry.md](../architecture/telemetry.md). For the operational view of dashboards, alerts, and metric inventories, see [monitoring.md](../operations/monitoring.md).

---

## Generic OTel Patterns

These patterns use the `@opentelemetry/api` package directly. They are portable across any OTel-instrumented JS/TS project -- nothing here is service-specific.

### Creating Spans (Generic)

A span represents a single unit of work. The fundamental pattern is:

```typescript
import { trace, SpanKind, SpanStatusCode } from '@opentelemetry/api';

const tracer = trace.getTracer('my-service', '1.0.0');

// Synchronous span
function processItem(item: Item): Result {
  return tracer.startActiveSpan('process.item', (span) => {
    try {
      const result = doWork(item);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  });
}
```

**Async variant:**

```typescript
async function fetchData(url: string): Promise<Data> {
  return tracer.startActiveSpan(
    'http.client.fetch',
    { kind: SpanKind.CLIENT },
    async (span) => {
      try {
        span.setAttribute('http.url', url);
        const response = await fetch(url);
        span.setAttribute('http.status_code', response.status);
        span.setStatus({ code: SpanStatusCode.OK });
        return await response.json();
      } catch (error) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
        span.recordException(error as Error);
        throw error;
      } finally {
        span.end();
      }
    }
  );
}
```

**SpanKind options:**

| SpanKind | When to use |
|----------|-------------|
| `INTERNAL` | Default. Work that stays inside the process. |
| `CLIENT` | Outbound request to another service. |
| `SERVER` | Handling an inbound request. |
| `PRODUCER` | Enqueuing a message (Kafka, SQS, etc.). |
| `CONSUMER` | Processing a dequeued message. |

### Creating Metrics (Generic)

Metrics capture numerical measurements aggregated over time.

```typescript
import { metrics } from '@opentelemetry/api';

const meter = metrics.getMeter('my-service', '1.0.0');
```

**Counter** -- monotonically increasing value (requests served, errors occurred):

```typescript
const requestCounter = meter.createCounter('http.requests.total', {
  description: 'Total HTTP requests handled',
  unit: '{request}',
});

// Record
requestCounter.add(1, { 'http.method': 'GET', 'http.route': '/tokens' });
```

**Histogram** -- distribution of values (latencies, payload sizes):

```typescript
const latencyHistogram = meter.createHistogram('http.request.duration', {
  description: 'HTTP request duration in milliseconds',
  unit: 'ms',
});

// Record
const start = performance.now();
await handleRequest();
latencyHistogram.record(performance.now() - start, { 'http.route': '/tokens' });
```

**UpDownCounter** -- value that can increase or decrease (active connections, queue depth):

```typescript
const activeConnections = meter.createUpDownCounter('connections.active', {
  description: 'Number of active connections',
  unit: '{connection}',
});

activeConnections.add(1);   // connection opened
activeConnections.add(-1);  // connection closed
```

**ObservableGauge** -- value read on demand at collection time (CPU usage, memory):

```typescript
meter.createObservableGauge('process.memory.heap', {
  description: 'Heap memory usage in bytes',
  unit: 'By',
}).addCallback((result) => {
  result.observe(process.memoryUsage().heapUsed);
});
```

### Choosing the Right Instrument Type

| I want to measure... | Instrument | Example |
|----------------------|------------|---------|
| How many times X happened | Counter | Requests, errors, cache hits |
| How long X took | Histogram | Request latency, DB query time |
| Distribution of values | Histogram | Response payload sizes |
| A current level that goes up and down | UpDownCounter | Active connections, queue depth |
| A snapshot value read periodically | ObservableGauge | Memory usage, CPU percent |

### Adding Span Events (Generic)

Span events are timestamped annotations within a span. They mark discrete moments without creating a new child span.

```typescript
import { trace } from '@opentelemetry/api';

// Get the current active span
const span = trace.getActiveSpan();
if (span) {
  // Simple event
  span.addEvent('cache.lookup.start');

  // Event with attributes
  span.addEvent('cache.lookup.complete', {
    'cache.hit': true,
    'cache.backend': 'redis',
    'cache.latency_ms': 2.3,
  });
}
```

Span events are part of the trace signal and are **always captured** regardless of log level settings. They are ideal for critical correlation points that must never be filtered out.

---

## Service Wrapper APIs

The following APIs wrap the generic OTel primitives with service-specific conventions. They are implemented in `src/telemetry/` and provide consistent naming, error handling, and attribute schemas.

### Tracer API

The tracer provides a clean API for creating custom spans. Use this when adding instrumentation to new code paths.

**Implementation:** `src/telemetry/tracer.ts`

#### Creating Custom Spans

```typescript
import { telemetryTracer, createSpan } from '../telemetry/tracer';
import { SpanKind } from '@opentelemetry/api';

// Method 1: Using telemetryTracer instance
const result = await telemetryTracer.createSpan(
  {
    operationName: 'my.custom.operation',
    kind: SpanKind.INTERNAL,
    attributes: {
      'custom.attribute': 'value',
      'operation.type': 'processing',
    },
  },
  async () => {
    // Your async operation here
    return await doSomething();
  }
);

// Method 2: Using exported createSpan function
const result = createSpan(
  { operationName: 'quick.operation' },
  () => syncOperation()
);
```

#### Specialized Span Methods

```typescript
// HTTP client spans (for outbound requests)
telemetryTracer.createHttpSpan(
  'POST',                           // method
  'https://api.example.com/data',   // url
  200,                              // statusCode
  async () => await fetch(...),     // operation
  {                                 // optional: version context
    version: 'v2',
    source: 'header',
    isLatest: true,
    isSupported: true,
  }
);

// Kong Admin API spans
telemetryTracer.createKongSpan(
  'getConsumer',                    // operation name
  'https://kong:8001/consumers/x',  // url
  'GET',                            // method
  async () => await kongClient.getConsumer(...)
);

// JWT generation spans
telemetryTracer.createJWTSpan(
  'generate',                       // operation
  async () => await generateToken(...),
  'user@example.com'                // optional: username
);

// API versioning spans
telemetryTracer.createApiVersionSpan(
  'route_selection',                // operation
  async () => await selectRoute(...),
  {
    version: 'v2',
    source: 'Accept-Version',
    parseTimeMs: 0.5,
    routingTimeMs: 1.2,
  }
);
```

#### Adding Attributes to Active Span

```typescript
// Add attributes to the currently active span
telemetryTracer.addSpanAttributes({
  'consumer.id': consumerId,
  'cache.hit': true,
  'processing.step': 'validation',
});

// Record exceptions on the active span
try {
  await riskyOperation();
} catch (error) {
  telemetryTracer.recordException(error as Error);
  throw error;
}

// Get trace context for logging
const traceId = telemetryTracer.getCurrentTraceId();
const spanId = telemetryTracer.getCurrentSpanId();
```

#### Span Naming Conventions

| Pattern | Use Case | Example |
|---------|----------|---------|
| `http.client.<service>.<operation>` | Outbound HTTP | `http.client.kong.getConsumer` |
| `crypto.jwt.<operation>` | JWT operations | `crypto.jwt.generate` |
| `cache.<backend>.<operation>` | Cache operations | `cache.redis.get` |
| `api_versioning.<operation>` | Version routing | `api_versioning.route_selection` |
| `<method> <path>` | HTTP server spans | `GET /tokens` |

### Span Events

Span events are timestamped annotations attached directly to spans, providing a way to capture discrete moments within a span's lifetime. Unlike logs, **span events are ALWAYS captured regardless of LOG_LEVEL**, making them the ideal choice for critical correlation points that must never be filtered out.

#### LOG_LEVEL vs Span Events: Understanding the Trade-off

When you set `LOG_LEVEL=warn` to reduce log verbosity in production:
- **Logs**: Only `warn` and `error` level logs are sent to OTLP (and console)
- **Traces**: ALL spans are still captured (unaffected by LOG_LEVEL)
- **Metrics**: ALL metrics are still captured (unaffected by LOG_LEVEL)
- **Span Events**: ALL events are captured (part of traces, unaffected by LOG_LEVEL)

**The Problem:**
```typescript
// With LOG_LEVEL=warn, this info log is DROPPED
info('Consumer lookup successful', { consumerId, cacheHit: true });

// You lose visibility into successful operations when filtering logs
```

**The Solution: Span Events**
```typescript
// Span events are ALWAYS captured, regardless of LOG_LEVEL
telemetryTracer.addEvent('consumer.lookup.success', {
  'consumer.id': consumerId,
  'cache.hit': true,
});
```

#### When to Use Span Events vs Logs

| Scenario | Use Span Event | Use Log |
|----------|----------------|---------|
| Critical correlation points (e.g., cache hit/miss) | Yes | No |
| Debug information for development | No | Yes |
| Error conditions | Both | Yes |
| Business logic milestones | Yes | Optional |
| Verbose diagnostic output | No | Yes (debug level) |
| Data that MUST appear in traces | Yes | No |
| High-volume repetitive messages | No | Yes (can be filtered) |

#### Tracer API for Span Events

**Implementation:** `src/telemetry/tracer.ts`

```typescript
import { telemetryTracer } from '../telemetry/tracer';

// Basic event - always captured regardless of LOG_LEVEL
telemetryTracer.addEvent('cache.hit', {
  'cache.tier': 'l1',
  'cache.key': 'consumer:abc123',
});

// Timed event - automatically calculates duration
const startTime = performance.now();
await doExpensiveOperation();
telemetryTracer.addTimedEvent('expensive.operation.complete', startTime, {
  'operation.type': 'validation',
  'items.processed': 150,
});
```

#### Critical Correlation Points to Capture

These operations should use span events for guaranteed visibility:

**1. Cache Operations**
```typescript
// Cache hit - critical for performance analysis
telemetryTracer.addEvent('cache.hit', {
  'cache.tier': tier,           // 'l1' | 'l2'
  'cache.backend': 'redis',
  'cache.key_prefix': 'consumer',
  'cache.ttl_remaining_ms': ttl,
});

// Cache miss - triggers downstream lookup
telemetryTracer.addEvent('cache.miss', {
  'cache.tier': tier,
  'cache.backend': 'redis',
  'fallback.action': 'kong_lookup',
});
```

**2. Kong Consumer Lookup**
```typescript
// Consumer found
telemetryTracer.addEvent('kong.consumer.found', {
  'consumer.id': consumerId,
  'consumer.username': username,
  'lookup.duration_ms': durationMs,
});

// Consumer validation
telemetryTracer.addEvent('consumer.validation.complete', {
  'validation.result': 'valid',
  'consumer.is_anonymous': false,
});
```

**3. JWT Operations**
```typescript
// Token generation milestones
telemetryTracer.addEvent('jwt.claims.prepared', {
  'claims.count': Object.keys(claims).length,
  'audience.count': Array.isArray(aud) ? aud.length : 1,
});

telemetryTracer.addEvent('jwt.signed', {
  'algorithm': 'HS256',
  'token.length': token.length,
});
```

**4. Circuit Breaker State Changes**
```typescript
// State transitions (critical for understanding failures)
telemetryTracer.addEvent('circuit_breaker.state_change', {
  'cb.name': 'kong',
  'cb.previous_state': 'closed',
  'cb.new_state': 'open',
  'cb.failure_count': failureCount,
});

// Stale cache fallback (important for resilience visibility)
telemetryTracer.addEvent('circuit_breaker.stale_cache_used', {
  'cb.name': 'kong',
  'cache.age_seconds': cacheAge,
  'cache.key': cacheKey,
});
```

#### Event Naming Conventions

| Pattern | Use Case | Example |
|---------|----------|---------|
| `<component>.<action>` | General events | `cache.hit`, `jwt.signed` |
| `<component>.<entity>.<action>` | Entity operations | `kong.consumer.found` |
| `<component>.<action>.<result>` | Result-based | `validation.complete.success` |
| `circuit_breaker.<event>` | CB state changes | `circuit_breaker.state_change` |

#### Viewing Span Events in Observability Tools

**Elastic APM:**
1. Open the trace/transaction view
2. Expand the span of interest
3. Events appear in the "Events" tab with timestamps
4. Click event to see all attributes

**Jaeger:**
1. View trace details
2. Expand span
3. Events listed under "Logs" section (Jaeger terminology)
4. Each event shows timestamp and attributes

**Datadog:**
1. Open trace view
2. Click on span
3. Events appear in "Span Events" section
4. Attributes displayed as key-value pairs

#### TelemetryEmitter: Unified Span Events + Logs API

The `TelemetryEmitter` provides a unified API that emits BOTH span events AND logs in a single call. This is the recommended approach for critical correlation points.

**Implementation:** `src/telemetry/telemetry-emitter.ts`

**Key Benefits:**
- **Single API**: One call emits both span event and log
- **Span events ALWAYS captured**: Regardless of LOG_LEVEL setting
- **Logs filtered by LOG_LEVEL**: Reduces noise in production
- **Type-safe event names**: Use `SpanEvents` constants for compile-time checking
- **Consistent attributes**: Same data appears in both traces and logs

**Basic Usage:**
```typescript
import { telemetryEmitter, SpanEvents } from '../telemetry/tracer';

// Info level - emits span event + info log
telemetryEmitter.info(SpanEvents.CACHE_HIT, 'Cache hit', {
  key: 'consumer:123',
  tier: 'l1',
});

// Warning level - emits span event + warn log
telemetryEmitter.warn(SpanEvents.CB_FAILURE, 'Circuit breaker failure', {
  operation: 'getConsumerSecret',
  error: 'Connection timeout',
  failure_count: 3,
});

// Error level - emits span event + error log
telemetryEmitter.error(SpanEvents.CB_STATE_OPEN, 'Circuit breaker opened', {
  operation: 'kong_health_check',
  failure_count: 5,
  reset_timeout_ms: 30000,
});

// Debug level (filtered in production with LOG_LEVEL=warn)
telemetryEmitter.debug(SpanEvents.CACHE_OPERATION_STARTED, 'Starting cache operation', {
  key: 'consumer:456',
});
```

**Timed Operations:**
```typescript
const startTime = performance.now();
await doExpensiveOperation();

// Automatically calculates duration_ms
telemetryEmitter.timed(SpanEvents.CACHE_SET, 'Cache set completed', startTime, {
  key: 'consumer:123',
  ttl_seconds: 300,
});

// With explicit log level
telemetryEmitter.timedWithLevel(
  SpanEvents.CB_TIMEOUT,
  'Operation timed out',
  'warn',
  startTime,
  { operation: 'kong_lookup' }
);
```

**Full Options API:**
```typescript
telemetryEmitter.emit({
  event: SpanEvents.CB_STATE_OPEN,
  message: 'Circuit breaker opened',
  level: 'error',  // 'debug' | 'info' | 'warn' | 'error'
  attributes: {
    operation: 'getConsumerSecret',
    failure_count: 5,
  },
  startTime: operationStartTime,  // Optional: auto-calculates duration
});
```

#### SpanEvents Constants

Type-safe event name constants following the `<component>.<sub_component>.<action>` naming convention:

```typescript
import { SpanEvents } from '../telemetry/tracer';

// Circuit Breaker Events
SpanEvents.CB_STATE_OPEN           // "circuit_breaker.state.open"
SpanEvents.CB_STATE_HALF_OPEN      // "circuit_breaker.state.half_open"
SpanEvents.CB_STATE_CLOSED         // "circuit_breaker.state.closed"
SpanEvents.CB_FAILURE              // "circuit_breaker.failure"
SpanEvents.CB_FALLBACK_USED        // "circuit_breaker.fallback.used"
SpanEvents.CB_REQUEST_REJECTED     // "circuit_breaker.request.rejected"

// Cache Events
SpanEvents.CACHE_HIT               // "cache.hit"
SpanEvents.CACHE_MISS              // "cache.miss"
SpanEvents.CACHE_SET               // "cache.set"
SpanEvents.CACHE_DELETE            // "cache.delete"
SpanEvents.CACHE_CONNECTED         // "cache.connection.established"
SpanEvents.CACHE_DISCONNECTED      // "cache.connection.lost"
SpanEvents.CACHE_OPERATION_STARTED // "cache.operation.started"
SpanEvents.CACHE_OPERATION_COMPLETED // "cache.operation.completed"
SpanEvents.CACHE_OPERATION_FAILED  // "cache.operation.failed"

// Kong Events
SpanEvents.KONG_CONSUMER_FOUND     // "kong.consumer.found"
SpanEvents.KONG_CONSUMER_NOT_FOUND // "kong.consumer.not_found"
SpanEvents.KONG_CACHE_HIT          // "kong.cache.hit"
SpanEvents.KONG_REQUEST_SUCCESS    // "kong.request.success"
SpanEvents.KONG_REQUEST_FAILED     // "kong.request.failed"
SpanEvents.KONG_REALM_CREATED      // "kong.realm.created"

// Validation Events
SpanEvents.VALIDATION_FAILED       // "validation.failed"
SpanEvents.VALIDATION_FAILED_STRICT // "validation.failed.strict"
SpanEvents.VALIDATION_JSON_PARSE_FAILED // "validation.json.parse_failed"

// Health Check Events
SpanEvents.HEALTH_CHECK_SUCCESS    // "health.check.success"
SpanEvents.HEALTH_CHECK_DEGRADED   // "health.check.degraded"
SpanEvents.HEALTH_CHECK_FAILED     // "health.check.failed"
```

#### Migration Strategy: Logs to TelemetryEmitter

When converting existing logs to use the unified TelemetryEmitter:

**Before (log-based):**
```typescript
import { winstonTelemetryLogger } from '../telemetry/winston-logger';

// These get filtered when LOG_LEVEL=warn
winstonTelemetryLogger.info('Cache lookup completed', {
  cacheHit: true,
  tier: 'l1',
  duration: 2.5,
});
```

**After (TelemetryEmitter):**
```typescript
import { telemetryEmitter, SpanEvents } from '../telemetry/tracer';

// Span event is ALWAYS captured, log is filtered by LOG_LEVEL
telemetryEmitter.info(SpanEvents.CACHE_HIT, 'Cache lookup completed', {
  cache_hit: true,       // Note: snake_case for attributes
  tier: 'l1',
  duration_ms: 2.5,
});
```

**Key Migration Steps:**
1. Replace `winstonTelemetryLogger` import with `import { telemetryEmitter, SpanEvents } from "../telemetry/tracer";`
2. Add appropriate `SpanEvents` constant as first argument
3. Convert attribute names from camelCase to snake_case
4. Flatten any nested objects (TelemetryEmitter expects flat key-value pairs)
5. Handle null values with `?? "default"` (undefined is allowed)

#### Best Practices

1. **Event names should be dot-separated lowercase**: `cache.hit`, not `CacheHit` or `cache-hit`
2. **Keep attribute count reasonable**: 3-7 attributes per event
3. **Use semantic attribute names**: Prefix with component (`cache.`, `kong.`, `jwt.`)
4. **Include timing for async operations**: Use `addTimedEvent()` for duration tracking
5. **Don't duplicate information**: If it's in span attributes, don't repeat in events
6. **Reserve logs for verbosity**: Use debug/info logs for detailed diagnostics that can be filtered

#### Performance Considerations

Span events have minimal overhead:
- Events are stored in memory with the span until export
- Export happens in batches via `BatchSpanProcessor`
- Event attributes are limited to primitive types (string, number, boolean)
- No network I/O until batch export

For high-throughput paths, prefer a single event with multiple attributes over multiple events:

```typescript
// Better: Single event with multiple attributes
telemetryTracer.addEvent('request.processed', {
  'cache.hit': true,
  'cache.tier': 'l1',
  'kong.called': false,
  'jwt.generated': true,
  'total_duration_ms': totalMs,
});

// Worse: Multiple events for same logical operation
telemetryTracer.addEvent('cache.hit');
telemetryTracer.addEvent('kong.skipped');
telemetryTracer.addEvent('jwt.generated');
```

### Cardinality Guard

Prevents metric cardinality explosion by limiting unique consumer IDs tracked in metrics. When the limit is reached, new consumers are hashed into buckets.

**Implementation:** `src/telemetry/cardinality-guard.ts`

#### Configuration

| Setting | Value | Description |
|---------|-------|-------------|
| `maxUniqueConsumers` | 1000 | Max individually tracked consumers |
| `hashBuckets` | 256 | Overflow bucket count |
| `resetIntervalMs` | 3600000 (1 hour) | Tracking reset interval |
| `warningThresholdPercent` | 80 | Warning at 80% capacity |

#### How It Works

```typescript
import { getBoundedConsumerId, getCardinalityStats } from '../telemetry/cardinality-guard';

// Returns consumerId if under limit, otherwise bucket_XXX
const metricConsumerId = getBoundedConsumerId(actualConsumerId);

// Examples:
getBoundedConsumerId('consumer-001')  // 'consumer-001' (tracked individually)
getBoundedConsumerId('consumer-1001') // 'bucket_042' (hashed to bucket)

// Get current stats
const stats = getCardinalityStats();
// {
//   uniqueConsumersTracked: 847,
//   maxUniqueConsumers: 1000,
//   usagePercent: 84.7,
//   limitExceeded: false,
//   bucketsUsed: 0,
//   totalBuckets: 256,
//   totalRequests: 125000,
//   warningsEmitted: 1,
//   timeSinceReset: 1800000
// }
```

#### Warning Levels

```typescript
import { getCardinalityWarningLevel } from '../telemetry/cardinality-guard';

const level = getCardinalityWarningLevel();
// 'ok'       - Under 80% capacity
// 'warning'  - 80-99% capacity
// 'critical' - At or over 100% (bucketing active)
```

#### Monitoring Cardinality

The cardinality stats are exposed in the `/metrics?view=full` endpoint:

```json
{
  "cardinality": {
    "uniqueConsumersTracked": 847,
    "maxUniqueConsumers": 1000,
    "usagePercent": 84.7,
    "limitExceeded": false,
    "warningLevel": "warning"
  }
}
```

---

## How to Instrument a New Feature

Follow these steps when adding telemetry to new code.

### Step 1: Identify What to Measure

| Signal | When to use | OTel primitive |
|--------|-------------|----------------|
| **Trace (span)** | An operation with meaningful duration | `tracer.startActiveSpan()` or `telemetryTracer.createSpan()` |
| **Metric** | A count, distribution, or current level | `meter.createCounter()` / `createHistogram()` / etc. |
| **Span event** | A discrete debug moment within an existing span | `span.addEvent()` or `telemetryEmitter.info()` |
| **Log** | Verbose diagnostics, filtered by level | `logger.info()` / `logger.debug()` |

Rules of thumb:
- If it has a start and end, it is a **span**.
- If you want to aggregate across many requests (counts, percentiles), it is a **metric**.
- If you want to annotate a moment inside an already-instrumented span, it is a **span event**.
- If it is detailed diagnostic output that can be dropped in production, it is a **log**.

### Step 2: Name It

**Span naming conventions:**

| Pattern | When | Example |
|---------|------|---------|
| `http.client.<service>.<operation>` | Outbound HTTP calls | `http.client.kong.getConsumer` |
| `crypto.<algorithm>.<operation>` | Cryptographic work | `crypto.jwt.generate` |
| `cache.<backend>.<operation>` | Cache interactions | `cache.redis.get` |
| `<domain>.<operation>` | Internal business logic | `consumer.validate` |
| `<METHOD> <path>` | HTTP server spans (auto) | `GET /tokens` |

**Metric naming conventions:**

| Pattern | When | Example |
|---------|------|---------|
| `<noun>.<noun>.<unit_or_verb>` | General metric | `http.requests.total` |
| `<component>.<measurement>.{unit}` | Duration / size | `kong.request.duration` |
| Use `_total` suffix for counters | Prometheus compat | `auth.tokens.generated_total` |
| Use unit in name or metadata | Clarity | `http.request.duration` with `unit: 'ms'` |

**Span event naming conventions:**

| Pattern | When | Example |
|---------|------|---------|
| `<component>.<action>` | General events | `cache.hit`, `jwt.signed` |
| `<component>.<entity>.<action>` | Entity operations | `kong.consumer.found` |
| `<component>.<action>.<result>` | Result-qualified | `validation.complete.success` |

All names use **dot-separated lowercase**. No camelCase, no hyphens.

### Step 3: Implement

**Adding a new span** (using service wrapper):

```typescript
import { telemetryTracer } from '../telemetry/tracer';
import { SpanKind } from '@opentelemetry/api';

const result = await telemetryTracer.createSpan(
  {
    operationName: 'consumer.validate',
    kind: SpanKind.INTERNAL,
    attributes: { 'consumer.id': consumerId },
  },
  async () => {
    const consumer = await lookupConsumer(consumerId);
    telemetryTracer.addSpanAttributes({ 'consumer.is_anonymous': consumer.isAnonymous });
    return consumer;
  }
);
```

**Adding a new metric** (using generic OTel API):

```typescript
import { metrics } from '@opentelemetry/api';

const meter = metrics.getMeter('authentication-service');

const tokenCounter = meter.createCounter('auth.tokens.generated_total', {
  description: 'Total JWT tokens generated',
  unit: '{token}',
});

// In the handler
tokenCounter.add(1, { 'consumer.id': getBoundedConsumerId(consumerId) });
```

**Adding span events** (using TelemetryEmitter):

```typescript
import { telemetryEmitter, SpanEvents } from '../telemetry/tracer';

telemetryEmitter.info(SpanEvents.CACHE_HIT, 'Consumer found in cache', {
  consumer_id: consumerId,
  cache_tier: 'l1',
  ttl_remaining_ms: ttl,
});
```

### Step 4: Manage Cardinality

Metric attributes (labels) create time series. Each unique combination of attribute values is a separate series. Unbounded attributes cause cardinality explosion.

| Cardinality | Safe as attribute? | Examples |
|-------------|-------------------|----------|
| **Low** (< 20 values) | Always safe | HTTP method, status code class, API version |
| **Medium** (20-500 values) | Usually safe | Endpoint route, error code, consumer tier |
| **High** (500+ values) | Use cardinality guard | Consumer ID, request ID, IP address |

For consumer IDs, always use the cardinality guard:

```typescript
import { getBoundedConsumerId } from '../telemetry/cardinality-guard';

// Safe: bounded to 1000 unique + 256 buckets
counter.add(1, { 'consumer.id': getBoundedConsumerId(rawConsumerId) });

// Dangerous: unbounded cardinality
counter.add(1, { 'consumer.id': rawConsumerId });
```

Never use request IDs, trace IDs, or full URLs as metric attributes. These belong in span attributes (traces), not metrics.

### Step 5: Test It

See the [Testing Instrumentation](#testing-instrumentation) section below. At minimum:

1. Verify the instrumented function returns correct results.
2. Verify errors propagate correctly (not swallowed by telemetry).
3. Verify telemetry calls do not throw.

---

## Testing Instrumentation

All examples use `bun:test`. The same patterns work with Jest or Vitest -- only the import line differs (`import { describe, it, expect } from 'vitest'`).

### Testing Spans (bun:test)

The primary pattern: call the instrumented function, verify it returns correctly, verify errors propagate. The telemetry itself should not change observable behavior.

```typescript
import { describe, expect, it } from 'bun:test';
import { SpanKind } from '@opentelemetry/api';
import { telemetryTracer } from '../../../src/telemetry/tracer';

describe('createSpan', () => {
  it('should execute operation and return result', () => {
    const result = telemetryTracer.createSpan(
      { operationName: 'test.operation', kind: SpanKind.INTERNAL },
      () => 42
    );
    expect(result).toBe(42);
  });

  it('should propagate errors from the wrapped operation', () => {
    expect(() => {
      telemetryTracer.createSpan(
        { operationName: 'test.error' },
        () => { throw new Error('Expected failure'); }
      );
    }).toThrow('Expected failure');
  });

  it('should handle async operations', async () => {
    const result = await telemetryTracer.createSpan(
      { operationName: 'test.async' },
      async () => {
        return { success: true, value: 123 };
      }
    );
    expect(result).toEqual({ success: true, value: 123 });
  });

  it('should accept custom attributes without affecting result', () => {
    const result = telemetryTracer.createSpan(
      {
        operationName: 'test.with.attributes',
        attributes: { 'test.key': 'value', 'test.number': 42 },
      },
      () => 'ok'
    );
    expect(result).toBe('ok');
  });
});
```

### Testing Metrics

The pattern: call the recording function, verify it does not throw, test edge values.

```typescript
import { describe, expect, it } from 'bun:test';
import { createRedisSpan, recordRedisSuccess, recordRedisError } from '../../../src/telemetry/redis-instrumentation';

describe('Redis instrumentation metrics', () => {
  it('should create a span without throwing', () => {
    const span = createRedisSpan({ operation: 'GET', key: 'test:key' });
    expect(span).toBeDefined();
  });

  it('should record success without throwing', () => {
    const span = createRedisSpan({ operation: 'SET', key: 'test:key' });
    expect(() => recordRedisSuccess(span, { cached: true })).not.toThrow();
  });

  it('should record errors without throwing', () => {
    const span = createRedisSpan({ operation: 'GET', key: 'test:key' });
    expect(() => recordRedisError(span, new Error('Connection timeout'))).not.toThrow();
  });
});
```

### Testing with InMemorySpanExporter (Advanced)

When you need to assert on the actual spans produced (attribute values, span names, status codes), use the OTel SDK test utilities.

```typescript
import { describe, expect, it, beforeEach } from 'bun:test';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { SimpleSpanProcessor, InMemorySpanExporter } from '@opentelemetry/sdk-trace-base';
import { trace, SpanStatusCode } from '@opentelemetry/api';

describe('Advanced span verification', () => {
  let exporter: InMemorySpanExporter;
  let provider: NodeTracerProvider;

  beforeEach(() => {
    exporter = new InMemorySpanExporter();
    provider = new NodeTracerProvider();
    provider.addSpanProcessor(new SimpleSpanProcessor(exporter));
    provider.register();
  });

  it('should produce a span with expected attributes', () => {
    const tracer = trace.getTracer('test');

    tracer.startActiveSpan('test.operation', (span) => {
      span.setAttribute('consumer.id', 'abc-123');
      span.setStatus({ code: SpanStatusCode.OK });
      span.end();
    });

    const spans = exporter.getFinishedSpans();
    expect(spans).toHaveLength(1);
    expect(spans[0].name).toBe('test.operation');
    expect(spans[0].attributes['consumer.id']).toBe('abc-123');
    expect(spans[0].status.code).toBe(SpanStatusCode.OK);
  });
});
```

Note: `InMemorySpanExporter` and `SimpleSpanProcessor` come from `@opentelemetry/sdk-trace-base`. The same setup works identically in Jest and Vitest.

### Testing TelemetryEmitter

The pattern: import the singleton, call emit methods, verify no exceptions are thrown.

```typescript
import { describe, expect, it } from 'bun:test';

describe('TelemetryEmitter', () => {
  it('should export all expected methods', async () => {
    const { telemetryEmitter } = await import('../../../src/telemetry/tracer');

    expect(telemetryEmitter).toBeDefined();
    expect(typeof telemetryEmitter.emit).toBe('function');
    expect(typeof telemetryEmitter.info).toBe('function');
    expect(typeof telemetryEmitter.warn).toBe('function');
    expect(typeof telemetryEmitter.error).toBe('function');
    expect(typeof telemetryEmitter.debug).toBe('function');
    expect(typeof telemetryEmitter.timed).toBe('function');
    expect(typeof telemetryEmitter.timedWithLevel).toBe('function');
  });

  it('should emit events without throwing', async () => {
    const { telemetryEmitter, SpanEvents } = await import('../../../src/telemetry/tracer');

    expect(() => {
      telemetryEmitter.emit({
        event: SpanEvents.CACHE_HIT,
        message: 'Test cache hit',
      });
    }).not.toThrow();

    expect(() => {
      telemetryEmitter.info(SpanEvents.CACHE_HIT, 'Cache hit', { key: 'test' });
    }).not.toThrow();

    expect(() => {
      telemetryEmitter.warn(SpanEvents.CB_FAILURE, 'CB failure', { count: 3 });
    }).not.toThrow();
  });

  it('should verify SpanEvents constants', async () => {
    const { SpanEvents } = await import('../../../src/telemetry/tracer');

    expect(SpanEvents.CACHE_HIT).toBe('cache.hit');
    expect(SpanEvents.CB_STATE_OPEN).toBe('circuit_breaker.state.open');
    expect(SpanEvents.KONG_CONSUMER_NOT_FOUND).toBe('kong.consumer.not_found');
  });
});
```

### Suppressing Telemetry in Tests

The test preload file (`test/preload.ts`) configures the environment so telemetry does not produce noisy output or attempt real exports during test runs:

```bash
LOG_LEVEL=silent          # Suppresses all log output
TELEMETRY_MODE=console    # Uses console exporter (no network calls)
```

If you need to override these for a specific test file, set the environment variables in a `beforeEach` block:

```typescript
beforeEach(() => {
  Bun.env.TELEMETRY_MODE = 'console';
  Bun.env.LOG_LEVEL = 'silent';
});
```

---

## Related Documentation

| Document | What it covers |
|----------|---------------|
| [telemetry.md](../architecture/telemetry.md) | Pipeline architecture: providers, exporters, SDK wiring, configuration |
| [logging.md](logging.md) | Logging public API, backends, structured logging patterns |
| [monitoring.md](../operations/monitoring.md) | Dashboards, alerts, metric inventory, SLA thresholds |
| [testing.md](testing.md) | Full testing guide (3210 tests, mutation testing) |
