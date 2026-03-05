# ECS Pino Compliance: Dual-Mode Output Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the Pino adapter fully ECS-compliant with dual-mode output (raw NDJSON in production, human-readable in development), remove duplicate OTLP emission and trace correlation, and add missing ECS fields.

**Architecture:** Production writes raw ECS NDJSON to stdout (full `@elastic/ecs-pino-format` JSON). Development reformats for readability (current behavior). `PinoInstrumentation` handles OTLP log sending via `OTelPinoStream` (tees every log to the global `LoggerProvider`). Trace correlation uses a Pino `mixin` function in `createLogger()` that injects `trace.id`, `span.id`, and `transaction.id` from the OTEL API in ECS dot-notation. `PinoInstrumentation.disableLogCorrelation: true` prevents duplicate trace fields from the instrumentation's own mixin.

**Data flow:**
```
pino.info("message", {...})
  |
  +-- stdout (dev: golden path single-line / prod: ECS NDJSON)
  |
  +-- OTelPinoStream (auto-injected by @opentelemetry/instrumentation-pino)
        +-- logs.getLogger().emit(logRecord)
              +-- LoggerProvider (global)
                    +-- BatchLogRecordProcessor
                          +-- OTLPLogExporter -> Elastic backend
```

**Tech Stack:** Pino 10.x, `@elastic/ecs-pino-format` 1.5.0, `@opentelemetry/instrumentation-pino`, Bun test runner

---

### Task 1: Write Failing Tests for Dual-Mode Output

**Files:**
- Create: `test/bun/logging/pino-ecs-compliance.test.ts`

**Step 1: Write the failing tests**

```typescript
// test/bun/logging/pino-ecs-compliance.test.ts
import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import type { LoggerConfig } from "../../../src/logging/ports/logger.port";

describe("Pino ECS Compliance - Dual Mode Output", () => {
  let capturedOutput: string[];
  const originalWrite = process.stdout.write;
  const originalEnv = process.env.NODE_ENV;

  const testConfig: LoggerConfig = {
    level: "info",
    service: {
      name: "test-auth-service",
      version: "2.0.0",
      environment: "test",
    },
    mode: "console",
  };

  beforeEach(() => {
    capturedOutput = [];
    process.stdout.write = ((chunk: string | Uint8Array) => {
      capturedOutput.push(typeof chunk === "string" ? chunk : new TextDecoder().decode(chunk));
      return true;
    }) as typeof process.stdout.write;
  });

  afterEach(() => {
    process.stdout.write = originalWrite;
    process.env.NODE_ENV = originalEnv;
  });

  describe("Production Mode (raw NDJSON)", () => {
    it("should output raw ECS JSON in production", async () => {
      process.env.NODE_ENV = "production";
      const { PinoAdapter } = await import("../../../src/logging/adapters/pino.adapter");
      const adapter = new PinoAdapter(testConfig);

      adapter.info("Test message", { component: "test" });

      const output = capturedOutput.join("");
      const parsed = JSON.parse(output.trim());

      expect(parsed["@timestamp"]).toBeDefined();
      expect(parsed["log.level"]).toBe("info");
      expect(parsed.message).toBe("Test message");
      expect(parsed["ecs.version"]).toBeDefined();
      expect(parsed["process.pid"]).toBeDefined();
      expect(parsed["host.hostname"]).toBeDefined();
      expect(parsed["service.name"]).toBe("test-auth-service");
      expect(parsed["service.version"]).toBe("2.0.0");
      expect(parsed["service.environment"]).toBe("test");
      expect(parsed["event.dataset"]).toBe("test-auth-service");
      expect(parsed.component).toBe("test");
    });

    it("should output one JSON object per line (NDJSON)", async () => {
      process.env.NODE_ENV = "production";
      const { PinoAdapter } = await import("../../../src/logging/adapters/pino.adapter");
      const adapter = new PinoAdapter(testConfig);

      adapter.info("First message");
      adapter.warn("Second message");

      const lines = capturedOutput.join("").trim().split("\n");
      expect(lines.length).toBe(2);
      expect(() => JSON.parse(lines[0])).not.toThrow();
      expect(() => JSON.parse(lines[1])).not.toThrow();
    });
  });

  describe("Development Mode (human-readable)", () => {
    it("should output formatted console line in development", async () => {
      process.env.NODE_ENV = "development";
      const { PinoAdapter } = await import("../../../src/logging/adapters/pino.adapter");
      const adapter = new PinoAdapter(testConfig);

      adapter.info("Dev message", { component: "test" });

      const output = capturedOutput.join("");
      // Should contain time, level, message - NOT raw JSON with @timestamp
      expect(output).toContain("info");
      expect(output).toContain("Dev message");
      expect(output).not.toContain('"@timestamp"');
      expect(output).not.toContain('"ecs.version"');
    });
  });

  describe("ECS Required Fields (Production)", () => {
    it("should include convertReqRes in ecsFormat config", async () => {
      process.env.NODE_ENV = "production";
      const { PinoAdapter } = await import("../../../src/logging/adapters/pino.adapter");
      const adapter = new PinoAdapter(testConfig);

      adapter.info("Check fields");
      const parsed = JSON.parse(capturedOutput.join("").trim());

      // ECS required fields from @elastic/ecs-pino-format
      expect(parsed["@timestamp"]).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(parsed["log.level"]).toBe("info");
      expect(parsed.message).toBe("Check fields");
      expect(parsed["ecs.version"]).toBe("8.10.0");
    });
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `bun test test/bun/logging/pino-ecs-compliance.test.ts`
Expected: FAIL -- production mode outputs formatted console lines, not raw JSON

---

### Task 2: Implement Dual-Mode Destination in PinoAdapter

**Files:**
- Modify: `src/logging/adapters/pino.adapter.ts`

**Step 1: Determine if running in production**

Add a helper to detect production mode. The destination selection is based on `NODE_ENV`:

```typescript
/**
 * Determine if raw ECS NDJSON should be written to stdout.
 * Production environments get raw JSON for Filebeat/log collectors.
 * Development gets human-readable formatted output.
 */
