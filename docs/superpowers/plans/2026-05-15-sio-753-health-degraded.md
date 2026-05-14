# SIO-753: Health Endpoint Degraded Semantics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Change `/health` so it returns `200 + degraded` (not `503 + unhealthy`) when only telemetry export or Kong is failing — cache is the sole 503 trigger.

**Architecture:** Extract the status-determination rule into a small pure function `determineHealthStatus` in a new sibling file `src/handlers/health-status.ts`. Wire it into `handleHealthCheck` at `src/handlers/health.ts:278-301`, replacing the buggy `allHealthy ? 200 : 503` logic. Update the affected unit and mutation tests to match the new rule. `handleReadinessCheck` is unchanged.

**Tech Stack:** Bun runtime, TypeScript strict, `bun:test`, Biome.

---

## File Structure

**New files:**
- `src/handlers/health-status.ts` — pure function `determineHealthStatus(deps)`. ~30 lines.
- `test/bun/handlers/health-status.test.ts` — exhaustive unit tests for the pure function. ~14 cases.

**Files modified:**
- `src/handlers/health.ts` — replace lines 278-301 with a call to `determineHealthStatus`. Add one import.
- `test/bun/health/health.mutation.test.ts` — update 6 assertions for new `handleHealthCheck` behavior. `handleReadinessCheck` assertions untouched.
- `test/bun/health/health-branches.test.ts` — update 4 assertions for `handleHealthCheck`. `handleReadinessCheck` assertions untouched.
- `test/bun/health/health-telemetry-branches.test.ts` — update 1 assertion (line 307).
- `test/bun/mutation/mutation-killer.test.ts` — update 1 assertion (line 544).

**Files NOT touched (in scope to leave alone):**
- `src/handlers/health.ts` — everything except lines 278-301 (probe code, payload-building, DNS stats stay as-is).
- `test/bun/health/health-handlers.test.ts` — no 503 / unhealthy assertions on `handleHealthCheck` that depend on the new rule. Verified by grep.
- `test/bun/health/health-fetch-spy.test.ts` — only asserts happy path (200 + healthy). Still passes.
- `test/bun/health/health-url-validation.test.ts` — URL validation only. Untouched.
- `test/integration/circuit-breaker.integration.test.ts` — asserts on `/tokens` (not 503 on /health). Will pass naturally post-fix.
- `test/integration/otlp-export.integration.test.ts` — OTLP-collector-availability dependent, unrelated.
- `test/k6/smoke/health-only-smoke.ts` — already asserts 200; will pass automatically post-fix.

---

## Pre-flight

- [ ] **Step P1: Verify clean working tree and master is current**

```bash
git status --short
git log --oneline -1
```

Expected: working tree shows only untracked files (`.claude/`, `guides`); HEAD is at or beyond `e9bad45 SIO-753: Add design spec for health endpoint degraded semantics`.

- [ ] **Step P2: Confirm baseline test count and identify already-passing state**

```bash
bun test 2>&1 | tail -5
```

Expected: `3211 pass / 0 fail` (with SSH tunnel up to OTLP collector) OR `3196 pass / 15 fail` (tunnel down). Either is fine — the 15 are pre-existing and unrelated to our changes; we'll explicitly verify them post-fix.

---

## Task 1: Pure rule — write failing test for the happy path

**Files:**
- Create: `test/bun/handlers/health-status.test.ts`

- [ ] **Step 1.1: Create the test file with the happy-path test only**

```ts
// test/bun/handlers/health-status.test.ts

import { describe, expect, test } from "bun:test";
import {
  determineHealthStatus,
  type HealthStatusDeps,
} from "../../../src/handlers/health-status";

const baseDeps = (overrides: Partial<HealthStatusDeps> = {}): HealthStatusDeps => ({
  kong: { healthy: true },
  cache: { status: "healthy", staleCacheAvailable: false },
  telemetry: {
    traces: { healthy: true },
    metrics: { healthy: true },
    logs: { healthy: true },
  },
  ...overrides,
});

describe("determineHealthStatus", () => {
  test("all healthy -> 200 + healthy", () => {
    expect(determineHealthStatus(baseDeps())).toEqual({
      httpStatus: 200,
      healthStatus: "healthy",
    });
  });
});
```

- [ ] **Step 1.2: Run the test to verify it fails**

```bash
bun test test/bun/handlers/health-status.test.ts 2>&1 | tail -10
```

Expected: FAIL — module not found / `determineHealthStatus is not defined`. The import should error first.

- [ ] **Step 1.3: Implement the pure rule**

Create `src/handlers/health-status.ts`:

