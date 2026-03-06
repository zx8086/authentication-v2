# OTel Documentation Split Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Split monitoring.md (2,678 lines) into 3 audience-focused documents and close documentation gaps for a reusable OTel standard.

**Architecture:** Extract developer-facing content (Tracer API, span events, TelemetryEmitter, cardinality guard) into `development/instrumentation.md`. Extract architecture/SDK content (telemetry architecture, memory optimizations, circuit breakers, env vars, package deps) into `architecture/telemetry.md`. Keep ops content (metrics catalog, health endpoints, alerts, troubleshooting) in `operations/monitoring.md`. Add new content: generic OTel patterns, testing patterns, sampling strategy, data flow diagram, missing env vars.

**Tech Stack:** Markdown documentation, OpenTelemetry JS SDK references, bun:test patterns

**Design Doc:** `docs/plans/2026-03-06-otel-documentation-split-design.md`

---

## Phase 1: Create New Documents (Extract + New Content)

### Task 1: Create `docs/architecture/telemetry.md`

**Files:**
- Create: `docs/architecture/telemetry.md`
- Read: `docs/operations/monitoring.md` (source content)

**Step 1: Write `docs/architecture/telemetry.md`**

Create the file with the following structure. Content is extracted from `monitoring.md` with the specified line ranges, plus new sections marked `[NEW]`.

```markdown
# Telemetry Architecture

This document covers the OpenTelemetry architecture, SDK configuration, and infrastructure decisions. For developer instrumentation patterns, see [Instrumentation Guide](../development/instrumentation.md). For metrics catalog and operational monitoring, see [Monitoring Guide](../operations/monitoring.md).

---

## Data Flow

[NEW - write this section]

```
Application Code
    |
    v
OTel SDK (traces, metrics, logs)
    |
    +---> BatchSpanProcessor ---------> OTLPTraceExporter ---+
    |                                                         |
    +---> PeriodicExportingMetricReader -> OTLPMetricExporter -+---> OTLP Collector ---> Backend
    |                                                         |     (Elastic, Datadog,
    +---> BatchLogRecordProcessor -----> OTLPLogExporter -----+      Grafana, etc.)
    |
    +---> Console (when TELEMETRY_MODE=console|both)
