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

**Debug-level logging:** The `src/utils/logger.ts` convenience API does not export a `debug()` function. Use the logger instance directly:

```typescript
import { getLogger } from "../logging/container";

getLogger().debug("Consumer secret lookup details", { consumerId: "abc-123", cacheHit: false });
```

Debug messages are only output when `LOG_LEVEL=debug`. They are filtered out at the default `info` level.

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
| `NODE_ENV` | Any string | (unset) | Controls Pino output mode: `production`/`staging` = raw NDJSON, everything else = human-readable |

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

| Environment | `NODE_ENV` | `LOG_LEVEL` | `LOGGING_BACKEND` | `TELEMETRY_MODE` | Pino Output |
|-------------|-----------|-------------|-------------------|------------------|-------------|
| Local dev | `local` | `debug` | `pino` | `console` | Formatted (color) |
| Development | `development` | `debug` | `pino` | `console` | Formatted (color) |
| Testing | `test` | `silent` | `pino` | `console` | Formatted (color) |
| Staging | `staging` | `info` | `pino` | `both` | Raw NDJSON |
| Production | `production` | `warn` | `pino` | `otlp` or `both` | Raw NDJSON |

---

## Backends

### Pino (Default)

The Pino adapter (`src/logging/adapters/pino.adapter.ts`) is the default backend, selected for performance (5-10x faster than Winston).

**Features:**
- ECS-compliant formatting via `@elastic/ecs-pino-format`
- Dual-mode output: raw NDJSON (production) or human-readable (development/test)
- OpenTelemetry trace context via Pino `mixin` (`trace.id`, `span.id`, `transaction.id`)
- OTLP export via PinoInstrumentation's OTelPinoStream (automatic, non-blocking)
- Child logger support with bound context

**Dual-mode output:**

| Mode | `NODE_ENV` | Output Format | Use Case |
|------|-----------|---------------|----------|
| Production | `production` or `staging` | Raw ECS NDJSON to stdout | Log aggregators (Elastic, Datadog) |
| Development | Everything else (`local`, `development`, `test`, unset) | Human-readable formatted | Developer console |

**Production output (NDJSON):**
```json
{"@timestamp":"2026-01-20T12:00:00.000Z","log.level":"info","message":"Token generated","ecs.version":"8.10.0","process.pid":1234,"host.hostname":"auth-pod-1","service.name":"authentication-service","service.version":"2.0.0","service.environment":"production","event.dataset":"authentication-service","consumer.id":"abc-123","trace.id":"550e8400e29b41d4a716446655440000","span.id":"550e8400e29b41d4","transaction.id":"550e8400e29b41d4a716446655440000"}
```

**Development output (formatted):**
```
4:25:58 PM info: Token generated {"consumer.id":"abc-123","trace.id":"550e8400...","span.id":"550e8400e29b"}
```

**OTLP delivery:** PinoInstrumentation's OTelPinoStream automatically tees every Pino log record to the global `LoggerProvider` via `pino.multistream()`. This replaces the previous manual `emitOtelLog()` approach and ensures a single OTLP delivery path. OTLP failures do not affect console output.

#### Dependencies

To replicate this logging setup in another application, install:

```bash
bun add pino@^10.3.1 @elastic/ecs-pino-format@^1.5.0
bun add @opentelemetry/api@^1.9.0 @opentelemetry/instrumentation-pino@^0.58.0
```

#### `ecsFormat()` Configuration

The Pino adapter calls `ecsFormat()` with these options:

```typescript
import { ecsFormat } from "@elastic/ecs-pino-format";

const ecsOptions = ecsFormat({
  apmIntegration: false,       // We use OpenTelemetry, not Elastic APM agent
  serviceName: "authentication-service",
  serviceVersion: "2.6.7",     // From package.json
  serviceEnvironment: "local", // From TELEMETRY_ENVIRONMENT or NODE_ENV
  convertErr: true,            // Convert Error objects to ECS error.* fields
  convertReqRes: true,         // Convert req/res to ECS http.* fields
});
```