```ts
// src/handlers/health-status.ts

export interface HealthStatusDeps {
  kong: { healthy: boolean };
  cache: { status: "healthy" | "unhealthy" | "degraded"; staleCacheAvailable: boolean };
  telemetry: {
    traces: { healthy: boolean };
    metrics: { healthy: boolean };
    logs: { healthy: boolean };
  };
}

export interface HealthStatusResult {
  httpStatus: 200 | 503;
  healthStatus: "healthy" | "degraded" | "unhealthy";
}

export function determineHealthStatus(deps: HealthStatusDeps): HealthStatusResult {
  const cacheCritical =
    deps.cache.status === "unhealthy" && !deps.cache.staleCacheAvailable;

  if (cacheCritical) {
    return { httpStatus: 503, healthStatus: "unhealthy" };
  }

  const telemetryHealthy =
    deps.telemetry.traces.healthy &&
    deps.telemetry.metrics.healthy &&
    deps.telemetry.logs.healthy;

  const cacheFullyHealthy = deps.cache.status === "healthy";
  const allHealthy = deps.kong.healthy && cacheFullyHealthy && telemetryHealthy;

  return {
    httpStatus: 200,
    healthStatus: allHealthy ? "healthy" : "degraded",
  };
}
```

- [ ] **Step 1.4: Run the test to verify it passes**

```bash
bun test test/bun/handlers/health-status.test.ts 2>&1 | tail -5
```

Expected: `1 pass / 0 fail`.

- [ ] **Step 1.5: Run typecheck**

```bash
bun run typecheck 2>&1 | tail -3
```

Expected: no output beyond `$ tsc --noEmit` (clean).

- [ ] **Step 1.6: Commit**

```bash
git add src/handlers/health-status.ts test/bun/handlers/health-status.test.ts
git commit -m "SIO-753: Add pure determineHealthStatus rule with happy-path test"
```

---

## Task 2: Pure rule — exhaustive truth-table tests

**Files:**
- Modify: `test/bun/handlers/health-status.test.ts`

- [ ] **Step 2.1: Add the remaining 13 test cases**

Append inside the existing `describe("determineHealthStatus", ...)` block, after the happy-path test:

```ts
  test("cache unhealthy, staleCacheAvailable=false -> 503 + unhealthy", () => {
    expect(
      determineHealthStatus(
        baseDeps({ cache: { status: "unhealthy", staleCacheAvailable: false } })
      )
    ).toEqual({ httpStatus: 503, healthStatus: "unhealthy" });
  });

  test("cache unhealthy, staleCacheAvailable=true -> 200 + degraded", () => {
    expect(
      determineHealthStatus(
        baseDeps({ cache: { status: "unhealthy", staleCacheAvailable: true } })
      )
    ).toEqual({ httpStatus: 200, healthStatus: "degraded" });
  });

  test("cache degraded -> 200 + degraded (staleCacheAvailable irrelevant)", () => {
    expect(
      determineHealthStatus(
        baseDeps({ cache: { status: "degraded", staleCacheAvailable: false } })
      )
    ).toEqual({ httpStatus: 200, healthStatus: "degraded" });
    expect(
      determineHealthStatus(
        baseDeps({ cache: { status: "degraded", staleCacheAvailable: true } })
      )
    ).toEqual({ httpStatus: 200, healthStatus: "degraded" });
  });

  test("telemetry traces unhealthy alone -> 200 + degraded (THE fix)", () => {
    expect(
      determineHealthStatus(
        baseDeps({
          telemetry: {
            traces: { healthy: false },
            metrics: { healthy: true },
            logs: { healthy: true },
          },
        })
      )
    ).toEqual({ httpStatus: 200, healthStatus: "degraded" });
  });

  test("telemetry metrics unhealthy alone -> 200 + degraded", () => {
    expect(
      determineHealthStatus(
        baseDeps({
          telemetry: {
            traces: { healthy: true },
            metrics: { healthy: false },
            logs: { healthy: true },
          },
        })
      )
    ).toEqual({ httpStatus: 200, healthStatus: "degraded" });
  });

  test("telemetry logs unhealthy alone -> 200 + degraded", () => {
    expect(
      determineHealthStatus(
        baseDeps({
          telemetry: {
            traces: { healthy: true },
            metrics: { healthy: true },
            logs: { healthy: false },
          },
        })
      )
    ).toEqual({ httpStatus: 200, healthStatus: "degraded" });
  });

  test("all telemetry unhealthy, kong+cache healthy -> 200 + degraded", () => {
    expect(
      determineHealthStatus(
        baseDeps({
          telemetry: {
            traces: { healthy: false },
            metrics: { healthy: false },
            logs: { healthy: false },
          },
        })
      )
    ).toEqual({ httpStatus: 200, healthStatus: "degraded" });
  });

  test("kong unhealthy, cache+telemetry healthy -> 200 + degraded (THE fix)", () => {
    expect(
      determineHealthStatus(baseDeps({ kong: { healthy: false } }))
    ).toEqual({ httpStatus: 200, healthStatus: "degraded" });
  });

  test("kong unhealthy + telemetry unhealthy, cache healthy -> 200 + degraded", () => {
    expect(
      determineHealthStatus(
        baseDeps({
          kong: { healthy: false },
          telemetry: {
            traces: { healthy: false },
            metrics: { healthy: false },
            logs: { healthy: false },
          },
        })
      )
    ).toEqual({ httpStatus: 200, healthStatus: "degraded" });
  });

  test("kong unhealthy + cache unhealthy + stale available -> 200 + degraded", () => {
    expect(
      determineHealthStatus(
        baseDeps({
          kong: { healthy: false },
          cache: { status: "unhealthy", staleCacheAvailable: true },
        })
      )
    ).toEqual({ httpStatus: 200, healthStatus: "degraded" });
  });

  test("kong unhealthy + cache unhealthy + no stale -> 503 + unhealthy", () => {
    expect(
      determineHealthStatus(
        baseDeps({
          kong: { healthy: false },
          cache: { status: "unhealthy", staleCacheAvailable: false },
        })
      )
    ).toEqual({ httpStatus: 503, healthStatus: "unhealthy" });
  });

  test("cache healthy with staleCacheAvailable=true (informational) -> 200 + healthy", () => {
    expect(
      determineHealthStatus(
        baseDeps({ cache: { status: "healthy", staleCacheAvailable: true } })
      )
    ).toEqual({ httpStatus: 200, healthStatus: "healthy" });
  });
```

