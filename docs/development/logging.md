# Logging Guide

This guide covers the logging architecture, public API, configuration, and patterns used in the authentication service. For operational monitoring (metrics, traces, alerting), see [monitoring.md](../operations/monitoring.md).

---

## Architecture

The logging system uses a 3-layer architecture with dependency injection for backend selection:

```
Layer 3: Application Code
  src/utils/logger.ts          log(), warn(), error(), audit(), logError()

Layer 2: DI Container
  src/logging/container.ts     Backend selection (Pino or Winston)
  src/logging/ports/logger.port.ts   ILogger / ITelemetryLogger interfaces

Layer 1: Backend Adapters
  src/logging/adapters/pino.adapter.ts       Default, ECS-compliant Pino
  src/logging/adapters/winston.adapter.ts    Legacy Winston wrapper
```

All application code imports from `src/utils/logger.ts`. The container resolves the active backend based on the `LOGGING_BACKEND` environment variable. Adapters implement the `ITelemetryLogger` interface so backends are interchangeable.

### Fallback Chain

If the logging container fails to load, the system falls back gracefully:

1. **Logging container** (Pino or Winston via `LOGGING_BACKEND`)
2. **Legacy Winston** (`src/telemetry/winston-logger.ts` direct import)
3. **Console JSON** (structured JSON to stdout/stderr -- guaranteed output)

---

## Quick Start

### Adding Logging to Your Code

```typescript
import { log, warn, error, logError, audit } from "../utils/logger";

// Basic messages
log("Token generated", { consumerId: "abc-123" });
warn("Cache miss, falling back to Kong", { key: "consumer:abc-123" });
error("Failed to generate token", { consumerId: "abc-123", reason: "secret_not_found" });

// Error with stack trace
try {
  await generateToken(consumer);
} catch (err) {
  logError("Token generation failed", err as Error, { consumerId: consumer.id });
}

// Audit event (adds audit: true and event_type fields)
audit("token_issued", { consumerId: "abc-123", tokenType: "jwt" });
```

### Using Child Loggers

Child loggers bind context to every subsequent log call, useful for request-scoped logging:

```typescript
import { getChildLogger } from "../logging/container";

const requestLogger = getChildLogger({ requestId: "req-456", consumerId: "abc-123" });
requestLogger.info("Processing request");       // includes requestId + consumerId
requestLogger.warn("Slow Kong response", { latency: 250 });  // merged context
```

Child loggers support nesting -- call `.child()` on an existing child to add more bound context.

---

## Public API Reference

### `src/utils/logger.ts`

The primary import for all application logging:

| Function | Signature | Description |
|----------|-----------|-------------|
| `log` | `(message, context?) => void` | Info-level log |
| `warn` | `(message, context?) => void` | Warning-level log |
| `error` | `(message, context?) => void` | Error-level log |
| `audit` | `(eventType, context?) => void` | Audit event (sets `audit: true`, `event_type`) |
| `logError` | `(message, err, context?) => void` | Error with extracted name, message, stack |

All functions accept an optional `Record<string, unknown>` context object.

### `src/logging/container.ts`

Lower-level access for advanced use cases:

| Export | Description |
|--------|-------------|
| `getLogger()` | Get the active `ITelemetryLogger` instance |
| `getChildLogger(bindings)` | Create a child logger with bound context |
| `loggerContainer.setLogger(logger)` | Inject a custom logger (testing) |
| `loggerContainer.setBackend(backend)` | Switch backend at runtime |
| `loggerContainer.reset()` | Reset to defaults (testing) |

### `ILogger` Interface

The core interface (`src/logging/ports/logger.port.ts`) that all backends implement:

```typescript
interface ILogger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
  child(bindings: LogContext): ILogger;
  flush(): Promise<void>;
  reinitialize(): void;
}
```

`ITelemetryLogger` extends `ILogger` with domain-specific methods:

```typescript
interface ITelemetryLogger extends ILogger {
  logHttpRequest(method, path, statusCode, duration, context?): void;
  logAuthenticationEvent(event, success, context?): void;
  logKongOperation(operation, responseTime, success, context?): void;
}
```

---

## Configuration

### Environment Variables