```

**Signal Flow:**
- **Traces**: App creates spans via Tracer API -> BatchSpanProcessor batches them (500ms interval) -> OTLPTraceExporter sends to collector
- **Metrics**: App records values via Meter API -> PeriodicExportingMetricReader collects every 30s -> OTLPMetricExporter sends to collector
- **Logs**: Pino writes structured JSON -> PinoInstrumentation bridges to OTel LoggerProvider -> BatchLogRecordProcessor batches -> OTLPLogExporter sends to collector
- **Console**: All signals also output to stdout when TELEMETRY_MODE includes console

**Key Design Decisions:**
- All three signals use HTTP/JSON protocol (not gRPC or protobuf) to minimize memory footprint
- Each signal has independent circuit breakers to prevent cascade failures
- Batch processors buffer data to reduce network overhead
- The app exports OTLP only -- collector configuration (routing, sampling, transformation) is the platform team's responsibility

## Sampling Strategy

[NEW - write this section]

This service does NOT implement application-level sampling. All traces, metrics, and logs are exported to the OTLP collector at full fidelity.

**Rationale:**
- Application-level sampling discards data before it reaches the collector, preventing retroactive analysis
- The OTLP collector is the correct place for sampling decisions because it has visibility across all services
- Head-based sampling at the app level cannot make tail-based decisions (e.g., "keep all traces with errors")
- The collector can apply different sampling rates per service, per endpoint, or per error status

**What the collector should handle:**
- Tail-based sampling: keep 100% of error traces, sample successful traces
- Rate limiting: cap trace volume per service
- Metric aggregation: pre-aggregate high-cardinality metrics before sending to backend
- Log filtering: route debug logs to cold storage, error logs to hot storage

**When to reconsider app-level sampling:**
- If OTLP export bandwidth exceeds network capacity
- If BatchSpanProcessor queue fills consistently (monitor via `/health/telemetry`)
- If telemetry circuit breakers open frequently due to export backpressure

If app-level sampling is needed, configure via standard OTel env vars:
```bash
OTEL_TRACES_SAMPLER=parentbased_traceidratio
OTEL_TRACES_SAMPLER_ARG=0.1  # Sample 10% of traces
```

## Telemetry Subsystem Architecture

[EXTRACT from monitoring.md lines 7-54 -- the file tree showing src/logging/ and src/telemetry/ structure]

## Memory Optimization: OTLP Transformer Lazy-Loading Patch

[EXTRACT from monitoring.md lines 56-141]

## Memory Guardian: Telemetry Backpressure Monitoring

[EXTRACT from monitoring.md lines 143-198]

## Runtime Metrics Optimization

[EXTRACT from monitoring.md lines 200-213]

## Initialization Flow

[EXTRACT from monitoring.md lines 215-256 -- the initializeTelemetry() code block]

## Telemetry Modes

[EXTRACT from monitoring.md lines 1159-1167]

## OpenTelemetry SDK 0.212.0 Compatibility

[EXTRACT from monitoring.md lines 1169-1183]

## Telemetry Circuit Breakers

[EXTRACT from monitoring.md lines 919-981]

## SDK Configuration

### Complete Environment Variables Reference

[EXTRACT from monitoring.md lines 1826-1871]

[NEW - Add these missing standard OTel variables to the table:]

#### Additional Standard OTel Variables

| Variable | Description | Default | Notes |
|----------|-------------|---------|-------|
| `OTEL_EXPORTER_OTLP_PROTOCOL` | Export protocol | `http/json` | Options: `http/json`, `http/protobuf`, `grpc`. This service uses `http/json` to minimize memory (see Memory Optimization section). |
| `OTEL_RESOURCE_ATTRIBUTES` | Additional resource attributes | - | Comma-separated key=value pairs added to all signals. Example: `team=auth,region=eu-west-1` |
| `OTEL_TRACES_SAMPLER` | Sampling strategy | `always_on` | Not configured by default (see Sampling Strategy). Options: `always_on`, `always_off`, `parentbased_traceidratio` |
| `OTEL_TRACES_SAMPLER_ARG` | Sampler argument | `1.0` | Sampling ratio for `traceidratio` sampler (0.0 to 1.0) |
| `OTEL_METRICS_EXPORTER` | Metrics exporter | `otlp` | Options: `otlp`, `console`, `none` |
| `OTEL_TRACES_EXPORTER` | Traces exporter | `otlp` | Options: `otlp`, `console`, `none` |
| `OTEL_LOGS_EXPORTER` | Logs exporter | `otlp` | Options: `otlp`, `console`, `none` |
| `OTEL_METRIC_EXPORT_INTERVAL` | Metric export interval (ms) | `30000` | How often metrics are exported to collector |

### Configuration Examples

[EXTRACT from monitoring.md lines 1872-1928]

### Package Dependencies

[EXTRACT from monitoring.md lines 1930-1956]

### Initialization Code

[EXTRACT from monitoring.md lines 1958-2094 -- the "mimic this setup" section]

## Related Documentation

| Document | Description |
|----------|-------------|
| [Instrumentation Guide](../development/instrumentation.md) | How to add spans, metrics, and test instrumentation |
| [Logging Guide](../development/logging.md) | Logging architecture, Pino/Winston, ECS compliance |
| [Monitoring Guide](../operations/monitoring.md) | Metrics catalog, health endpoints, alerting, troubleshooting |
| [Configuration](../configuration/environment.md) | All environment variables |
```

**Step 2: Verify the file reads correctly**

Run: `wc -l docs/architecture/telemetry.md`
Expected: ~350-450 lines

**Step 3: Commit**

```bash
git add docs/architecture/telemetry.md
git commit -m "Add telemetry architecture doc with data flow, sampling strategy, SDK config"
```

---

### Task 2: Create `docs/development/instrumentation.md`

**Files:**
- Create: `docs/development/instrumentation.md`
- Read: `docs/operations/monitoring.md` (source content)
- Read: `test/bun/telemetry/tracer-real.test.ts` (testing pattern reference)
- Read: `test/bun/telemetry/redis-instrumentation-utils.test.ts` (testing pattern reference)

**Step 1: Write `docs/development/instrumentation.md`**

Create the file with the following structure. Sections marked `[EXTRACT]` come from `monitoring.md`. Sections marked `[NEW]` are new content.