- [ ] **Step 2.2: Run the tests to verify they all pass**

```bash
bun test test/bun/handlers/health-status.test.ts 2>&1 | tail -5
```

Expected: `14 pass / 0 fail` (1 from Task 1 + 13 added here).

- [ ] **Step 2.3: Commit**

```bash
git add test/bun/handlers/health-status.test.ts
git commit -m "SIO-753: Add exhaustive truth-table tests for determineHealthStatus"
```

---

## Task 3: Wire `determineHealthStatus` into the health handler

**Files:**
- Modify: `src/handlers/health.ts:278-301` (replace block); add one import near the top.

- [ ] **Step 3.1: Add the import**

Open `src/handlers/health.ts`. Find the existing imports section near the top (around line 1-40). After the existing local-handler imports (look for `CacheHealthService` import), add:

```ts
import { determineHealthStatus } from "./health-status";
```

Place the import alongside other `./` imports for consistency.

- [ ] **Step 3.2: Replace the buggy status block**

Locate lines 278-301 in `src/handlers/health.ts`. The current code is:

```ts
    const cacheHealthy = cacheHealth.status === "healthy";
    const allHealthy =
      kongHealth.healthy &&
      tracesHealth.healthy &&
      metricsHealth.healthy &&
      logsHealth.healthy &&
      cacheHealthy;

    const telemetryHealthy = tracesHealth.healthy && metricsHealth.healthy && logsHealth.healthy;

    const statusCode = allHealthy ? 200 : 503;
    const duration = calculateDuration(startTime);

    let healthStatus: string;
    if (allHealthy) {
      healthStatus = "healthy";
    } else if (
      cacheHealth.status === "degraded" ||
      (!kongHealth.healthy && telemetryHealthy && cacheHealthy)
    ) {
      healthStatus = "degraded";
    } else {
      healthStatus = "unhealthy";
    }
```

Replace **the entire block above** with:

```ts
    const { httpStatus: statusCode, healthStatus } = determineHealthStatus({
      kong: { healthy: kongHealth.healthy },
      cache: {
        status: cacheHealth.status,
        staleCacheAvailable: cacheHealth.staleCache?.available ?? false,
      },
      telemetry: {
        traces: { healthy: tracesHealth.healthy },
        metrics: { healthy: metricsHealth.healthy },
        logs: { healthy: logsHealth.healthy },
      },
    });

    const duration = calculateDuration(startTime);
```

Note: the `const duration = calculateDuration(startTime);` line stays — just position it right after the destructure.

- [ ] **Step 3.3: Verify typecheck passes**

```bash
bun run typecheck 2>&1 | tail -3
```

Expected: clean (`$ tsc --noEmit` with no errors).

If there's an error about unused `telemetryHealthy` const elsewhere in the file, the previous code only used it inside the deleted block — verify by `grep -n telemetryHealthy src/handlers/health.ts`. Expected output: no matches.

- [ ] **Step 3.4: Run the pure-rule tests again — should still pass**

```bash
bun test test/bun/handlers/health-status.test.ts 2>&1 | tail -3
```

Expected: `14 pass / 0 fail`.

- [ ] **Step 3.5: Run the full health-test suite to see what now fails**

