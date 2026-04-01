# Telemetry Architecture

This document covers the telemetry subsystem design, SDK configuration, memory optimization strategies, and infrastructure decisions for the authentication service. For instrument definitions and recording patterns, see [Instrumentation Guide](../development/instrumentation.md). For operational dashboards and alerting, see [Monitoring Guide](../operations/monitoring.md).

## Data Flow

The telemetry pipeline follows a layered architecture where application code never interacts with exporters directly. All telemetry flows through the OpenTelemetry SDK, which handles batching, retry, and export.

```
                        Authentication Service
 +-----------------------------------------------------------------+
 |                                                                   |
 |  Application Code                                                 |
 |  (handlers, services, middleware)                                 |
 |       |             |              |              |               |
 |       v             v              v              v               |
 |   Tracer API    Meter API    Logger API     Console Logger        |
 |       |             |              |              |               |
 |       v             v              v              v               |
 |  BatchSpan     Periodic       EcsLogRecord    stdout/stderr       |
 |  Processor     MetricReader   Processor*                          |
 |       |             |              |                              |
 |       v             v              v                              |
 |  +----------+ +----------+  +----------+                         |
 |  | Circuit  | | Circuit  |  | Circuit  |                         |
 |  | Breaker  | | Breaker  |  | Breaker  |                         |
 |  | (traces) | | (metrics)|  | (logs)   |                         |
 |  +----------+ +----------+  +----------+                         |
 |       |             |              |                              |
 |       v             v              v                              |
 |  OTLP/HTTP    OTLP/HTTP      OTLP/HTTP                          |
 |  Exporter     Exporter        Exporter                           |
 |  (JSON)       (JSON)          (JSON)                             |
 |                                                                   |
 +-----------------------------------------------------------------+
         |             |              |
         v             v              v
 +-----------------------------------------------------------------+
 |              OpenTelemetry Collector                              |
 |  (tail-based sampling, rate limiting, metric aggregation)        |
 +-----------------------------------------------------------------+
         |
         v
 +-----------------------------------------------------------------+
 |              Observability Backend                                |
 |  (Elastic APM / Datadog / New Relic / Grafana)                   |
 +-----------------------------------------------------------------+
```

*EcsLogRecordProcessor wraps BatchLogRecordProcessor to strip redundant ECS metadata and rename `span.event` to `event_name` before OTLP export. See `src/telemetry/ecs-log-record-processor.ts`.

### Signal Flow

The service produces four telemetry signals:

| Signal | SDK Component | Processor | Export Protocol | Batch Interval |
|--------|--------------|-----------|-----------------|----------------|
| Traces | `TracerProvider` | `BatchSpanProcessor` | OTLP/HTTP JSON | 500ms |
| Metrics | `MeterProvider` | `PeriodicExportingMetricReader` | OTLP/HTTP JSON | 30000ms |
| Logs | `LoggerProvider` | `BatchLogRecordProcessor` | OTLP/HTTP JSON | SDK default |
| Console | Pino / Winston | N/A (direct write) | stdout | Immediate |

### Key Design Decisions

1. **HTTP/JSON protocol (not gRPC/protobuf)**: Chosen because Bun runtime has incomplete gRPC support. HTTP/JSON avoids protobuf buffer pool allocations (~50-70MB savings at startup). See the Memory Optimization section below.

2. **Independent circuit breakers per signal**: A failing metrics endpoint does not block trace or log export. Each signal degrades independently, maximizing data availability during partial outages.

3. **Batch processing for all signals**: Reduces network overhead and collector pressure. Trace batches are capped at 10 spans to keep per-export latency low while still amortizing connection costs.

4. **OTLP-only export (no vendor SDKs)**: Vendor-neutral format ensures portability across Elastic APM, Datadog, New Relic, and any OTLP-compliant backend without code changes. Backend selection is a collector configuration concern, not an application concern.

5. **Console output as a separate channel**: Console logs bypass the OTLP pipeline entirely. In `TELEMETRY_MODE=both`, the application writes to both stdout and OTLP independently, so collector downtime never affects local log visibility.