```markdown
# Instrumentation Guide

How to add OpenTelemetry instrumentation to your code. Starts with generic OTel SDK patterns, then shows this service's wrapper APIs. For telemetry architecture and SDK setup, see [Telemetry Architecture](../architecture/telemetry.md). For metrics catalog and operational monitoring, see [Monitoring Guide](../operations/monitoring.md).

---

## Generic OTel Patterns

[NEW - write this entire section]

These patterns work with any OpenTelemetry JS SDK project. The service-specific wrappers below build on these primitives.

### Creating Spans (Generic)

```typescript
import { trace, SpanKind, SpanStatusCode } from '@opentelemetry/api';

const tracer = trace.getTracer('my-service', '1.0.0');

// Basic span
tracer.startActiveSpan('my.operation', (span) => {
  try {
    const result = doWork();
    span.setAttributes({ 'result.count': result.length });
    return result;
  } catch (error) {
    span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
    span.recordException(error);
    throw error;
  } finally {
    span.end();
  }
});

// Async span
await tracer.startActiveSpan('my.async.operation', async (span) => {
  try {
    const result = await fetchData();
    span.setAttributes({ 'data.size': result.length });
    return result;
  } catch (error) {
    span.setStatus({ code: SpanStatusCode.ERROR });
    span.recordException(error);
    throw error;
  } finally {
    span.end();
  }
});

// Span with options
tracer.startActiveSpan('outbound.call', {
  kind: SpanKind.CLIENT,
  attributes: { 'http.method': 'POST', 'http.url': url },
}, (span) => {
  // ...
  span.end();
});
```

### Creating Metrics (Generic)

```typescript
import { metrics } from '@opentelemetry/api';

const meter = metrics.getMeter('my-service', '1.0.0');

// Counter - monotonically increasing value (requests, errors, bytes sent)
const requestCounter = meter.createCounter('http.requests.total', {
  description: 'Total HTTP requests',
  unit: '1',
});
requestCounter.add(1, { method: 'GET', path: '/api', status: '200' });

// Histogram - distribution of values (latencies, sizes)
const latencyHistogram = meter.createHistogram('http.request.duration', {
  description: 'Request duration in milliseconds',
  unit: 'ms',
});
latencyHistogram.record(45.2, { method: 'GET', path: '/api' });

// Gauge - point-in-time value (queue depth, active connections)
// Note: OTel JS uses ObservableGauge with callbacks
const activeRequests = meter.createUpDownCounter('http.active_requests', {
  description: 'Currently active requests',
  unit: '1',
});
activeRequests.add(1);   // request starts
activeRequests.add(-1);  // request ends
```

### Choosing the Right Instrument Type

| I want to measure... | Instrument | Example |
|----------------------|------------|---------|
| How many times X happened | Counter | requests, errors, cache hits |
| Current value that goes up AND down | UpDownCounter | active connections, queue depth |
| Distribution of values | Histogram | latency, response size, batch count |
| A value read from external source | ObservableGauge | CPU %, memory usage, thread count |

### Adding Span Events (Generic)

```typescript
// Span events are timestamped annotations within a span
span.addEvent('cache.miss', { 'cache.key': key });
span.addEvent('retry.attempt', { 'retry.count': 2, 'retry.delay_ms': 100 });
```

## Service Wrapper APIs

This service provides typed wrappers around the generic OTel APIs for consistency and convenience.

### Tracer API

[EXTRACT from monitoring.md lines 451-562 -- Creating Custom Spans, Specialized Span Methods, Adding Attributes, Span Naming Conventions]

### Span Events

[EXTRACT from monitoring.md lines 564-917 -- the entire span events section including TelemetryEmitter, SpanEvents constants, migration strategy, best practices, performance considerations]

### Cardinality Guard

[EXTRACT from monitoring.md lines 983-1050]

## How to Instrument a New Feature

[NEW - write this step-by-step workflow]

When adding a new feature that needs observability, follow this workflow:

### Step 1: Identify What to Measure

Ask yourself:
- **Traces**: Does this involve an operation with measurable duration? (API call, DB query, computation) -> Add a span
- **Metrics**: Do I need to count occurrences or measure distributions over time? -> Add a metric
- **Span events**: Are there discrete moments within a span that aid debugging? -> Add span events
- **Logs**: Is there diagnostic detail that helps during development but can be filtered in production? -> Use logs

### Step 2: Name It

Follow the naming conventions:

**Spans:**
| Pattern | Example |
|---------|---------|
| `http.client.<service>.<operation>` | `http.client.kong.getConsumer` |
| `crypto.<algorithm>.<operation>` | `crypto.jwt.generate` |
| `cache.<backend>.<operation>` | `cache.redis.get` |
| `db.<system>.<operation>` | `db.postgres.query` |

**Metrics:**
| Pattern | Example |
|---------|---------|
| `<component>_<what>_<unit>` | `http_request_duration_seconds` |
| `<component>_<what>_total` | `authentication_attempts_total` |

**Span Events:**
| Pattern | Example |
|---------|---------|
| `<component>.<action>` | `cache.hit`, `jwt.signed` |
| `<component>.<entity>.<action>` | `kong.consumer.found` |

### Step 3: Implement

**For a new span** -- use the service wrapper:
```typescript
import { telemetryTracer } from '../telemetry/tracer';