| Variable | Values | Default | Description |
|----------|--------|---------|-------------|
| `LOG_LEVEL` | `silent`, `error`, `warn`, `info`, `debug` | `info` | Minimum log level to output |
| `LOGGING_BACKEND` | `pino`, `winston` | `pino` | Logging backend selection |
| `TELEMETRY_MODE` | `console`, `otlp`, `both` | `both` | Where logs are sent |

### Log Level Filtering

Log levels are ordered by priority. Setting `LOG_LEVEL` filters out everything below the configured level:

```
silent (0) < error (1) < warn (2) < info (3) < debug (4)
```

| `LOG_LEVEL` | `debug` | `info` | `warn` | `error` |
|-------------|---------|--------|--------|---------|
| `debug`     | Yes     | Yes    | Yes    | Yes     |
| `info`      | No      | Yes    | Yes    | Yes     |
| `warn`      | No      | No     | Yes    | Yes     |
| `error`     | No      | No     | No     | Yes     |
| `silent`    | No      | No     | No     | No      |

### Recommended Levels by Environment

| Environment | `LOG_LEVEL` | `LOGGING_BACKEND` | `TELEMETRY_MODE` |
|-------------|-------------|-------------------|------------------|
| Development | `debug` | `pino` | `console` |
| Testing | `silent` | `pino` | `console` |
| Staging | `info` | `pino` | `both` |
| Production | `warn` | `pino` | `otlp` or `both` |

---

## Backends

### Pino (Default)

The Pino adapter (`src/logging/adapters/pino.adapter.ts`) is the default backend, selected for performance (5-10x faster than Winston).

**Features:**
- ECS-compliant formatting via `@elastic/ecs-pino-format`
- Automatic OpenTelemetry trace context injection (`trace.id`, `span.id`)
- Sync stdout with custom Winston-compatible console format
- OTLP export via global `LoggerProvider` (fire-and-forget, non-blocking)
- Child logger support with bound context

**Console output format:**
```
4:25:58 PM info: Token generated {"consumer.id":"abc-123","trace.id":"550e8400..."}
```

**Dual output:** When `TELEMETRY_MODE=both`, every log is written to both console (formatted) and OTLP (structured). OTLP failures do not affect console output.

### Winston (Legacy)

The Winston adapter (`src/logging/adapters/winston.adapter.ts`) wraps the existing `WinstonTelemetryLogger` from `src/telemetry/winston-logger.ts`.

**Features:**
- ECS formatting via `@elastic/ecs-winston-format`
- OpenTelemetryTransportV3 for OTLP export
- Console transport with colorized output
- Domain-specific methods (logHttpRequest, logAuthenticationEvent, logKongOperation)

**When to use Winston:** Only if you need backward compatibility with tooling that depends on Winston-specific behavior. For all new code, use the default Pino backend.

**Switching backends:**
```bash
LOGGING_BACKEND=winston bun run dev   # Use Winston
LOGGING_BACKEND=pino bun run dev      # Use Pino (default)
```

---

## Structured Logging

### ECS (Elastic Common Schema) Compliance

Both backends produce ECS-compliant output. Custom fields are automatically mapped:

| Input Field | ECS Field | Type |
|-------------|-----------|------|
| `consumerId` | `consumer.id` | string |
| `username` | `consumer.name` | string |
| `requestId` | `event.id` | string |
| `totalDuration` | `event.duration` | number (ns) |