```bash
bun test test/bun/health/ 2>&1 | tail -5
```

Expected: some tests fail. We'll fix them in Tasks 4-7. Note the failure counts so we have a baseline.

- [ ] **Step 3.6: Commit**

```bash
git add src/handlers/health.ts
git commit -m "SIO-753: Replace buggy /health status logic with determineHealthStatus call"
```

---

## Task 4: Update `health.mutation.test.ts` assertions

**Files:**
- Modify: `test/bun/health/health.mutation.test.ts`

Specific assertion changes (line numbers refer to the file as it exists on master at this point):

| Line | Test name | Current | New |
|------|-----------|---------|-----|
| 85 | `should return 'unhealthy' when Kong is unhealthy and other dependencies too` | `toBe(503)` and `toContain(...["unhealthy", "degraded"])` | `toBe(200)` and `body.status === "degraded"` |
| 105 | `should return 'degraded' when Kong unhealthy but telemetry and cache healthy` | `toBe(503)` and `toBe("degraded")` | `toBe(200)` and `toBe("degraded")` |
| 123 | `should return 503 status code when unhealthy` | `toBe(503)` | rewrite — see step 4.3 |
| 143 | `should catch Kong healthCheck exception and mark as unhealthy` | `toBe(503)` and `kong.status === "unhealthy"` | `toBe(200)` and `kong.status === "unhealthy"` |
| 157 | `should handle non-Error rejection in Kong healthCheck` | `toBe(503)` and `kong.status === "unhealthy"` | `toBe(200)` and `kong.status === "unhealthy"` |

The mutation-killer tests at lines 478, 480, 516 are for `handleReadinessCheck`, not `handleHealthCheck` — **do not change those**.

- [ ] **Step 4.1: Update line 85 area (kong unhealthy + other deps too)**

Find this block at line 70-88:

```ts
    it("should return 'unhealthy' when Kong is unhealthy and other dependencies too", async () => {
      const unhealthyService: IKongService = {
        ...mockKongService,
        healthCheck: mock(() =>
          Promise.resolve({
            healthy: false,
            responseTime: 5000,
            error: "Connection timeout",
          })
        ),
      };

      const response = await handleHealthCheck(unhealthyService);
      const body = await response.json();

      expect(response.status).toBe(503);
      // Status depends on other dependencies
      expect(["unhealthy", "degraded"]).toContain(body.status);
    });
```

Replace with:

```ts
    it("should return 'degraded' when Kong is unhealthy (cache still serves)", async () => {
      const unhealthyService: IKongService = {
        ...mockKongService,
        healthCheck: mock(() =>
          Promise.resolve({
            healthy: false,
            responseTime: 5000,
            error: "Connection timeout",
          })
        ),
      };

      const response = await handleHealthCheck(unhealthyService);
      const body = await response.json();

      // Kong outage alone does not pull the pod from rotation; cache may still serve.
      expect(response.status).toBe(200);
      expect(body.status).toBe("degraded");
    });
```

- [ ] **Step 4.2: Update line 105 area (kong unhealthy + telemetry+cache healthy)**

Find this block at line 90-107:

```ts
    it("should return 'degraded' when Kong unhealthy but telemetry and cache healthy", async () => {
      const kongUnhealthyService: IKongService = {
        ...mockKongService,
        healthCheck: mock(() =>
          Promise.resolve({
            healthy: false,
            responseTime: 5000,
            error: "Kong unreachable",
          })
        ),
      };

      const response = await handleHealthCheck(kongUnhealthyService);
      const body = await response.json();

      expect(response.status).toBe(503);
      expect(body.status).toBe("degraded");
    });
```

Change ONLY the line `expect(response.status).toBe(503);` to `expect(response.status).toBe(200);`. Leave the rest of the test body and the `toBe("degraded")` assertion as-is.

- [ ] **Step 4.3: Rewrite line 109-124 (the "503 when unhealthy" test)**

This test asserted the binary 503-on-anything-unhealthy semantic that no longer exists. Rewrite to assert the new critical-path semantic.

Find this block at line 109-124:

```ts
    it("should return 503 status code when unhealthy", async () => {
      const unhealthyService: IKongService = {
        ...mockKongService,
        healthCheck: mock(() =>
          Promise.resolve({
            healthy: false,
            responseTime: 0,
            error: "Failed",
          })
        ),
      };

      const response = await handleHealthCheck(unhealthyService);

      expect(response.status).toBe(503);
    });
```

Replace with:

```ts
    it("should return 200 status code when only Kong is unhealthy (cache critical, not Kong)", async () => {
      const unhealthyService: IKongService = {
        ...mockKongService,
        healthCheck: mock(() =>
          Promise.resolve({
            healthy: false,
            responseTime: 0,
            error: "Failed",
          })
        ),
      };

      const response = await handleHealthCheck(unhealthyService);

      expect(response.status).toBe(200);
    });
```