function isProductionOutput(): boolean {
  const env = process.env.NODE_ENV?.toLowerCase();
  return env !== "development" && env !== "test";
}
```

**Step 2: Replace the single destination with dual-mode and add trace mixin**

In `createLogger()`, replace the current custom destination with dual-mode output
and add a Pino `mixin` for ECS trace context:

```typescript
private createLogger(): pino.Logger {
  const { level, service } = this.config;

  // ECS format options - see https://www.elastic.co/docs/reference/ecs/logging/nodejs/pino
  const ecsOptions = ecsFormat({
    apmIntegration: false,
    serviceName: service.name,
    serviceVersion: service.version,
    serviceEnvironment: service.environment,
    convertErr: true,
    convertReqRes: true,
  });

  const pinoOptions: pino.LoggerOptions = {
    level: level === "silent" ? "silent" : level,
    ...ecsOptions,
    // Trace context mixin: injects trace.id, span.id, transaction.id from active OTEL span.
    // Uses ECS dot-notation field names for Elastic APM compatibility.
    // PinoInstrumentation's own mixin is disabled (disableLogCorrelation: true)
    // to avoid duplicate trace fields in underscore format (trace_id, span_id).
    mixin() {
      const span = trace.getActiveSpan();
      if (!span) return {};
      const ctx = span.spanContext();
      if (!isSpanContextValid(ctx)) return {};
      return {
        "trace.id": ctx.traceId,
        "span.id": ctx.spanId,
        "transaction.id": ctx.spanId,
      };
    },
  };

  if (isProductionOutput()) {
    // Production: raw ECS NDJSON to stdout
    // pino.destination(1) = file descriptor 1 = stdout, sync mode
    return pino(pinoOptions, pino.destination({ dest: 1, sync: true }));
  }

  // Development: human-readable formatted output
  const destination = {
    write: (data: string) => {
      try {
        const obj = JSON.parse(data);
        const formatted = this.formatLogLine(obj);
        process.stdout.write(formatted);
      } catch {
        process.stdout.write(data);
      }
    },
  };

  return pino(pinoOptions, destination);
}
```

Update imports at the top of `pino.adapter.ts`:

```typescript
import { trace, isSpanContextValid } from "@opentelemetry/api";
```

Note: `trace` import is kept (needed for mixin), but `@opentelemetry/api-logs` import is removed in Task 3.

**Step 3: Run tests to verify production tests pass**

Run: `bun test test/bun/logging/pino-ecs-compliance.test.ts`
Expected: Production mode tests PASS, development mode tests PASS

**Step 4: Run existing tests to verify no regressions**

Run: `bun test test/bun/logging/`
Expected: All existing logging tests still PASS

**Step 5: Commit**

```bash
git add src/logging/adapters/pino.adapter.ts test/bun/logging/pino-ecs-compliance.test.ts
git commit -m "SIO-XXX: Add dual-mode ECS output (raw NDJSON in production, formatted in dev)"
```

---

### Task 3: Remove Manual emitOtelLog() -- PinoInstrumentation Handles OTLP

**Files:**
- Modify: `src/logging/adapters/pino.adapter.ts`

**Step 1: Write test verifying no double emission**

Add to `test/bun/logging/pino-ecs-compliance.test.ts`:

```typescript
describe("OTLP Emission", () => {
  it("should NOT have manual emitOtelLog method", async () => {
    const { PinoAdapter } = await import("../../../src/logging/adapters/pino.adapter");
    const adapter = new PinoAdapter(testConfig);

    // emitOtelLog was removed -- PinoInstrumentation handles OTLP via OTelPinoStream
    expect((adapter as any).emitOtelLog).toBeUndefined();
  });
});
```

**Step 2: Remove emitOtelLog() and related imports**

Remove from `pino.adapter.ts`:
- The `import { logs, SeverityNumber } from "@opentelemetry/api-logs";` import
- The entire `SEVERITY_MAP` constant (lines 28-33)
- The entire `emitOtelLog()` method (lines 63-110)
- All `this.emitOtelLog(...)` calls from `debug()`, `info()`, `warn()`, `error()` methods (lines 266, 278, 290, 302)
- Remove the comments about "Also send to OTLP via global LoggerProvider"

**Step 3: Run tests**

Run: `bun test test/bun/logging/pino-ecs-compliance.test.ts`
Expected: PASS

**Step 4: Commit**

```bash
git add src/logging/adapters/pino.adapter.ts test/bun/logging/pino-ecs-compliance.test.ts
git commit -m "SIO-XXX: Remove manual emitOtelLog (PinoInstrumentation handles OTLP)"
```

---

### Task 4: Move Trace Context to Pino Mixin, Configure PinoInstrumentation

**Files:**
- Modify: `src/logging/adapters/pino.adapter.ts`
- Modify: `src/telemetry/instrumentation.ts`

**Context:** The Pino `mixin` function in `createLogger()` (added in Task 2) now handles
trace context injection with ECS dot-notation (`trace.id`, `span.id`, `transaction.id`).
This replaces the manual injection in each `debug()`/`info()`/`warn()`/`error()` method.
`PinoInstrumentation` must have `disableLogCorrelation: true` to avoid duplicate trace
fields in underscore format (`trace_id`, `span_id`).

**Step 1: Write test verifying mixin-based trace injection**

Add to `test/bun/logging/pino-ecs-compliance.test.ts`:

```typescript
describe("Trace Correlation", () => {
  it("should NOT have captureTraceContext method", async () => {
    const { PinoAdapter } = await import("../../../src/logging/adapters/pino.adapter");
    const adapter = new PinoAdapter(testConfig);

    // captureTraceContext removed -- Pino mixin handles trace context
    expect((adapter as any).captureTraceContext).toBeUndefined();
  });

  it("should not inject trace fields when no active span exists", async () => {
    process.env.NODE_ENV = "production";
    const { PinoAdapter } = await import("../../../src/logging/adapters/pino.adapter");
    const adapter = new PinoAdapter(testConfig);

    adapter.info("No trace context");
    const parsed = JSON.parse(capturedOutput.join("").trim());

    // Mixin returns {} when no active span -- no trace fields should appear
    expect(parsed["trace.id"]).toBeUndefined();
    expect(parsed["span.id"]).toBeUndefined();
    expect(parsed["transaction.id"]).toBeUndefined();
  });
});
```

**Step 2: Remove captureTraceContext and manual trace injection from PinoAdapter**

Remove from `pino.adapter.ts`:
- The `TraceContext` type import (no longer needed, mixin uses OTEL API directly)
- The entire `captureTraceContext()` method (lines 243-253)
- All manual trace context injection from `debug()`, `info()`, `warn()`, `error()` methods

The simplified log methods become:

```typescript
debug(message: string, context?: LogContext): void {
  this.getLogger().debug(context || {}, message);
}