## Sampling Strategy

This service does **not** implement application-level sampling. All spans, metrics, and logs are exported to the collector at full fidelity.

### Rationale

- **Tail-based sampling at the collector** is strictly superior to head-based application sampling. The collector can make sampling decisions after seeing the complete trace, retaining error traces and high-latency traces while dropping routine successful requests.
- **Retroactive analysis** requires full data. If an incident occurs, you need the traces that preceded it. Head-based sampling at the application level discards data before you know you need it.
- **Metric accuracy** depends on seeing all data points. Application-level sampling distorts histogram percentiles and counter values.
- **Cost control** is a collector/backend concern. The collector can apply rate limiting, metric aggregation, and log filtering based on operational policies that change without redeploying the application.

### What the Collector Should Handle

| Concern | Collector Strategy |
|---------|--------------------|
| Trace volume | Tail-based sampling: keep errors, slow requests, and a percentage of normal requests |
| Rate limiting | Token bucket or sliding window per service |
| Metric aggregation | Delta-to-cumulative conversion, temporal aggregation |
| Log filtering | Drop debug/trace level logs in production, keep error/warn at full fidelity |

### When to Reconsider

Add application-level sampling if:
- The service consistently generates more than 10,000 spans/second per instance
- Network bandwidth to the collector becomes a bottleneck
- Collector infrastructure cannot scale to handle full-fidelity ingest

If application-level sampling becomes necessary, use the standard OpenTelemetry environment variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `OTEL_TRACES_SAMPLER` | Sampler type | `parentbased_traceidratio` |
| `OTEL_TRACES_SAMPLER_ARG` | Sampler argument (ratio) | `0.1` (10% of traces) |

## Telemetry Subsystem Architecture

The telemetry system consists of three pillars (traces, metrics, logs) with supporting infrastructure for resilience and cardinality management.

```
src/logging/                   # Logging subsystem (SIO-447)
├── container.ts               # DI container for backend selection (Pino/Winston)
├── ports/logger.port.ts       # ILogger / ITelemetryLogger interfaces
├── adapters/pino.adapter.ts   # Default Pino backend (ECS, OTLP, trace context)
├── adapters/winston.adapter.ts # Legacy Winston wrapper
└── critical-lifecycle.ts      # Always-visible lifecycle messages (bypass LOG_LEVEL)

src/telemetry/
├── instrumentation.ts      # NodeSDK initialization, exporters, processors
├── tracer.ts               # Custom span creation API
├── telemetry-emitter.ts    # Unified span events + logs API
├── span-event-names.ts     # Type-safe span event constants (100 events)
├── winston-logger.ts       # Legacy Winston logging with OTLP transport
├── metrics.ts              # Legacy metrics entry point
├── metrics/                # Modular metrics system
│   ├── index.ts            # Public API exports
│   ├── initialization.ts   # Meter and instrument creation
│   ├── instruments.ts      # 77 application metric instrument definitions
│   ├── types.ts            # TypeScript attribute types
│   ├── http-metrics.ts     # HTTP request/response metrics
│   ├── auth-metrics.ts     # JWT and authentication metrics
│   ├── kong-metrics.ts     # Kong Admin API metrics
│   ├── redis-metrics.ts    # Redis/Valkey cache metrics
│   ├── cache-metrics.ts    # Cache tier metrics
│   ├── process-metrics.ts  # Memory, CPU, GC metrics
│   ├── circuit-breaker-metrics.ts
│   ├── api-version-metrics.ts
│   ├── consumer-metrics.ts
│   ├── security-metrics.ts
│   ├── error-metrics.ts
│   └── telemetry-metrics.ts
├── redis-instrumentation.ts    # Redis span creation
├── cardinality-guard.ts        # Metric cardinality protection
├── consumer-volume.ts          # Consumer traffic classification
├── telemetry-circuit-breaker.ts # Per-signal circuit breakers
├── telemetry-health-monitor.ts  # Export health tracking
├── export-stats-tracker.ts      # Export success/failure stats
├── memory-guardian.ts          # Telemetry backpressure monitoring
├── gc-metrics.ts               # Garbage collection monitoring
├── sla-monitor.ts              # SLA violation detection
├── profiling-metrics.ts        # Profiling integration
└── lifecycle-logger.ts         # Startup/shutdown logging
```