- [ ] **Step 4.4: Update line 143 area (Kong exception handling)**

Find this block at line 134-146:

```ts
    it("should catch Kong healthCheck exception and mark as unhealthy", async () => {
      const exceptionService: IKongService = {
        ...mockKongService,
        healthCheck: mock(() => Promise.reject(new Error("Network error"))),
      };

      const response = await handleHealthCheck(exceptionService);
      const body = await response.json();

      expect(response.status).toBe(503);
      expect(body.dependencies.kong.status).toBe("unhealthy");
      expect(body.dependencies.kong.details.error).toBe("Network error");
    });
```

Change `expect(response.status).toBe(503);` to `expect(response.status).toBe(200);`. Leave the `kong.status === "unhealthy"` and `kong.details.error === "Network error"` assertions as-is — the dependency block still reports actual state.

- [ ] **Step 4.5: Update line 157 area (non-Error rejection)**

Find this block at line 148-160. Change `expect(response.status).toBe(503);` to `expect(response.status).toBe(200);`. Leave the rest as-is.

- [ ] **Step 4.6: Run the mutation tests to verify**

```bash
bun test test/bun/health/health.mutation.test.ts 2>&1 | tail -5
```

Expected: all tests pass. If anything still fails, re-read the failure and check whether it's a `handleHealthCheck` test that wasn't in the table above — those may need similar updates.

- [ ] **Step 4.7: Commit**

```bash
git add test/bun/health/health.mutation.test.ts
git commit -m "SIO-753: Update health.mutation.test.ts for new degraded semantics"
```

---

## Task 5: Update `health-branches.test.ts` assertions

**Files:**
- Modify: `test/bun/health/health-branches.test.ts`

Specific assertion changes (line numbers refer to the file as it exists on master):

| Line | Test name | Current | New |
|------|-----------|---------|-----|
| 84 | `should return 503 when Kong is unhealthy` | `toBe(503)` | `toBe(200)` + rename test |
| 98 | `should return 503 when Kong health check throws` | `toBe(503)` | `toBe(200)` + rename test |
| 131 | `should return status 'unhealthy' when Kong is down` | `toContain(["degraded", "unhealthy"])` | `toBe("degraded")` |

The tests inside `describe("handleReadinessCheck", ...)` (lines 168+) are for the separate `/health/ready` endpoint and **must not be changed**.

- [ ] **Step 5.1: Update lines 74-86 (Kong unhealthy → 503 test)**

Find this block:

```ts
    it("should return 503 when Kong is unhealthy", async () => {
      const { handleHealthCheck } = await import("../../../src/handlers/health");

      const mockKong = createMockKongService({
        healthCheckResult: { healthy: false, responseTime: 0, error: "Connection refused" },
      });

      const response = await handleHealthCheck(mockKong);

      // Verify exact status code - catches mutations to healthy check
      expect(response.status).toBe(503);
      expect(response.status).not.toBe(200);
    });
```

Replace with:

```ts
    it("should return 200 when Kong is unhealthy (Kong is not critical path)", async () => {
      const { handleHealthCheck } = await import("../../../src/handlers/health");

      const mockKong = createMockKongService({
        healthCheckResult: { healthy: false, responseTime: 0, error: "Connection refused" },
      });

      const response = await handleHealthCheck(mockKong);

      // Kong outage produces degraded, not unhealthy: cache may still serve.
      expect(response.status).toBe(200);
      expect(response.status).not.toBe(503);
    });
```

- [ ] **Step 5.2: Update lines 88-100 (Kong throws → 503 test)**

Find this block:

```ts
    it("should return 503 when Kong health check throws", async () => {
      const { handleHealthCheck } = await import("../../../src/handlers/health");

      const mockKong = createMockKongService({
        healthCheckThrows: true,
        healthCheckError: "Network timeout",
      });

      const response = await handleHealthCheck(mockKong);

      expect(response.status).toBe(503);
      expect(response.status).not.toBe(200);
    });
```

Replace with:

```ts
    it("should return 200 when Kong health check throws (Kong is not critical path)", async () => {
      const { handleHealthCheck } = await import("../../../src/handlers/health");

      const mockKong = createMockKongService({
        healthCheckThrows: true,
        healthCheckError: "Network timeout",
      });

      const response = await handleHealthCheck(mockKong);

      expect(response.status).toBe(200);
      expect(response.status).not.toBe(503);
    });
```

- [ ] **Step 5.3: Update lines 120-133 ('unhealthy' string when Kong down)**

Find this block:

