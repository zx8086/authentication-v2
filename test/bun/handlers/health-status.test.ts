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

  test("cache unhealthy, staleCacheAvailable=false -> 503 + unhealthy", () => {
    expect(
      determineHealthStatus(
        baseDeps({ cache: { status: "unhealthy", staleCacheAvailable: false } })
      )
    ).toEqual({ httpStatus: 503, healthStatus: "unhealthy" });
  });

  test("cache unhealthy, staleCacheAvailable=true -> 200 + degraded", () => {
    expect(
      determineHealthStatus(baseDeps({ cache: { status: "unhealthy", staleCacheAvailable: true } }))
    ).toEqual({ httpStatus: 200, healthStatus: "degraded" });
  });

  test("cache degraded -> 200 + degraded (staleCacheAvailable irrelevant)", () => {
    expect(
      determineHealthStatus(baseDeps({ cache: { status: "degraded", staleCacheAvailable: false } }))
    ).toEqual({ httpStatus: 200, healthStatus: "degraded" });
    expect(
      determineHealthStatus(baseDeps({ cache: { status: "degraded", staleCacheAvailable: true } }))
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
    expect(determineHealthStatus(baseDeps({ kong: { healthy: false } }))).toEqual({
      httpStatus: 200,
      healthStatus: "degraded",
    });
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
      determineHealthStatus(baseDeps({ cache: { status: "healthy", staleCacheAvailable: true } }))
    ).toEqual({ httpStatus: 200, healthStatus: "healthy" });
  });
});