const result = await telemetryTracer.createSpan(
  { operationName: 'myfeature.process', attributes: { 'feature.id': id } },
  async () => { return await processFeature(id); }
);
```

**For a new metric** -- add to the appropriate metrics file in `src/telemetry/metrics/`:
1. Define the instrument in `instruments.ts`
2. Create a recording function in the appropriate `*-metrics.ts` file
3. Export from `index.ts`
4. Call the recording function from your feature code

**For span events** -- use TelemetryEmitter:
```typescript
import { telemetryEmitter, SpanEvents } from '../telemetry/tracer';

telemetryEmitter.info(SpanEvents.MY_EVENT, 'Feature processed', {
  feature_id: id,
  duration_ms: elapsed,
});
```

### Step 4: Manage Cardinality

Before adding attributes to metrics, check cardinality:
- **Low cardinality** (< 100 values): method, status_code, operation_type -> Safe as metric attributes
- **High cardinality** (> 1000 values): user_id, request_id, IP address -> Use span attributes only, NOT metric attributes
- **Medium cardinality** (100-1000): consumer_id -> Use `getBoundedConsumerId()` from cardinality guard

### Step 5: Test It

See the Testing Instrumentation section below.

## Testing Instrumentation

[NEW - write this entire section]

### Testing Spans (bun:test)

Test that your spans are created with correct attributes by calling the instrumented function and verifying behavior:

```typescript
import { describe, expect, it } from 'bun:test';
import { telemetryTracer } from '../../../src/telemetry/tracer';
import { SpanKind } from '@opentelemetry/api';

describe('My feature instrumentation', () => {
  it('should create a span and return the result', () => {
    const result = telemetryTracer.createSpan(
      {
        operationName: 'myfeature.process',
        kind: SpanKind.INTERNAL,
        attributes: { 'feature.type': 'test' },
      },
      () => { return { success: true }; }
    );

    expect(result).toEqual({ success: true });
  });

  it('should record exceptions on the span when operation fails', () => {
    expect(() => {
      telemetryTracer.createSpan(
        { operationName: 'myfeature.failing' },
        () => { throw new Error('Feature failed'); }
      );
    }).toThrow('Feature failed');
  });

  it('should handle async operations', async () => {
    const result = await telemetryTracer.createSpan(
      { operationName: 'myfeature.async' },
      async () => {
        return await Promise.resolve(42);
      }
    );

    expect(result).toBe(42);
  });
});
```

### Testing Metrics

Test that recording functions execute without errors and accept valid inputs:

```typescript
import { describe, expect, it } from 'bun:test';
import { recordMyFeatureMetric } from '../../../src/telemetry/metrics';