```ts
    it("should return status 'unhealthy' when Kong is down", async () => {
      const { handleHealthCheck } = await import("../../../src/handlers/health");

      const mockKong = createMockKongService({
        healthCheckResult: { healthy: false, responseTime: 0, error: "Connection refused" },
      });

      const response = await handleHealthCheck(mockKong);
      const body = await response.json();

      // With telemetry endpoints not configured, only Kong failure = unhealthy
      expect(["degraded", "unhealthy"]).toContain(body.status);
      expect(body.status).not.toBe("healthy");
    });
```

Replace with:

```ts
    it("should return status 'degraded' when Kong is down (kong is not critical)", async () => {
      const { handleHealthCheck } = await import("../../../src/handlers/health");

      const mockKong = createMockKongService({
        healthCheckResult: { healthy: false, responseTime: 0, error: "Connection refused" },
      });

      const response = await handleHealthCheck(mockKong);
      const body = await response.json();

      expect(body.status).toBe("degraded");
      expect(body.status).not.toBe("healthy");
      expect(body.status).not.toBe("unhealthy");
    });
```

- [ ] **Step 5.4: Run the branches test to verify**

```bash
bun test test/bun/health/health-branches.test.ts 2>&1 | tail -5
```

Expected: all tests pass.

- [ ] **Step 5.5: Commit**

```bash
git add test/bun/health/health-branches.test.ts
git commit -m "SIO-753: Update health-branches.test.ts for new degraded semantics"
```

---

## Task 6: Update `health-telemetry-branches.test.ts` assertion

**Files:**
- Modify: `test/bun/health/health-telemetry-branches.test.ts`

- [ ] **Step 6.1: Update line ~307 (invalid Kong URL → 503)**

