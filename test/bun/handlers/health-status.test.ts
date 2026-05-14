// test/bun/handlers/health-status.test.ts

import { describe, expect, test } from "bun:test";
import { determineHealthStatus, type HealthStatusDeps } from "../../../src/handlers/health-status";

// Overrides replace top-level keys wholesale; nested objects (e.g. telemetry) must be complete.
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