Fields that do not map to ECS appear under `labels.*` in Elasticsearch. See [monitoring.md ECS Field Mapping](../operations/monitoring.md#ecs-field-mapping) for the complete mapping table.

### Trace Context Correlation

The Pino adapter automatically injects OpenTelemetry trace context into every log entry:

```json
{
  "@timestamp": "2026-01-20T12:00:00.000Z",
  "message": "Token generated",
  "log.level": "info",
  "consumer.id": "abc-123",
  "trace.id": "550e8400-e29b-41d4-a716-446655440000",
  "span.id": "550e8400-e29b"
}
```

This enables click-through navigation from logs to traces in Elastic APM, Jaeger, or Datadog.

### Error Logging Structure

Using `logError()` extracts error details into a nested structure:

```json
{
  "message": "Token generation failed",
  "error": {
    "name": "KongApiError",
    "message": "Consumer not found",
    "stack": "KongApiError: Consumer not found\n    at ..."
  },
  "consumerId": "abc-123"
}
```

---

## TelemetryEmitter: Span Events + Logs

The `TelemetryEmitter` (`src/telemetry/telemetry-emitter.ts`) provides a unified API that emits to both OpenTelemetry span events and logs simultaneously.

**Key behavior:**
- **Span events** are ALWAYS captured regardless of `LOG_LEVEL`
- **Logs** are filtered by `LOG_LEVEL`

This makes span events ideal for critical correlation data that must never be lost in production.

### Usage

```typescript
import { telemetryEmitter } from "../telemetry/telemetry-emitter";
import { SpanEvents } from "../telemetry/span-event-names";

// Basic usage
telemetryEmitter.info(SpanEvents.CACHE_HIT, "Cache hit", { key: "consumer:123" });

// With timing
const start = performance.now();
await doOperation();
telemetryEmitter.timed(SpanEvents.CACHE_SET, "Cache set completed", start, { key: "consumer:123" });

// Warning level
telemetryEmitter.warn(SpanEvents.CB_STATE_OPEN, "Circuit breaker opened", {
  operation: "getConsumerSecret",
  failure_count: 5,
});

// Full options
telemetryEmitter.emit({
  event: SpanEvents.KONG_REQUEST_FAILED,
  message: "Kong request failed",
  level: "error",
  attributes: { operation: "getConsumer", statusCode: 503 },
  startTime: requestStart,
});
```

### API

| Method | Description |
|--------|-------------|
| `emit(options)` | Full control: event, message, level, attributes, startTime |
| `info(event, message, attributes?)` | Info-level emission |
| `debug(event, message, attributes?)` | Debug-level emission |
| `warn(event, message, attributes?)` | Warn-level emission |
| `error(event, message, attributes?)` | Error-level emission |
| `timed(event, message, startTime, attributes?)` | Info-level with auto-duration |
| `timedWithLevel(event, message, level, startTime, attributes?)` | Custom level with auto-duration |

### When to Use TelemetryEmitter vs log()

| Scenario | Use |
|----------|-----|
| Operational events (cache hit/miss, circuit breaker state, Kong lookups) | `telemetryEmitter` |
| General application logging (startup messages, configuration changes) | `log()` / `warn()` / `error()` |
| Events that MUST be captured in production even with `LOG_LEVEL=error` | `telemetryEmitter` (span events always captured) |
| Error handling with stack traces | `logError()` |
| Audit trail events | `audit()` |

---

## Span Event Names

Type-safe span event constants are defined in `src/telemetry/span-event-names.ts`. These follow the naming convention `<component>.<sub_component>.<action>`.

### Categories

| Category | Count | Examples |
|----------|-------|---------|
| Circuit Breaker | 9 | `circuit_breaker.state.open`, `circuit_breaker.fallback.used` |
| Cache Connection | 7 | `cache.connection.established`, `cache.reconnect.failed` |
| Cache Operations | 8 | `cache.hit`, `cache.miss`, `cache.set` |
| Cache Circuit Breaker | 3 | `cache.circuit_breaker.state_change` |
| Cache Health | 6 | `cache.health.status_changed`, `cache.health.check_failed` |
| Cache State | 3 | `cache.state.changed`, `cache.state.shutdown` |
| Cache Factory/Manager | 10 | `cache.factory.initialized`, `cache.manager.shutdown` |
| Kong | 12 | `kong.consumer.found`, `kong.cache.hit`, `kong.request.failed` |
| JWT | 6 | `jwt.generated`, `jwt.validation.failed`, `jwt.expired` |
| Auth Flow | 5 | `auth.headers.validated`, `auth.request.success` |
| Health Check | 3 | `health.check.success`, `health.check.degraded` |
| HTTP Request | 3 | `http.request.started`, `http.request.completed` |
| Token Handler | 6 | `token.request.started`, `token.validation.success` |
| Validation | 4 | `validation.failed`, `validation.json.parse_failed` |
| Lifecycle | 8 | `lifecycle.state.changed`, `lifecycle.drain.completed` |
| Request Tracking | 4 | `request.inflight.started`, `request.rejected.draining` |
| Redis Operations | 3 | `redis.operation.started`, `redis.operation.completed` |

Always use `SpanEvents.*` constants rather than raw strings for type safety.

---

## Critical Lifecycle Logging

Critical lifecycle messages (`src/logging/critical-lifecycle.ts`) bypass `LOG_LEVEL` filtering entirely. They write directly to stdout/stderr, ensuring operators always see service start/stop events in container logs.

### Functions

| Function | Description |
|----------|-------------|
| `logServiceStartup(port, environment)` | Service starting (version, PID, environment) |
| `logServiceReady(port)` | Service accepting requests |
| `logServiceShutdownInitiated(signal)` | Shutdown started (signal name) |
| `logServiceShutdownCompleted()` | Shutdown finished |
| `logServiceShutdownError(error)` | Shutdown error (writes to stderr) |
| `criticalLifecycleLog(message, context?)` | Custom critical info message |
| `criticalLifecycleWarn(message, context?)` | Custom critical warning |
| `criticalLifecycleError(message, context?)` | Custom critical error (stderr) |

These use the same `h:MM:ss TT level: message {context}` console format as Pino/Winston for visual consistency.

### When to Use

Use critical lifecycle logging only for events that operators must always see regardless of log level: service startup, readiness, shutdown, and fatal errors. For normal operational logging, use `log()` / `warn()` / `error()`.

---

## Lifecycle Logger

The `LifecycleObservabilityLogger` (`src/telemetry/lifecycle-logger.ts`) generates structured shutdown sequences. It queues shutdown step messages and flushes them through the telemetry pipeline.

### Shutdown Sequence Steps

| Step | Message |
|------|---------|
| `shutdown_initiated` | Authentication service shutdown initiated via {signal} |
| `http_server_stop` | Stopping HTTP server and rejecting new connections |
| `telemetry_flush` | Flushing telemetry data and metrics |
| `profiling_shutdown` | Shutting down profiling service |
| `external_services_shutdown` | Closing cache connections and Kong service |
| `shutdown_completed` | Authentication service shutdown completed successfully |

Each message includes metadata: signal, PID, sequence position, and total steps. The logger calls `forceMetricsFlush()` during flush to ensure telemetry data is exported before the process exits.

---

## OTLP Log Export

When `TELEMETRY_MODE` is `otlp` or `both`, logs are exported via the OpenTelemetry protocol:

1. **Pino adapter** emits log records to the global `LoggerProvider` (fire-and-forget)
2. **`BatchLogRecordProcessor`** batches records for efficient export
3. **OTLP exporter** sends batches to the configured collector endpoint

### Batch Configuration

Set via telemetry config (from `src/telemetry/instrumentation.ts`):

| Parameter | Value | Description |
|-----------|-------|-------------|
| `maxExportBatchSize` | Configurable | Records per batch |
| `maxQueueSize` | Configurable | Maximum queued records |
| `scheduledDelayMillis` | 500ms | Export interval |
| `exportTimeoutMillis` | 10s max | Export timeout cap |

### Reinitialization

After `instrumentation.ts` sets the global `LoggerProvider`, both Pino and Winston adapters must reinitialize to pick up the provider. This happens automatically during startup. If you need to reinitialize manually:

```typescript
import { getLogger } from "../logging/container";
getLogger().reinitialize();
```

---

## Testing

### Suppressing Logs in Tests

Set `LOG_LEVEL=silent` to suppress all log output during tests. This is configured in `test/preload.ts`:

```bash
LOG_LEVEL=silent bun test
```

### Injecting a Mock Logger

Use the container's `setLogger()` for test isolation:

```typescript
import { loggerContainer } from "../src/logging/container";

const mockLogger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  child: vi.fn().mockReturnThis(),
  flush: vi.fn().mockResolvedValue(undefined),
  reinitialize: vi.fn(),
  logHttpRequest: vi.fn(),
  logAuthenticationEvent: vi.fn(),
  logKongOperation: vi.fn(),
};

beforeEach(() => {
  loggerContainer.setLogger(mockLogger);
});

afterEach(() => {
  loggerContainer.reset();
});
```

---

## Related Documentation

| Document | What it covers |
|----------|---------------|
| [monitoring.md](../operations/monitoring.md) | OTLP setup, ECS field mapping, span events in depth, production monitoring |
| [environment.md](../configuration/environment.md) | All environment variables including logging config |
| [troubleshooting.md](../operations/troubleshooting.md) | Winston environment conflicts, Elasticsearch field mapping issues |
