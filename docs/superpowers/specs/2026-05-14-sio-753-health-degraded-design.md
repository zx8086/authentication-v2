# SIO-753: Health endpoint should not return 503 when only telemetry export is unhealthy

**Status:** Design approved (2026-05-14)
**Linear:** [SIO-753](https://linear.app/siobytes/issue/SIO-753)
**Scope:** Option A (in-place fix to `/health`). Option B (split into `/health/live` and `/health/ready`) is out of scope and tracked separately if needed.

## Problem

`GET /health` currently returns **503 + `status: "unhealthy"`** whenever any OTLP export endpoint (traces, metrics, or logs at `http://localhost:4318/v1/*`) is unreachable, even though the auth service itself is fully functional. The service can still authenticate consumers, generate JWTs, and serve cached secrets — it just can't ship its telemetry.

This conflates **observability** with **critical-path dependencies**. Token generation succeeded 1728/1728 times during a k6 smoke run on Bun 1.3.14 while `/health` returned 503 because the local OTLP collector was offline.

### Production failure mode

If the OTLP collector has an outage in production:

1. Every auth pod's `/health` returns 503
2. Kubernetes liveness/readiness probes mark all pods unhealthy
3. Pods are restarted or pulled from rotation in a loop
4. **The authentication service goes down because the telemetry pipeline went down**

Observability cascades into the outage it is meant to observe.

## Root cause

`src/handlers/health.ts:278-301` (master at the time of writing):

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

Two issues:

1. HTTP status is binary (`allHealthy ? 200 : 503`) and ignores the existing `"degraded"` text classification.
2. The `"degraded"` branch covers `cache degraded` and `kong unhealthy + telemetry healthy + cache healthy`, but **not** the very common case of `telemetry unhealthy + kong + cache healthy`. That case falls through to `unhealthy` + 503.

Introduced 2025-10-14 (`a2d6e7e5`) when telemetry sub-checks were folded into `allHealthy`.

## Design

### Unified rule

The cache is the only true critical dependency.

- **503 + `unhealthy`** only when cache is `unhealthy` **and** no stale cache is available.
- Otherwise **200**, with `status` string `healthy` when every dep is fully healthy, else `degraded`.

This reflects the production reality of the service:
- Kong outage: cached consumer secrets still serve. Service stays in rotation.
- Telemetry outage: token generation is unaffected. Service stays in rotation.
- Primary cache outage with stale fallback: existing consumers still authenticate. Service stays in rotation.
- Primary cache outage with no stale fallback: service can't read consumer secrets. Pull from rotation.

### Truth table

| kong | cache.status | staleCacheAvailable | telemetry (all three) | HTTP | `status` string |
|------|--------------|---------------------|------------------------|------|-----------------|
| ✓ | healthy | — | all ✓ | 200 | `healthy` |
| ✓ | healthy | — | any ✗ | 200 | `degraded` |
| ✓ | degraded | — | any | 200 | `degraded` |
| ✓ | unhealthy | true | any | 200 | `degraded` |
| ✓ | unhealthy | false | any | 503 | `unhealthy` |
| ✗ | healthy | — | any | 200 | `degraded` |
| ✗ | degraded | — | any | 200 | `degraded` |
| ✗ | unhealthy | true | any | 200 | `degraded` |
| ✗ | unhealthy | false | any | 503 | `unhealthy` |

`staleCacheAvailable` is only consulted when `cache.status === "unhealthy"`. When `cache.status === "degraded"`, the cache layer is already serving from stale and the field is informational.

### Module shape

**New file:** `src/handlers/health-status.ts` — sibling of `health.ts` containing one exported pure function.

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

**Rationale:**
- Sibling file keeps `health.ts` (currently 810 lines) focused on probe orchestration.
- Pure function with a narrow deps shape is exhaustively testable in milliseconds without mocking Kong, Redis, or OTLP probes.
- Future migration to `/health/ready` (Option B follow-up) is a one-call-site change.

### Call-site changes in `src/handlers/health.ts`

Replace lines 278-301 with:

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

Plus one new import at the top of `health.ts`:

```ts
import { determineHealthStatus } from "./health-status";
```

**What goes away:**
- Intermediate `allHealthy` and `telemetryHealthy` locals (the rule owns them now)
- The `if/else if/else` block at lines 291-301
- The `cacheHealthy` derivation at line 278 (folded into the deps object)

**What stays exactly as is:**
- The full `healthData.dependencies.{kong, cache, telemetry}.*` payload built later in the handler. Operators still see `telemetry.traces.status: "unhealthy"` in the body.
- All probe code that runs before line 278 — Kong probe, cache probe, telemetry probe, circuit-breaker stats.
- DNS cache stats, response-time formatting, JSON serialization.

**Compatibility:** Response body shape is byte-identical except for the value of the top-level `status` field. Same JSON keys, same nesting, same types. Anything consuming the body keeps working; only the HTTP code semantics change, which is the entire point.

### Side effects

The probes still run; their results still feed the dependencies block. We only change the interpretation step. No behavior change for telemetry export tracking, circuit-breaker observation, or logging.

## Testing strategy

### TDD order

1. Write `test/bun/handlers/health-status.test.ts` first. Run it. All tests fail (no implementation).
2. Implement `src/handlers/health-status.ts`. Re-run; all cases pass.
3. Wire `determineHealthStatus` into `src/handlers/health.ts`. Run existing health test files; observe breakage.
4. Update broken assertions one file at a time, re-running after each.
5. Run full `bun test`. Confirm 3211/0.
6. Run k6 health smoke against the live server with OTLP collector down. Confirm 200 + degraded.

### Test files

| File | Status | Approximate scope |
|------|--------|-------------------|
| `test/bun/handlers/health-status.test.ts` | **new** | One case per truth-table row (9 rows). Plus partial-telemetry cases where one of the three sub-checks is unhealthy (3 cases). Plus edge cases on `staleCacheAvailable` reads when cache is `healthy`/`degraded` (the field should be ignored — 2 cases). Total ~14 cases. |
| `test/bun/health/health-handlers.test.ts` | update | 4-6 tests change status/string assertions |
| `test/bun/health/health.mutation.test.ts` | update | 3-5 tests change status code assertions |
| `test/bun/health/health-branches.test.ts` | update | 2-4 tests; some branches collapse into the new function |
| `test/bun/health/health-telemetry-branches.test.ts` | update | 1-2 tests on overall status |
| `test/bun/mutation/mutation-killer.test.ts` | update | line 493 strict status structure |
| `test/bun/health/health-fetch-spy.test.ts` | maybe | 0-1 tests; mostly probe-target related |
| `test/integration/circuit-breaker.integration.test.ts` | update | 3 tests; depends on what they actually assert |
| `test/k6/smoke/health-only-smoke.ts` | **no change** | currently asserts 200; will pass automatically post-fix |

Test updates are mechanical: where a test asserts `expect(status).toBe(503)` for a telemetry-down-but-kong-cache-up scenario, change to `expect(status).toBe(200)` and `expect(body.status).toBe("degraded")`.

### What is NOT changing in tests

- Live integration tests against real Kong/Redis
- Chaos tests
- Token-generation tests
- E2E tests

## Acceptance criteria

- [ ] `GET /health` returns **200 + `status: "degraded"`** when Kong + cache are healthy but any telemetry sub-check (traces/metrics/logs) is unhealthy
- [ ] `GET /health` returns **200 + `status: "degraded"`** when cache is `unhealthy` but `staleCache.available === true`
- [ ] `GET /health` returns **503 + `status: "unhealthy"`** only when cache is `unhealthy` and `staleCache.available === false`
- [ ] `GET /health` returns **200 + `status: "healthy"`** when all dependencies are healthy (no change)
- [ ] Full `dependencies` block in the response body is unchanged — `telemetry.{traces,metrics,logs}.status` still reports actual state
- [ ] All 11 currently-failing health unit tests pass against the new behavior
- [ ] k6 health smoke (`test:k6:smoke:health`) passes when OTLP collector is offline
- [ ] Documentation updated: `docs/operations/troubleshooting.md` (or equivalent) reflects tiered semantics; `docs/operations/sla.md` SLA monitoring section notes that a 200+degraded response is still passing

## Out of scope

- **Option B follow-up:** Splitting into `/health/live` (always 200), `/health/ready` (critical deps only), `/health/detailed` (full dependency payload) per Kubernetes convention. Tracked separately if needed.
- Per-environment health policies (dev-relaxed vs. prod-strict). YAGNI.
- Changes to probe implementations (Kong, cache, telemetry probes).

## Evidence

- k6 tokens smoke run on Bun 1.3.14: 1728/1728 checks passed, p99=17.47ms, while `/health` returned 503.
- Direct probe: `curl http://localhost:4318/v1/traces` → connection refused (no OTLP collector running).
- `curl http://localhost:3000/health` payload shows `kong: healthy`, `cache.connection.connected: true`, `telemetry.{traces,metrics,logs}: unhealthy`.
- 11 pre-existing health unit-test failures on master all share this root cause.