## Memory Optimization: OTLP Transformer Lazy-Loading Patch

The service applies a postinstall patch to `@opentelemetry/otlp-transformer` to prevent excessive memory allocation from protobufjs buffer pools.

### Problem

When Bun imports `@opentelemetry/otlp-transformer`, it may load one of THREE module formats:
- ESM version: `build/esm/index.js`
- CJS version: `build/src/index.js`
- ESNext version: `build/esnext/index.js`

All three versions eagerly import all protobuf serializers, causing protobufjs to allocate ~50-70MB of Uint8Array buffer pools - even when using http/json protocol (the default).

Additionally, without explicit configuration, NodeSDK's `configureLoggerProviderFromEnv()` defaults to http/protobuf protocol, loading additional protobuf dependencies.

### Solution

**Layer 1: OTLP Transformer Patch** (`scripts/patch-otel-esm.ts`)

Patches ALL THREE module formats (ESM, CJS, ESNext) with lazy loading:
- **ESM/ESNext**: Uses Proxy objects for deferred module loading
- **CJS**: Uses lazy getter functions via `Object.defineProperty`
- Protobuf serializers only load when actually accessed
- JSON serializers remain eagerly loaded (these are used)
- Applied automatically via `postinstall` hook

**Layer 2: NodeSDK Configuration** (`src/telemetry/instrumentation.ts:252-257`)

Disables automatic LoggerProvider creation:
```typescript
sdk = new NodeSDK({
  // ...
  logRecordProcessors: [],  // Prevents http/protobuf default
});
```

### Memory Impact

The patches have different effectiveness at startup vs under sustained load:

| Scenario | Metric | Before Patches | After Patches | Change |
|----------|--------|----------------|---------------|--------|
| **Startup** | Total Heap | 57+ MB | 20.3 MB | -64% |
| **Startup** | Uint8Array | 36+ MB (600+ instances) | 641 KB (23 instances) | -98% |
| **Under Load** | Total Heap | 57+ MB | 56.7 MB | ~0% |
| **Under Load** | Uint8Array | 36+ MB | 35.7 MB (589 instances) | ~0% |

**Primary benefit**: 64% memory reduction at startup, improving container cold start times and scaling efficiency.

### Known Limitation: Bun Runtime Behavior

Under sustained load, protobuf serializers load despite lazy-loading patches:

- **Root cause**: Bun's JIT optimizer performs speculative module resolution on hot paths
- **Behavior**: Lazy getters are triggered by Bun's internal property enumeration during optimization
- **Impact**: Memory returns to ~57MB baseline under load (matching unpatched behavior)
- **Not a bug**: This is Bun runtime behavior, not a patch defect

This cannot be fixed at application level - it would require changes to Bun's module resolution or upstream OpenTelemetry lazy-loading support.

### Production Recommendation

**Accept current setup**:
- Patches provide significant value for container cold starts (64% reduction)
- Under-load memory footprint (~57MB) is stable and predictable
- Container memory limits should accommodate 128MB minimum (2x baseline)
- Memory is not growing unbounded - this is a fixed allocation

### Maintenance

The patch targets `@opentelemetry/sdk-node@0.212.0`. When upgrading:
1. The patch script warns if version differs from expected
2. Verify the package still exports the same exporter patterns
3. Test memory usage with heap profiling after upgrade (`bun run profile:scenario:tokens`)

### When This Can Be Removed

This workaround can be removed if:
- OpenTelemetry adds native lazy loading to all module format exports (ESM, CJS, ESNext)
- Bun adds tree-shaking support for ESM/CJS/ESNext
- Bun changes speculative module resolution behavior
- The service switches to http/protobuf protocol (accepting the memory cost)