info(message: string, context?: LogContext): void {
  this.getLogger().info(context || {}, message);
}

warn(message: string, context?: LogContext): void {
  this.getLogger().warn(context || {}, message);
}

error(message: string, context?: LogContext): void {
  this.getLogger().error(context || {}, message);
}
```

Keep `import { trace, isSpanContextValid } from "@opentelemetry/api";` -- still needed by the mixin.

**Step 3: Configure PinoInstrumentation: disable log correlation, keep log sending**

In `src/telemetry/instrumentation.ts`, update the PinoInstrumentation config (around line 239):

```typescript
// PinoInstrumentation handles two things:
// 1. Log correlation (mixin): DISABLED -- our ECS mixin in PinoAdapter.createLogger()
//    already injects trace.id, span.id, transaction.id in ECS dot-notation.
//    PinoInstrumentation's default mixin uses underscore format (trace_id, span_id)
//    which would create duplicate/conflicting trace fields.
// 2. Log sending (OTelPinoStream): ENABLED -- automatically tees every Pino log record
//    to the global LoggerProvider via pino.multistream(). This is the OTLP delivery path.
const pinoInstrumentation = new PinoInstrumentation({
  enabled: true,
  disableLogCorrelation: true,
  disableLogSending: false,
});
```

**Step 4: Run tests**

Run: `bun test test/bun/logging/pino-ecs-compliance.test.ts && bun test test/bun/logging/`
Expected: All PASS

**Step 5: Update the reinitialize comment in instrumentation.ts**

Update the comment at line 277-279 since `emitOtelLog()` no longer exists:

```typescript
// SIO-447: Pino logger reinitialized to pick up PinoInstrumentation's OTelPinoStream.
// PinoInstrumentation handles OTLP log sending via multistream automatically.
loggerContainer.getLogger().reinitialize();
```

**Step 6: Commit**

```bash
git add src/logging/adapters/pino.adapter.ts src/telemetry/instrumentation.ts test/bun/logging/pino-ecs-compliance.test.ts
git commit -m "SIO-XXX: Move trace context to mixin, configure PinoInstrumentation (disableLogCorrelation)"
```

---

### Task 5: Clean Up Unused Imports and Types

**Files:**
- Modify: `src/logging/ports/logger.port.ts`
- Modify: `src/logging/adapters/pino.adapter.ts`

**Step 1: Check if TraceContext is used elsewhere**

Run: `grep -r "TraceContext" src/ --include="*.ts" -l`

If `TraceContext` is only used in `pino.adapter.ts` and `logger.port.ts`, remove it from the port interface. If used elsewhere, keep it.

**Step 2: Remove PinoAdapterConfig.useWorker if unused**

Check if `useWorker` is referenced anywhere. If not, simplify:

```typescript
// PinoAdapterConfig no longer needs useWorker -- Bun doesn't support pino.transport() workers
// PinoAdapter can use LoggerConfig directly
```

**Step 3: Run full test suite**

Run: `bun test test/bun/logging/`
Expected: All PASS

**Step 4: Commit**

```bash
git add src/logging/ports/logger.port.ts src/logging/adapters/pino.adapter.ts
git commit -m "SIO-XXX: Clean up unused TraceContext and PinoAdapterConfig types"
```

---

### Task 6: Run Full Quality Checks and Test Suite

**Files:** None (validation only)

**Step 1: TypeScript**

Run: `bun run typecheck`
Expected: No errors

**Step 2: Biome**

Run: `bun run biome:check`
Expected: No issues. If issues found, run `bun run biome:check:write`

**Step 3: YAML**

Run: `bun run yaml:check`
Expected: Pass

**Step 4: Full test suite**

Run: `bun run test:bun`
Expected: All 3191+ tests pass

**Step 5: Commit any fixes**

If biome or typecheck required fixes:
```bash
git add -A && git commit -m "SIO-XXX: Fix lint/type issues from ECS compliance changes"
```

---

### Task 7: Update Documentation

**Files:**
- Modify: `docs/development/logging.md`

**Step 1: Update the Backends section**

Update the Pino backend description to document dual-mode behavior:

Under "### Pino (Default)", replace the console output format section:

```markdown
**Dual-mode output:**
- **Production** (`NODE_ENV=production`) -- raw ECS NDJSON to stdout, every field present:
  ```json
  {"log.level":"info","@timestamp":"2026-03-05T...","process.pid":3896,"host.hostname":"...","ecs.version":"8.10.0","service.name":"authentication-service","service.version":"2.0","service.environment":"production","event.dataset":"authentication-service","trace.id":"550e8400...","span.id":"...","transaction.id":"...","message":"Token generated"}
  ```