Find the test that ends with the assertion at line 307. The block (search for `should handle missing telemetry endpoints gracefully`'s sibling test that asserts 503 on an invalid Kong URL):

```ts
      const { handleHealthCheck } = await import("../../../src/handlers/health");
      const response = await handleHealthCheck(invalidKongService);

      expect(response.status).toBe(503);
    });
```

Change `expect(response.status).toBe(503);` to `expect(response.status).toBe(200);`.

If the surrounding test is named something like "should ... when Kong unavailable", consider renaming to make the new semantic explicit. Optional. The functional change is the assertion.

- [ ] **Step 6.2: Run the telemetry-branches test**

```bash
bun test test/bun/health/health-telemetry-branches.test.ts 2>&1 | tail -5
```

Expected: all tests pass.

- [ ] **Step 6.3: Commit**

```bash
git add test/bun/health/health-telemetry-branches.test.ts
git commit -m "SIO-753: Update health-telemetry-branches.test.ts for new degraded semantics"
```

---

## Task 7: Update `mutation-killer.test.ts:544` assertion

**Files:**
- Modify: `test/bun/mutation/mutation-killer.test.ts`

- [ ] **Step 7.1: Update lines 531-552 (Kong fails)**

Find this block at line 531:

```ts
    it("should return EXACT unhealthy status when Kong fails", async () => {
      mockKongService.healthCheck = mock(() =>
        Promise.resolve({
          healthy: false,
          responseTime: 0,
          error: "Connection refused",
        })
      );

      const response = await handleHealthCheck(mockKongService);
      const body = await response.json();

      // Should be 503 when unhealthy
      expect(response.status).toBe(503);

      // Status should NOT be "healthy"
      expect(body.status).not.toBe("healthy");
      expect(["unhealthy", "degraded"]).toContain(body.status);

      // Kong dependency should show unhealthy
      expect(body.dependencies.kong.status).toBe("unhealthy");
    });
```

Replace with:

```ts
    it("should return 200 + degraded when Kong fails alone (cache critical, not Kong)", async () => {
      mockKongService.healthCheck = mock(() =>
        Promise.resolve({
          healthy: false,
          responseTime: 0,
          error: "Connection refused",
        })
      );

      const response = await handleHealthCheck(mockKongService);
      const body = await response.json();

      // Kong outage does NOT pull the pod from rotation; cache may still serve.
      expect(response.status).toBe(200);

      // Top-level status is degraded
      expect(body.status).toBe("degraded");
      expect(body.status).not.toBe("healthy");

      // Kong dependency still reports actual state
      expect(body.dependencies.kong.status).toBe("unhealthy");
    });
```

- [ ] **Step 7.2: Run the mutation-killer test**

```bash
bun test test/bun/mutation/mutation-killer.test.ts 2>&1 | tail -5
```

Expected: all tests pass. If a different test in this file uses `handleHealthCheck` with a Kong-down scenario and asserts 503, update similarly. The `handleReadinessCheck` tests at lines 478, 480, 516, 544 stay as-is.

- [ ] **Step 7.3: Commit**

```bash
git add test/bun/mutation/mutation-killer.test.ts
git commit -m "SIO-753: Update mutation-killer.test.ts for new degraded semantics"
```

---

## Task 8: Full verification

- [ ] **Step 8.1: Run the full unit/integration test suite**

```bash
bun test 2>&1 | tail -5
```

Expected: `3211 pass / 0 fail` (assuming SSH tunnel up). If tunnel is down, the only failures should be from `test/integration/otlp-export.integration.test.ts` (1 timeout) — that's unrelated to our change.

If any other failures exist, drill in:

```bash
bun test --reporter=junit --reporter-outfile=/tmp/sio-753-verify.xml 2>&1 | tail -3
python3 -c "
import re
with open('/tmp/sio-753-verify.xml') as f: c = f.read()
for n, cls, f, l, t in re.findall(r'<testcase name=\"([^\"]+)\" classname=\"([^\"]+)\"[^>]*file=\"([^\"]+)\"[^>]*line=\"(\d+)\"[^>]*>\s*<failure type=\"([^\"]+)\"', c):
    print(f'{f}:{l} [{t}] {cls} > {n}')
"
```

- [ ] **Step 8.2: Run typecheck**

```bash
bun run typecheck 2>&1 | tail -3
```

Expected: clean.

- [ ] **Step 8.3: Run Biome check**

```bash
bun run biome:check 2>&1 | tail -3
```

Expected: `Checked X files in Y ms. No fixes applied.`. If errors appear in the new file, run `bun run biome:check:write` and re-stage.

- [ ] **Step 8.4: Live verification of /health behavior**

Verify that an actually-running server now returns the new semantics. The auth server must be running (typically `bun run dev`).

```bash
curl -s http://localhost:3000/health -o /tmp/health.json -w "HTTP %{http_code}\n"
python3 -c "import json; d=json.load(open('/tmp/health.json')); print('status:', d['status']); print('kong:', d['dependencies']['kong']['status']); print('cache.connected:', d['dependencies']['cache']['connection']['connected'])"
```

Expected if OTLP collector is down but Kong+cache up:
```
HTTP 200
status: degraded
kong: healthy
cache.connected: True
```

Expected if everything is up:
```
HTTP 200
status: healthy
```

The previous behavior would have shown `HTTP 503` and `status: unhealthy`.

- [ ] **Step 8.5: Run k6 health smoke against the running server**

```bash
bun run test:k6:smoke:health 2>&1 | tail -10
```

Expected: 540 iterations, 100% pass, `'rate<0.01' rate=0.00%`, no threshold failures.

If the server returns 200+healthy or 200+degraded consistently across the 3 minutes, the smoke passes — that's the production proof point per the AC.

---

## Task 9: Documentation update

**Files:**
- Modify: `docs/operations/troubleshooting.md` — add or update the health-check section.
- Modify: `docs/operations/sla.md` — note that 200+degraded is still a passing response for SLA monitoring.

- [ ] **Step 9.1: Locate the existing health-check section**

```bash
grep -nE "^#+ .*[Hh]ealth|/health|503|degraded" docs/operations/troubleshooting.md 2>&1 | head -10
grep -nE "^#+ .*[Hh]ealth|/health|503|200|degraded" docs/operations/sla.md 2>&1 | head -10
```

Note the line numbers of sections to update. If no health section exists in either file, add one at an appropriate position.

- [ ] **Step 9.2: Update `docs/operations/troubleshooting.md`**

In the appropriate health section, add a subsection covering:

```markdown
### Health endpoint semantics

`GET /health` returns one of two HTTP status codes:

| HTTP | `status` field | Meaning |
|------|----------------|---------|
| 200 | `healthy` | All dependencies fully healthy. Serve traffic normally. |
| 200 | `degraded` | At least one dependency is sub-fully-healthy (telemetry export unreachable, Kong API unreachable, cache serving from stale fallback, etc.), but the service can still authenticate consumers. Pod stays in rotation. Investigate the `dependencies` block for which dep is degraded. |
| 503 | `unhealthy` | Primary cache is unreachable AND no stale cache fallback is available. The service cannot read consumer secrets to authenticate new tokens. Pod should be pulled from rotation. |

**Common 200+degraded scenarios:**
- OTLP collector outage: `dependencies.telemetry.{traces,metrics,logs}.status = "unhealthy"`. Token generation still works; only observability is impacted.
- Kong Admin API outage: `dependencies.kong.status = "unhealthy"`. Existing consumers served from cache; new consumer enrollment blocked.
- Primary cache outage with stale fallback: `dependencies.cache.status = "unhealthy"`, `staleCache.available = true`. Existing cached consumers served from stale; primary cache reconnecting.

**Common 503+unhealthy scenarios:**
- Primary Redis/Valkey down AND stale cache exhausted or never populated. Service is non-functional.

For Kubernetes deployments: use `/health` as both liveness and readiness probe. The 200+degraded response keeps pods in rotation during partial outages, while 503+unhealthy correctly evicts unhealthy pods.
```

- [ ] **Step 9.3: Update `docs/operations/sla.md`**

In the section that discusses health monitoring, add or update:

```markdown
### Health response interpretation for SLA monitoring

A `200 + status: "degraded"` response is a **passing** /health response for SLA purposes — the service is still authenticating consumers. SLA monitoring should treat:

- `200 + healthy` and `200 + degraded` as **available**
- `503 + unhealthy` as **unavailable**

If monitoring tools assert specifically on `status: "healthy"`, they will trigger spurious incidents during telemetry or Kong partial outages. Update assertions to either check `response.status === 200` or accept both `healthy` and `degraded` as success states.
```

If the file is already structured differently, integrate the substance of the above without forcing the heading. Preserve existing content (append/integrate, don't replace).

- [ ] **Step 9.4: Verify markdown lint (if a markdown linter is configured)**

```bash
grep -n "markdownlint\|prettier.*md" package.json 2>&1 | head -5
```

If a markdown linter is configured, run it. Otherwise skip — Biome doesn't lint markdown.

- [ ] **Step 9.5: Commit**

```bash
git add docs/operations/troubleshooting.md docs/operations/sla.md
git commit -m "SIO-753: Document health endpoint tiered semantics"
```

---

## Task 10: Update Linear and close

- [ ] **Step 10.1: Verify all acceptance criteria are met**

Open the Linear issue: <https://linear.app/siobytes/issue/SIO-753>. Walk through each acceptance criterion (the 8 checkboxes) and confirm each is satisfied:

1. 200 + degraded when telemetry sub-check unhealthy → verified by pure-rule test + live `curl`
2. 200 + degraded when cache unhealthy + stale available → verified by pure-rule test
3. 503 + unhealthy when cache unhealthy + no stale → verified by pure-rule test
4. 200 + healthy when all healthy → verified by pure-rule test + happy-path live curl
5. Dependencies block unchanged → verified by `kong.status === "unhealthy"` assertions still holding
6. All 11 previously-failing health unit tests pass → verified by `bun test` 3211/0
7. k6 health smoke passes when OTLP collector offline → verified in Step 8.5
8. Documentation updated → verified in Task 9

- [ ] **Step 10.2: Push and confirm CI**

```bash
git push origin master 2>&1 | tail -5
```

Wait for CI to run. Check GitHub:

```bash
gh pr checks --watch 2>&1 | tail -10
```

If working on a branch instead of master, replace `master` with the branch name and ensure a PR is open.

- [ ] **Step 10.3: Update Linear issue status**

Per CLAUDE.md: **NEVER set issues to "Done" without user approval.** Instead, ask the user whether the work is complete and ready for closure. Until then, the issue can be set to "In Review" or left "In Progress".

Use the Linear save_issue MCP tool with `state: "In Review"` if approval is pending. Do not set `state: "Done"` without explicit user confirmation.

---

## Self-Review

**Spec coverage:** Walked through every section of `2026-05-14-sio-753-health-degraded-design.md`. Each requirement has a task:

- Pure function `determineHealthStatus` and its types → Tasks 1, 2
- Call-site wiring → Task 3
- Acceptance criteria → covered across Tasks 1, 2, 8
- Documentation → Task 9

**Placeholder scan:** No TBD, TODO, or "implement later". Each step has either exact code, exact commands, or exact assertion substitutions.

**Type consistency:** `HealthStatusDeps`, `HealthStatusResult`, `determineHealthStatus` used identically across Tasks 1, 2, 3. Field names (`kong.healthy`, `cache.status`, `cache.staleCacheAvailable`, `telemetry.{traces,metrics,logs}.healthy`) match the spec.

**Test inventory cross-check:**
- `test/bun/handlers/health-status.test.ts` — Tasks 1, 2 (14 cases)
- `test/bun/health/health.mutation.test.ts` — Task 4 (5 assertion changes)
- `test/bun/health/health-branches.test.ts` — Task 5 (3 assertion changes)
- `test/bun/health/health-telemetry-branches.test.ts` — Task 6 (1 assertion change)
- `test/bun/mutation/mutation-killer.test.ts` — Task 7 (1 assertion change)
- `test/bun/health/health-handlers.test.ts` — no relevant 503 assertions on `handleHealthCheck`; skipped
- `test/bun/health/health-fetch-spy.test.ts` — only happy path; skipped
- `test/integration/circuit-breaker.integration.test.ts` — asserts on `/tokens`, not `/health` 503; skipped
- `test/k6/smoke/health-only-smoke.ts` — verified in Step 8.5; no code change