`ecsFormat()` returns a Pino options object that sets:
- `messageKey: "message"` (ECS uses `message`, not Pino's default `msg`)
- `timestamp`: produces `"@timestamp":"2026-01-20T12:00:00.000Z"` (ISO 8601)
- `formatters.level`: converts numeric level to `"log.level": "info"`
- `formatters.bindings`: maps `pid` to `process.pid`, `hostname` to `host.hostname`
- `formatters.log`: handles `err`/`req`/`res` conversion and adds static ECS bindings

#### ECS Field Inventory (Production NDJSON)

Every production log line contains these fields:

| ECS Field | Source | Example Value |
|-----------|--------|---------------|
| `@timestamp` | `ecsFormat` timestamp function | `"2026-01-20T12:00:00.000Z"` |
| `log.level` | `ecsFormat` level formatter | `"info"`, `"warn"`, `"error"` |
| `message` | First argument to `log()` / `info()` etc. | `"Token generated"` |
| `ecs.version` | `@elastic/ecs-helpers` | `"8.10.0"` |
| `process.pid` | Pino default binding | `1234` |
| `host.hostname` | Pino default binding | `"auth-pod-1"` |
| `service.name` | `ecsFormat({ serviceName })` | `"authentication-service"` |
| `service.version` | `ecsFormat({ serviceVersion })` | `"2.6.7"` |
| `service.environment` | `ecsFormat({ serviceEnvironment })` | `"production"` |
| `event.dataset` | Defaults to `serviceName` | `"authentication-service"` |
| `trace.id` | Our Pino mixin (from OTEL active span) | `"550e8400e29b41d4a716..."` |
| `span.id` | Our Pino mixin (from OTEL active span) | `"550e8400e29b41d4"` |
| `transaction.id` | Our Pino mixin (= traceId for Elastic APM) | `"550e8400e29b41d4a716..."` |

`trace.id`, `span.id`, and `transaction.id` are only present when an OpenTelemetry span is active. Any additional context fields passed to `log("msg", { key: "value" })` appear as top-level fields in the JSON.

When `convertErr: true` and an Error is logged, these additional fields appear:

| ECS Field | Source | Example Value |
|-----------|--------|---------------|
| `error.type` | `err.name` | `"KongApiError"` |
| `error.message` | `err.message` | `"Consumer not found"` |
| `error.stack_trace` | `err.stack` | `"KongApiError: Consumer not found\n..."` |

#### Development Console Format

In development mode (`NODE_ENV` is not `production`/`staging`), the adapter intercepts Pino's NDJSON output via a custom sync destination and reformats it as a human-readable line:

```
h:MM:ss TT <color>level</color>: message {context}
```

Example: `4:25:58 PM info: Token generated {"consumer.id":"abc-123","trace.id":"550e8400..."}`

**Format details:**
- **Time**: 12-hour format with AM/PM, derived from the ECS `@timestamp` field (falls back to Pino's `time` epoch)
- **Level**: Extracted from ECS `log.level` string (falls back to Pino's numeric `level`)
- **Message**: From ECS `message` field (falls back to Pino's `msg`)
- **Context**: Remaining fields serialized as JSON

**ANSI color codes per level:**

| Level | ANSI Code | Color |
|-------|-----------|-------|
| trace | `\x1b[90m` | Gray |
| debug | `\x1b[36m` | Cyan |
| info | `\x1b[32m` | Green |
| warn | `\x1b[33m` | Yellow |
| error | `\x1b[31m` | Red |
| fatal | `\x1b[35m` | Magenta |

Reset code: `\x1b[0m` (applied after the level name)

The output line is built as: `${timeStr} ${colorCode}${level}${reset}: ${message}${contextJson}\n`

**Stripped ECS metadata fields** (hidden in console, present in NDJSON):
`@timestamp`, `ecs.version`, `log.level`, `log.logger`, `process.pid`, `host.hostname`, `service.name`, `service.version`, `service.environment`, `event.dataset`

**Also stripped** (Pino internal fields): `level`, `time`, `msg`, `message`, `pid`, `hostname`

What remains visible in `{context}` are your application fields (e.g., `consumer.id`, `trace.id`, `span.id`, `component`, custom fields).

**Complete formatter implementation** (for replicating in another application):

```typescript
// ECS fields to exclude from console context display
const ECS_METADATA_FIELDS = new Set([
  "@timestamp", "ecs.version", "log.level", "log.logger",
  "process.pid", "host.hostname", "service.name", "service.version",
  "service.environment", "event.dataset",
]);

function formatLogLine(obj: Record<string, unknown>): string {
  // Level: ECS "log.level" string or Pino numeric "level"
  const ecsLevel = obj["log.level"] as string | undefined;
  const pinoLevel = obj.level as number | undefined;
  const levelName = ecsLevel?.toLowerCase() ||
    (pinoLevel === 10 ? "trace" : pinoLevel === 20 ? "debug" :
     pinoLevel === 30 ? "info" : pinoLevel === 40 ? "warn" :
     pinoLevel === 50 ? "error" : pinoLevel === 60 ? "fatal" : "info");

  // Message: ECS "message" or Pino "msg"
  const msg = (obj.message as string) || (obj.msg as string) || "";

  // Timestamp: ECS "@timestamp" ISO string or Pino "time" epoch
  const timestamp = obj["@timestamp"] as string | undefined;
  const pinoTime = obj.time as number | undefined;
  const date = timestamp ? new Date(timestamp) : new Date(pinoTime || Date.now());

  // ANSI colors
  const colors: Record<string, string> = {
    trace: "\x1b[90m", debug: "\x1b[36m", info: "\x1b[32m",
    warn: "\x1b[33m", error: "\x1b[31m", fatal: "\x1b[35m",
  };
  const reset = "\x1b[0m";

  // 12-hour time format: "h:MM:ss TT"
  const hours = date.getHours();
  const ampm = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 || 12;
  const timeStr = `${hour12}:${String(date.getMinutes()).padStart(2, "0")}:${String(date.getSeconds()).padStart(2, "0")} ${ampm}`;

  // Extract context: exclude ECS metadata and Pino internal fields
  const context: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (["level", "time", "msg", "message", "pid", "hostname"].includes(key)) continue;
    if (ECS_METADATA_FIELDS.has(key)) continue;
    context[key] = value;
  }

  const contextStr = Object.keys(context).length > 0 ? ` ${JSON.stringify(context)}` : "";
  return `${timeStr} ${colors[levelName]}${levelName}${reset}: ${msg}${contextStr}\n`;
}
```

This function is used as the development-mode Pino destination:

```typescript
const formattedDestination = {
  write: (data: string) => {
    try {
      const obj = JSON.parse(data);
      process.stdout.write(formatLogLine(obj));
    } catch {
      process.stdout.write(data); // Fallback for non-JSON
    }
  },
};

const logger = pino(pinoOptions, formattedDestination);
```

#### Service Metadata Configuration

The `service.*` fields come from `LoggerConfig.service`, loaded by `src/logging/container.ts`:

```typescript
// From loadConfig() -> appConfig.telemetry:
{
  service: {
    name: telemetry.serviceName || "authentication-service",     // TELEMETRY_SERVICE_NAME
    version: telemetry.serviceVersion || pkg.version || "1.0.0", // package.json version
    environment: telemetry.environment || "development",         // TELEMETRY_ENVIRONMENT
  }
}
```

#### Complete Logger Assembly

This is the full `createLogger()` implementation tying together `ecsFormat`, the trace mixin, and the dual-mode destination. Copy this to replicate the exact logging output in another application:

```typescript
import { ecsFormat } from "@elastic/ecs-pino-format";
import { isSpanContextValid, trace } from "@opentelemetry/api";
import pino from "pino";

function isProductionOutput(): boolean {
  const env = process.env.NODE_ENV;
  return env === "production" || env === "staging";
}

function createLogger(config: {
  level: string;
  service: { name: string; version: string; environment: string };
}): pino.Logger {
  const { level, service } = config;

  // 1. ECS format options
  const ecsOptions = ecsFormat({
    apmIntegration: false,
    serviceName: service.name,
    serviceVersion: service.version,
    serviceEnvironment: service.environment,
    convertErr: true,
    convertReqRes: true,
  });

  // 2. Trace context mixin (ECS dot-notation)
  const traceMixin = (): Record<string, string> => {
    const span = trace.getActiveSpan();
    if (!span) return {};
    const ctx = span.spanContext();
    if (!isSpanContextValid(ctx)) return {};
    return {
      "trace.id": ctx.traceId,
      "span.id": ctx.spanId,
      "transaction.id": ctx.traceId,
    };
  };

  // 3. Pino options: ECS format + trace mixin
  const pinoOptions: pino.LoggerOptions = {
    level,
    ...ecsOptions,
    mixin: traceMixin,
  };

  // 4. Dual-mode destination
  if (isProductionOutput()) {
    // Production: raw ECS NDJSON to stdout
    return pino(pinoOptions, {
      write: (data: string) => { process.stdout.write(data); },
    });
  }

  // Development: human-readable formatted output
  return pino(pinoOptions, {
    write: (data: string) => {
      try {
        const obj = JSON.parse(data);
        process.stdout.write(formatLogLine(obj)); // See "Development Console Format" above
      } catch {
        process.stdout.write(data);
      }
    },
  });
}
```

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

The Pino adapter uses a Pino `mixin` function to inject OpenTelemetry trace context into every log entry using ECS dot-notation:

```json
{
  "@timestamp": "2026-01-20T12:00:00.000Z",
  "message": "Token generated",
  "log.level": "info",
  "consumer.id": "abc-123",
  "trace.id": "550e8400e29b41d4a716446655440000",
  "span.id": "550e8400e29b41d4",
  "transaction.id": "550e8400e29b41d4a716446655440000"
}
```

| ECS Field | Source | Description |
|-----------|--------|-------------|
| `trace.id` | OTEL `spanContext().traceId` | Distributed trace identifier |
| `span.id` | OTEL `spanContext().spanId` | Current span identifier |
| `transaction.id` | OTEL `spanContext().traceId` | Elastic APM transaction correlation |

**Why a custom mixin?** PinoInstrumentation's built-in mixin uses underscore format (`trace_id`, `span_id`) which conflicts with ECS dot-notation. We disable PinoInstrumentation's log correlation (`disableLogCorrelation: true`) and use our own mixin instead.

**Mixin implementation:**

```typescript
import { isSpanContextValid, trace } from "@opentelemetry/api";

const traceMixin = (): Record<string, string> => {
  const span = trace.getActiveSpan();
  if (!span) return {};

  const ctx = span.spanContext();
  if (!isSpanContextValid(ctx)) return {};

  return {
    "trace.id": ctx.traceId,
    "span.id": ctx.spanId,
    "transaction.id": ctx.traceId,
  };
};
```

The mixin is passed to Pino via the `mixin` option (see [Complete Logger Assembly](#complete-logger-assembly) below). It runs on every log call and returns an empty object when no OTEL span is active.

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

When `TELEMETRY_MODE` is `otlp` or `both`, logs are exported via the OpenTelemetry protocol.

### How It Works

PinoInstrumentation (`@opentelemetry/instrumentation-pino`) monkey-patches `pino()` to wrap the original destination with `pino.multistream()`. This adds an `OTelPinoStream` alongside your original destination, so every log record is automatically teed to two places:

```
pino.info("Token generated", { consumerId: "abc-123" })
   |
   +--> Original destination (stdout)
   |      - Production: raw NDJSON
   |      - Development: formatted console output
   |
   +--> OTelPinoStream (injected by PinoInstrumentation)
          |
          +--> Global LoggerProvider (set by instrumentation.ts)
                 |
                 +--> BatchLogRecordProcessor
                        |
                        +--> OTLPLogExporter --> Elastic / collector endpoint
```

This means:
- **Console output and OTLP export are independent** -- OTLP failures do not affect console logging
- **No manual OTLP emission code** in the adapter -- PinoInstrumentation handles it
- **The adapter must reinitialize** after `instrumentation.ts` sets the global `LoggerProvider`, because PinoInstrumentation wraps the logger at construction time

### PinoInstrumentation Configuration

In `src/telemetry/instrumentation.ts`:

```typescript
const pinoInstrumentation = new PinoInstrumentation({
  enabled: true,
  disableLogCorrelation: true,  // We use our own ECS mixin
  disableLogSending: false,     // Keep OTelPinoStream active
});
```

| Setting | Value | Reason |
|---------|-------|--------|
| `enabled` | `true` | Activates the instrumentation |
| `disableLogCorrelation` | `true` | Prevents PinoInstrumentation from injecting `trace_id`/`span_id` (underscore format). Our Pino mixin handles this with ECS dot-notation (`trace.id`, `span.id`) instead. |
| `disableLogSending` | `false` | Keeps OTelPinoStream active -- this is the OTLP delivery path |

### Batch Configuration

Set via telemetry config (from `src/telemetry/instrumentation.ts`):

| Parameter | Value | Description |
|-----------|-------|-------------|
| `maxExportBatchSize` | Configurable | Records per batch |
| `maxQueueSize` | Configurable | Maximum queued records |
| `scheduledDelayMillis` | 500ms | Export interval |
| `exportTimeoutMillis` | 10s max | Export timeout cap |

### Reinitialization

PinoInstrumentation wraps the Pino logger with `pino.multistream()` at construction time. If the `PinoAdapter` creates its logger before `instrumentation.ts` runs, the OTelPinoStream won't be attached. To fix this, `instrumentation.ts` calls `reinitialize()` after SDK startup:

```typescript
// In src/telemetry/instrumentation.ts, after sdk.start():
loggerContainer.getLogger().reinitialize();
```

`reinitialize()` flushes the existing logger, discards it, and creates a new one. The new logger gets wrapped by PinoInstrumentation and has OTelPinoStream attached.

If you need to reinitialize manually (e.g., after changing the global `LoggerProvider`):

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