- **Development** (`NODE_ENV=development`) -- human-readable format (ECS boilerplate stripped):
  ```
  4:25:58 PM info: Token generated {"component":"auth","consumerId":"abc-123"}
  ```

**Trace correlation** is handled by a Pino `mixin` function in `PinoAdapter.createLogger()` that injects `trace.id`, `span.id`, and `transaction.id` from the active OTEL span using ECS dot-notation. `PinoInstrumentation`'s own log correlation is disabled (`disableLogCorrelation: true`) to avoid duplicate fields in underscore format.

**OTLP log delivery** is handled automatically by `PinoInstrumentation`'s `OTelPinoStream` via `pino.multistream()`. Every Pino log record is teed to both the original stdout destination AND the global `LoggerProvider`, which batches and exports via OTLP. No manual OTLP emission code is needed in the adapter.
```

**Step 2: Commit**

```bash
git add docs/development/logging.md
git commit -m "SIO-XXX: Update logging docs for dual-mode ECS output"
```

---

## Summary of Changes

| File | Change |
|------|--------|
| `src/logging/adapters/pino.adapter.ts` | Dual-mode destination, Pino `mixin` for trace context (trace.id, span.id, transaction.id), remove `emitOtelLog()`, remove `captureTraceContext()`, add `convertReqRes: true` |
| `src/telemetry/instrumentation.ts` | Configure `PinoInstrumentation` with `disableLogCorrelation: true`, `disableLogSending: false` |
| `src/logging/ports/logger.port.ts` | Remove `TraceContext` if unused elsewhere |
| `test/bun/logging/pino-ecs-compliance.test.ts` | New test file for ECS compliance verification |
| `docs/development/logging.md` | Document dual-mode behavior and trace correlation |