References:
- Commit 5a42d2f (SIO-446) - Complete span events migration for tokens handler
- Heap profiles `Heap.393129709695.69364.md` (startup) and `Heap.397287268637.70440.md` (under load)

## Memory Guardian: Telemetry Backpressure Monitoring

The `TelemetryMemoryGuardian` (`src/telemetry/memory-guardian.ts`) monitors heap memory usage and telemetry export health to detect backpressure issues that could lead to Uint8Array buffer accumulation.

### How It Works

Memory Guardian periodically checks:
1. **Heap Usage**: Compared against configured heap limit (default: 512MB)
2. **Export Failure Rates**: Per-signal (traces, metrics, logs) failure percentages
3. **Export Backlog**: Failed exports that may be accumulating buffers

Based on these metrics, it calculates a **pressure level**:

| Level | Heap Usage | Condition |
|-------|-----------|-----------|
| `normal` | < 60% | No action needed |
| `elevated` | >= 60% | Monitor closely |
| `high` | >= 75% | Consider reducing batch sizes |
| `critical` | >= 85% | Immediate attention required |

### Configuration

| Environment Variable | Default | Description |
|---------------------|---------|-------------|
| `MEMORY_GUARDIAN_HEAP_LIMIT_MB` | `512` | Heap limit for percentage calculations |

The heap limit setting is important because Bun doesn't expose `v8.getHeapStatistics().heap_size_limit`. Set this to match your container's memory limit for accurate pressure detection.

### Monitoring Interval

The guardian runs health checks every **30 seconds** (reduced from 5s to minimize CPU overhead). Profile analysis showed the previous 5s interval consumed 4.2% CPU.

### Log Output

When pressure is detected, warnings are logged with context:

```json
{
  "message": "Memory pressure detected",
  "component": "memory-guardian",
  "pressure_level": "high",
  "heap_usage_percent": 78,
  "heap_used_mb": 400,
  "heap_limit_mb": 512,
  "export_failure_rate_traces": 15,
  "export_failure_rate_metrics": 0,
  "export_failure_rate_logs": 5
}
```

### Recommendations

At elevated or higher pressure, the guardian provides actionable recommendations:
- Reduce `OTEL_BSP_MAX_QUEUE_SIZE` to limit buffer accumulation
- Check OTLP endpoint connectivity if failure rates are high
- Reduce batch sizes via `OTEL_BSP_MAX_EXPORT_BATCH_SIZE`

## Runtime Metrics Optimization

Runtime metrics collection (event loop delay, detailed memory stats) is **disabled by default** to reduce CPU overhead.

| Environment Variable | Default | Description |
|---------------------|---------|-------------|
| `OTEL_RUNTIME_METRICS_ENABLED` | `false` | Enable detailed runtime metrics |

**When to Enable:**
- Debugging event loop blocking issues
- Investigating memory growth patterns
- Performance profiling sessions

**CPU Impact:** Enabling runtime metrics adds approximately 10% CPU overhead due to frequent sampling of event loop and memory statistics.

## Initialization Flow

```typescript
// src/telemetry/instrumentation.ts:61-221
async function initializeTelemetry(): Promise<void> {
  // 1. Initialize metrics system
  initializeMetrics();

  // 2. Create resource attributes (service.name, version, environment)
  const resource = resourceFromAttributes({ ... });

  // 3. Create OTLP exporters with stats tracking
  const traceExporter = wrapSpanExporter(new OTLPTraceExporter(...), traceExportStats);
  const metricExporter = wrapMetricExporter(new OTLPMetricExporter(...), metricExportStats);
  const logExporter = wrapLogRecordExporter(new OTLPLogExporter(...), logExportStats);

  // 4. Create processors (batching for efficiency)
  const traceProcessor = new BatchSpanProcessor(traceExporter, { maxExportBatchSize: 10 });
  const batchLogProcessor = new BatchLogRecordProcessor(logExporter);
  const logProcessor = new EcsLogRecordProcessor(batchLogProcessor); // SIO-618: strip ECS duplicates
  const metricReader = new PeriodicExportingMetricReader({ exportIntervalMillis: 30000 });

  // 5. Register LoggerProvider globally (SDK 0.212.0+ requirement)
  loggerProvider = new LoggerProvider({ resource, processors: [logProcessor] });
  logs.setGlobalLoggerProvider(loggerProvider);

  // 6. Start NodeSDK with auto-instrumentations
  sdk = new NodeSDK({
    resource,
    spanProcessors: [traceProcessor],
    metricReaders: [metricReader],
    instrumentations: [getNodeAutoInstrumentations(), new RedisInstrumentation()],
  });
  sdk.start();

  // 7. Start host metrics collection
  hostMetrics = new HostMetrics({});
  hostMetrics.start();

  // 8. Reinitialize Winston logger to pick up global LoggerProvider
  winstonTelemetryLogger.reinitialize();
}
```