describe('My feature metrics', () => {
  it('should record metric without throwing', () => {
    expect(() => {
      recordMyFeatureMetric('operation-a', 42.5, true);
    }).not.toThrow();
  });

  it('should handle edge case values', () => {
    expect(() => {
      recordMyFeatureMetric('operation-b', 0, false);
      recordMyFeatureMetric('operation-c', Number.MAX_SAFE_INTEGER, true);
    }).not.toThrow();
  });
});
```

### Testing with InMemorySpanExporter (Advanced)

For tests that need to verify span attributes and hierarchy, use OTel's in-memory exporter:

```typescript
import { describe, expect, it, beforeEach } from 'bun:test';
import { InMemorySpanExporter, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { trace } from '@opentelemetry/api';

describe('Span attribute verification', () => {
  const exporter = new InMemorySpanExporter();
  let provider: NodeTracerProvider;

  beforeEach(() => {
    exporter.reset();
    provider = new NodeTracerProvider();
    provider.addSpanProcessor(new SimpleSpanProcessor(exporter));
    provider.register();
  });

  it('should set correct attributes on span', () => {
    const tracer = trace.getTracer('test');
    tracer.startActiveSpan('test.operation', (span) => {
      span.setAttribute('my.attribute', 'value');
      span.end();
    });

    const spans = exporter.getFinishedSpans();
    expect(spans).toHaveLength(1);
    expect(spans[0].name).toBe('test.operation');
    expect(spans[0].attributes['my.attribute']).toBe('value');
  });
});
```

**Jest/Vitest note:** The same `InMemorySpanExporter` pattern works identically -- only the import for `describe/expect/it` changes.

### Testing TelemetryEmitter

```typescript
import { describe, expect, it } from 'bun:test';
import { telemetryEmitter, SpanEvents } from '../../../src/telemetry/tracer';

describe('TelemetryEmitter', () => {
  it('should emit info event without throwing', () => {
    expect(() => {
      telemetryEmitter.info(SpanEvents.CACHE_HIT, 'Cache hit', {
        key: 'test:123',
        tier: 'l1',
      });
    }).not.toThrow();
  });

  it('should emit timed event with duration', () => {
    const start = performance.now();
    expect(() => {
      telemetryEmitter.timed(SpanEvents.CACHE_SET, 'Cache set', start, {
        key: 'test:456',
      });
    }).not.toThrow();
  });
});
```

### Suppressing Telemetry in Tests

To prevent test noise, set these in your test preload or setup:

```bash
LOG_LEVEL=silent          # Suppresses all log output
TELEMETRY_MODE=console    # Prevents OTLP export attempts
```

Or in code:
```typescript
// test/preload.ts
process.env.LOG_LEVEL = 'silent';
process.env.TELEMETRY_MODE = 'console';
```

## Related Documentation

| Document | Description |
|----------|-------------|
| [Telemetry Architecture](../architecture/telemetry.md) | Data flow, SDK config, sampling, memory optimizations |
| [Logging Guide](logging.md) | Logging API, Pino/Winston backends, ECS compliance |
| [Monitoring Guide](../operations/monitoring.md) | Metrics catalog, health endpoints, alerting |
| [Testing Guide](testing.md) | Full testing documentation |
```

**Step 2: Verify the file reads correctly**

Run: `wc -l docs/development/instrumentation.md`
Expected: ~450-550 lines

**Step 3: Commit**

```bash
git add docs/development/instrumentation.md
git commit -m "Add instrumentation guide with generic OTel patterns, testing, and workflow"
```

---

## Phase 2: Trim `monitoring.md`

### Task 3: Remove extracted content from `monitoring.md`

**Files:**
- Modify: `docs/operations/monitoring.md`

**Step 1: Remove sections that moved to `architecture/telemetry.md`**

Remove these line ranges (work from bottom to top to avoid offset shifts):

1. Lines 1958-2094: "Initialization Code" section -> moved to telemetry.md
2. Lines 1930-1956: "Package Dependencies" section -> moved to telemetry.md
3. Lines 1826-1928: "Complete Environment Variables Reference" + "Configuration Examples" -> moved to telemetry.md (but keep the "## Production Monitoring Setup" heading and replace content with a cross-reference)
4. Lines 1169-1183: "OpenTelemetry SDK 0.212.0 Compatibility" -> moved to telemetry.md
5. Lines 1159-1167: "Telemetry Modes" -> moved to telemetry.md
6. Lines 919-981: "Telemetry Circuit Breakers" -> moved to telemetry.md
7. Lines 200-256: "Runtime Metrics Optimization" + "Initialization Flow" -> moved to telemetry.md
8. Lines 143-198: "Memory Guardian" -> moved to telemetry.md
9. Lines 56-141: "Memory Optimization: OTLP Transformer Lazy-Loading Patch" -> moved to telemetry.md
10. Lines 7-54: "Telemetry Architecture" (file tree) -> moved to telemetry.md

Replace each removed section with a one-line cross-reference. Example:

```markdown
> For telemetry architecture, SDK configuration, memory optimizations, and environment variables, see **[Telemetry Architecture](../architecture/telemetry.md)**.
```

**Step 2: Remove sections that moved to `development/instrumentation.md`**

Remove these line ranges:

1. Lines 983-1050: "Cardinality Guard" -> moved to instrumentation.md (keep the brief mention in Graceful Shutdown section at line 2194-2201)
2. Lines 564-917: "Span Events for Critical Correlation Points" (entire section including TelemetryEmitter, SpanEvents, migration, best practices) -> moved to instrumentation.md
3. Lines 451-562: "Tracer API" (Creating Custom Spans, Specialized Span Methods, Adding Attributes, Span Naming Conventions) -> moved to instrumentation.md

Replace with:

```markdown
> For the Tracer API, span events, TelemetryEmitter, and cardinality guard, see **[Instrumentation Guide](../development/instrumentation.md)**.
```

**Step 3: Fix the instrument count**

At line 29, change `instruments.ts      # 77 metric instrument definitions` to clarify:
- The file tree was already moved to telemetry.md, but if any reference to "77 instruments" remains elsewhere in the file, update to: "65 application metric instruments (plus HostMetrics and GC metrics collected separately)"

At line 1186, the heading "Complete Metrics Reference (65 Instruments)" is already correct. Verify no other reference says 77.

**Step 4: Fix metric export interval**

Search for `exportIntervalMillis: 10000` or `10000` in the context of metric export. The actual code uses 30s. If the extracted initialization flow (now in telemetry.md) still says 10000, update to 30000 in telemetry.md.

**Step 5: Update the Production Monitoring Setup section**

Replace the removed env vars/config/deps/init sections with:

```markdown
## Production Monitoring Setup

> For complete environment variables, configuration examples, package dependencies, and initialization code, see **[Telemetry Architecture](../architecture/telemetry.md#sdk-configuration)**.

The sections below cover collector-side and Kubernetes integration.
```

Keep these subsections in monitoring.md (they are ops-focused):
- OTEL Collector Configuration (lines 2097-2130)
- Health Check Integration (lines 2132-2150)
- Prometheus Integration (lines 2152-2169)

**Step 6: Verify line count reduction**

Run: `wc -l docs/operations/monitoring.md`
Expected: ~1,300-1,500 lines (down from 2,678)

**Step 7: Commit**

```bash
git add docs/operations/monitoring.md
git commit -m "Trim monitoring.md: extract architecture and instrumentation content to dedicated docs"
```

---

## Phase 3: Update Cross-References

### Task 4: Update `docs/README.md`

**Files:**
- Modify: `docs/README.md`

**Step 1: Add new documents to the index**

In the "By Category" section, add to the Architecture table:

```markdown
| [telemetry.md](architecture/telemetry.md) | Telemetry architecture, SDK config, data flow, sampling |
```

Add to the Development table:

```markdown
| [instrumentation.md](development/instrumentation.md) | Adding spans, metrics, testing instrumentation |
```

Update the existing monitoring.md description:

```markdown
| [monitoring.md](operations/monitoring.md) | Metrics catalog, health endpoints, alerting, troubleshooting |
```

**Step 2: Update Quick Navigation table**

Add a row:

```markdown
| Add instrumentation | [Instrumentation Guide](development/instrumentation.md) |
```

Update existing "Monitor the service" row to clarify it covers ops:

```markdown
| Monitor the service | [Monitoring & Metrics](operations/monitoring.md) |
```

**Step 3: Commit**

```bash
git add docs/README.md
git commit -m "Update docs index with instrumentation and telemetry architecture links"
```

---

### Task 5: Update `docs/architecture/overview.md`

**Files:**
- Modify: `docs/architecture/overview.md`

**Step 1: Add cross-reference to telemetry.md**

Find the Observability section (around line 252). Add after the existing content:

```markdown
> For the complete telemetry architecture including data flow diagram, SDK configuration, sampling strategy, and memory optimizations, see **[Telemetry Architecture](telemetry.md)**.
```

**Step 2: Commit**

```bash
git add docs/architecture/overview.md
git commit -m "Add telemetry architecture cross-reference to overview"
```

---

### Task 6: Update `docs/development/logging.md`

**Files:**
- Modify: `docs/development/logging.md`

**Step 1: Update Related Documentation table at the end of the file**

Add to the table (around line 828):

```markdown
| [instrumentation.md](instrumentation.md) | Tracer API, span events, TelemetryEmitter, testing instrumentation |
| [telemetry.md](../architecture/telemetry.md) | SDK configuration, data flow, memory optimizations |
```

**Step 2: Commit**

```bash
git add docs/development/logging.md
git commit -m "Add instrumentation and telemetry cross-references to logging guide"
```

---

### Task 7: Update `docs/configuration/environment.md`

**Files:**
- Modify: `docs/configuration/environment.md`

**Step 1: Add cross-reference for OTel env vars**

Find the OpenTelemetry section (around line 48). Add after the existing table:

```markdown
> For additional standard OTel environment variables (OTEL_EXPORTER_OTLP_PROTOCOL, OTEL_RESOURCE_ATTRIBUTES, OTEL_TRACES_SAMPLER, exporter selectors) and configuration examples, see **[Telemetry Architecture - SDK Configuration](../architecture/telemetry.md#sdk-configuration)**.
```

**Step 2: Commit**

```bash
git add docs/configuration/environment.md
git commit -m "Add telemetry architecture cross-reference for OTel env vars"
```

---

### Task 8: Update `CLAUDE.md`

**Files:**
- Modify: `CLAUDE.md`

**Step 1: Add new docs to the Quick Links table**

Add two rows to the Documentation Reference table:

```markdown
| Instrumentation | [instrumentation.md](docs/development/instrumentation.md) | Adding spans, metrics, testing telemetry |
| Telemetry Arch | [telemetry.md](docs/architecture/telemetry.md) | Data flow, SDK config, sampling, memory |
```

**Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "Add instrumentation and telemetry architecture to quick links"
```

---

## Phase 4: Verification

### Task 9: Verify all cross-references work

**Step 1: Check for broken links**

Run: `grep -rn 'monitoring.md#' docs/ | head -30`

Verify that any anchor links to sections that moved (like `monitoring.md#tracer-api` or `monitoring.md#telemetry-circuit-breakers`) are updated to point to their new locations.

Common anchors to check and update:
- `monitoring.md#tracer-api` -> `instrumentation.md#tracer-api`
- `monitoring.md#span-events` -> `instrumentation.md#span-events`
- `monitoring.md#cardinality-guard` -> `instrumentation.md#cardinality-guard`
- `monitoring.md#telemetry-circuit-breakers` -> `telemetry.md#telemetry-circuit-breakers`
- `monitoring.md#telemetry-modes` -> `telemetry.md#telemetry-modes`
- `monitoring.md#complete-environment-variables-reference` -> `telemetry.md#complete-environment-variables-reference`
- `monitoring.md#initialization-code` -> `telemetry.md#initialization-code`
- `monitoring.md#package-dependencies` -> `telemetry.md#package-dependencies`

**Step 2: Fix any broken anchor links found**

Update the references in whatever files contain them.

**Step 3: Verify document sizes**

Run: `wc -l docs/operations/monitoring.md docs/development/instrumentation.md docs/architecture/telemetry.md docs/development/logging.md`

Expected:
- monitoring.md: ~1,300-1,500 lines
- instrumentation.md: ~450-550 lines
- telemetry.md: ~350-450 lines
- logging.md: ~840 lines

**Step 4: Verify no content was lost**

Run: `grep -c '###' docs/operations/monitoring.md docs/development/instrumentation.md docs/architecture/telemetry.md`

The total section count across all three files should be comparable to the original monitoring.md section count (approximately 60+ sections).

**Step 5: Run quality checks**

Run: `bun run quality:check`
Expected: PASS (no TypeScript or lint errors -- these are markdown-only changes)

**Step 6: Commit any fixes**

```bash
git add -A docs/
git commit -m "Fix cross-references after documentation split"
```

---

## Summary

| Phase | Tasks | What happens |
|-------|-------|-------------|
| Phase 1 | Tasks 1-2 | Create new `telemetry.md` and `instrumentation.md` |
| Phase 2 | Task 3 | Trim `monitoring.md` by removing extracted content |
| Phase 3 | Tasks 4-8 | Update all cross-references (README, overview, logging, env, CLAUDE.md) |
| Phase 4 | Task 9 | Verify links, sizes, and content completeness |

**Total commits**: 8-9
**Files created**: 2
**Files modified**: 6