## Telemetry Modes

Configure via `TELEMETRY_MODE` environment variable:

| Mode | Description | Use Case |
|------|-------------|----------|
| `console` | Logs only to console | Development |
| `otlp` | Exports only to OTLP endpoints | Production |
| `both` | Console logs + OTLP export | Debugging |

## OpenTelemetry SDK 0.212.0 Compatibility

The service is compatible with OpenTelemetry SDK 0.212.0+, which introduced a breaking change requiring explicit LoggerProvider registration.

**Required Initialization Sequence:**
1. Initialize OpenTelemetry SDK
2. Register LoggerProvider via `logs.setGlobalLoggerProvider()`
3. Reinitialize Winston logger to pick up the new provider

**Implementation:** `src/telemetry/instrumentation.ts`

**Troubleshooting:** If console logs are not appearing after telemetry initialization in `TELEMETRY_MODE=both`, ensure the Winston logger is reinitialized after the LoggerProvider is set. The logger caches its reference to the OTLP transport, which must be updated after the SDK is fully initialized.

**Reference:** Commits a5045d3, 8d070bb (2026-02-14/15) - Fix OTEL log export for SDK 0.212.0 breaking change

## Telemetry Circuit Breakers

Each telemetry signal (traces, metrics, logs) has its own circuit breaker to prevent cascade failures when OTLP endpoints are unavailable.

**Implementation:** `src/telemetry/telemetry-circuit-breaker.ts`

### Circuit Breaker Instances

```typescript
import { telemetryCircuitBreakers, getTelemetryCircuitBreakerStats } from '../telemetry/telemetry-circuit-breaker';

// Three independent circuit breakers
telemetryCircuitBreakers.traces   // Protects trace exports
telemetryCircuitBreakers.metrics  // Protects metric exports
telemetryCircuitBreakers.logs     // Protects log exports

// Get stats for all circuit breakers
const stats = getTelemetryCircuitBreakerStats();
// Returns: { traces: {...}, metrics: {...}, logs: {...} }
```

### Default Configuration

| Setting | Value | Description |
|---------|-------|-------------|
| `failureThreshold` | 5 | Failures before opening |
| `recoveryTimeout` | 60000ms | Time before half-open |
| `successThreshold` | 3 | Successes to close |
| `monitoringInterval` | 10000ms | Recovery check interval |

**Environment Variable Overrides:**
```bash
TELEMETRY_CB_FAILURE_THRESHOLD=5
TELEMETRY_CB_RECOVERY_TIMEOUT=60000
TELEMETRY_CB_SUCCESS_THRESHOLD=3
TELEMETRY_CB_MONITORING_INTERVAL=10000
```

### Circuit Breaker States

| State | Value | Behavior |
|-------|-------|----------|
| `CLOSED` | 0 | Normal operation, exports allowed |
| `OPEN` | 1 | Exports rejected, waiting for recovery |
| `HALF_OPEN` | 2 | Testing recovery with limited exports |

### State Transitions

```
CLOSED --[5 failures]--> OPEN --[60s timeout]--> HALF_OPEN
                           ^                         |
                           |                         v
                           +---[1 failure]---[3 successes]--> CLOSED
```

### Manual Control

```typescript
import { resetTelemetryCircuitBreakers } from '../telemetry/telemetry-circuit-breaker';

// Reset all circuit breakers to CLOSED state
resetTelemetryCircuitBreakers();
```

## SDK Configuration

> For the complete environment variable reference covering all telemetry settings (core, OTLP endpoints, exporter tuning, telemetry circuit breaker, and standard OTel variables), see **[Configuration Guide - OpenTelemetry](../configuration/environment.md#opentelemetry)** and **[Configuration Guide - Telemetry Circuit Breaker](../configuration/environment.md#telemetry-circuit-breaker)**.

### Configuration Examples

#### Development (Console Only)
```bash
TELEMETRY_MODE=console
LOG_LEVEL=debug
OTEL_SERVICE_NAME=authentication-service
```

#### Development with Local Collector
```bash
TELEMETRY_MODE=both
LOG_LEVEL=debug
OTEL_SERVICE_NAME=authentication-service
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
```

#### Production (OTLP Export)
```bash
TELEMETRY_MODE=otlp
LOG_LEVEL=info
NODE_ENV=production
OTEL_SERVICE_NAME=authentication-service
OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=https://otel.example.com/v1/traces
OTEL_EXPORTER_OTLP_METRICS_ENDPOINT=https://otel.example.com/v1/metrics
OTEL_EXPORTER_OTLP_LOGS_ENDPOINT=https://otel.example.com/v1/logs
OTEL_EXPORTER_OTLP_TIMEOUT=30000
OTEL_BSP_MAX_EXPORT_BATCH_SIZE=2048
OTEL_BSP_MAX_QUEUE_SIZE=10000
```

#### Kubernetes ConfigMap
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: auth-service-telemetry
data:
  TELEMETRY_MODE: "otlp"
  LOG_LEVEL: "info"
  OTEL_SERVICE_NAME: "authentication-service"
  OTEL_EXPORTER_OTLP_ENDPOINT: "http://otel-collector.monitoring:4318"
  OTEL_EXPORTER_OTLP_TIMEOUT: "30000"
  OTEL_BSP_MAX_EXPORT_BATCH_SIZE: "2048"
  OTEL_BSP_MAX_QUEUE_SIZE: "10000"
```

#### Docker Compose
```yaml
services:
  auth-service:
    environment:
      - TELEMETRY_MODE=otlp
      - LOG_LEVEL=info
      - OTEL_SERVICE_NAME=authentication-service
      - OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318
```

### Package Dependencies

The telemetry system requires these OpenTelemetry packages:

```json
{
  "dependencies": {
    "@opentelemetry/api": "^1.9.0",
    "@opentelemetry/api-logs": "^0.213.0",
    "@opentelemetry/auto-instrumentations-node": "^0.71.0",
    "@opentelemetry/exporter-logs-otlp-http": "^0.213.0",
    "@opentelemetry/exporter-metrics-otlp-http": "^0.213.0",
    "@opentelemetry/exporter-trace-otlp-http": "^0.213.0",
    "@opentelemetry/host-metrics": "^0.38.3",
    "@opentelemetry/instrumentation-redis": "^0.61.0",
    "@opentelemetry/resources": "^2.6.0",
    "@opentelemetry/sdk-logs": "^0.213.0",
    "@opentelemetry/sdk-metrics": "^2.6.0",
    "@opentelemetry/sdk-node": "^0.213.0",
    "@opentelemetry/sdk-trace-base": "^2.6.0",
    "@opentelemetry/semantic-conventions": "^1.40.0",
    "@opentelemetry/winston-transport": "^0.23.0",
    "@elastic/ecs-winston-format": "^1.5.3",
    "winston": "^3.19.0"
  }
}
```

### Initialization Code

To mimic this setup in another project, use this initialization pattern:

```typescript
// src/telemetry/instrumentation.ts
import { logs } from "@opentelemetry/api-logs";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { HostMetrics } from "@opentelemetry/host-metrics";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { BatchLogRecordProcessor, LoggerProvider } from "@opentelemetry/sdk-logs";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { EcsLogRecordProcessor } from "./ecs-log-record-processor";
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";
import { ATTR_DEPLOYMENT_ENVIRONMENT_NAME } from "@opentelemetry/semantic-conventions/incubating";

export async function initializeTelemetry(config: {
  serviceName: string;
  serviceVersion: string;
  environment: string;
  tracesEndpoint: string;
  metricsEndpoint: string;
  logsEndpoint: string;
  exportTimeout?: number;
}): Promise<void> {
  // 1. Create resource with service identity
  const resource = resourceFromAttributes({
    [ATTR_SERVICE_NAME]: config.serviceName,
    [ATTR_SERVICE_VERSION]: config.serviceVersion,
    [ATTR_DEPLOYMENT_ENVIRONMENT_NAME]: config.environment,
  });

  // 2. Create OTLP exporters
  const traceExporter = new OTLPTraceExporter({
    url: config.tracesEndpoint,
    timeoutMillis: config.exportTimeout || 30000,
  });

  const metricExporter = new OTLPMetricExporter({
    url: config.metricsEndpoint,
    timeoutMillis: config.exportTimeout || 30000,
  });

  const logExporter = new OTLPLogExporter({
    url: config.logsEndpoint,
    timeoutMillis: config.exportTimeout || 30000,
  });

  // 3. Create processors
  const traceProcessor = new BatchSpanProcessor(traceExporter, {
    maxExportBatchSize: 10,
    scheduledDelayMillis: 500,
  });

  const metricReader = new PeriodicExportingMetricReader({
    exporter: metricExporter,
    exportIntervalMillis: 30000,
  });

  const batchLogProcessor = new BatchLogRecordProcessor(logExporter);
  const logProcessor = new EcsLogRecordProcessor(batchLogProcessor); // SIO-618: strip ECS duplicates

  // 4. Create and register LoggerProvider (SDK 0.212.0+ requirement)
  const loggerProvider = new LoggerProvider({
    resource,
    processors: [logProcessor],
  });
  logs.setGlobalLoggerProvider(loggerProvider);

  // 5. Start NodeSDK with auto-instrumentations
  const sdk = new NodeSDK({
    resource,
    spanProcessors: [traceProcessor],
    metricReaders: [metricReader],
    instrumentations: [
      getNodeAutoInstrumentations({
        "@opentelemetry/instrumentation-fs": { enabled: false },
        "@opentelemetry/instrumentation-grpc": { enabled: false },
      }),
    ],
  });
  sdk.start();

  // 6. Start host metrics collection
  const hostMetrics = new HostMetrics({});
  hostMetrics.start();
}
```

```typescript
// src/telemetry/winston-logger.ts
import ecsFormat from "@elastic/ecs-winston-format";
import { OpenTelemetryTransportV3 } from "@opentelemetry/winston-transport";
import winston from "winston";

export function createLogger(config: {
  serviceName: string;
  serviceVersion: string;
  environment: string;
  level?: string;
  enableOtlp?: boolean;
}): winston.Logger {
  const transports: winston.transport[] = [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize({ all: true }),
        winston.format.simple()
      ),
    }),
  ];

  if (config.enableOtlp) {
    transports.push(new OpenTelemetryTransportV3());
  }

  return winston.createLogger({
    level: config.level || "info",
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      ecsFormat({
        convertErr: true,
        apmIntegration: true,
        serviceName: config.serviceName,
        serviceVersion: config.serviceVersion,
        serviceEnvironment: config.environment,
      })
    ),
    transports,
  });
}
```

## Related Documentation

| Document | Description |
|----------|-------------|
| [Instrumentation Guide](../development/instrumentation.md) | Custom spans, metrics, testing instrumentation, cardinality guard |
| [logging.md](../development/logging.md) | Logging architecture, Pino/Winston backends, public API |
| [monitoring.md](../operations/monitoring.md) | Operational dashboards, alerting rules, health endpoints |
| [environment.md](../configuration/environment.md) | Complete environment variable reference across all subsystems |
