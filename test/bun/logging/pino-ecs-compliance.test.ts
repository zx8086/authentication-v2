// test/bun/logging/pino-ecs-compliance.test.ts
// Tests for Pino ECS Compliance - Dual Mode Output, OTLP delegation, trace mixin
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
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
    it("should output raw ECS JSON in production", () => {
      process.env.NODE_ENV = "production";
      const { PinoAdapter } = require("../../../src/logging/adapters/pino.adapter");
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

    it("should output one JSON object per line (NDJSON)", () => {
      process.env.NODE_ENV = "production";
      const { PinoAdapter } = require("../../../src/logging/adapters/pino.adapter");
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
    it("should output formatted console line in development", () => {
      process.env.NODE_ENV = "development";
      const { PinoAdapter } = require("../../../src/logging/adapters/pino.adapter");
      const adapter = new PinoAdapter(testConfig);

      adapter.info("Dev message", { component: "test" });

      const output = capturedOutput.join("");
      expect(output).toContain("info");
      expect(output).toContain("Dev message");
      expect(output).not.toContain('"@timestamp"');
      expect(output).not.toContain('"ecs.version"');
    });
  });

  describe("ECS Required Fields (Production)", () => {
    it("should have all ECS required fields", () => {
      process.env.NODE_ENV = "production";
      const { PinoAdapter } = require("../../../src/logging/adapters/pino.adapter");
      const adapter = new PinoAdapter(testConfig);

      adapter.info("Check fields");
      const parsed = JSON.parse(capturedOutput.join("").trim());

      expect(parsed["@timestamp"]).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(parsed["log.level"]).toBe("info");
      expect(parsed.message).toBe("Check fields");
      expect(parsed["ecs.version"]).toBe("8.10.0");
    });
  });

  describe("OTLP Emission", () => {
    it("should NOT have manual emitOtelLog method", () => {
      const { PinoAdapter } = require("../../../src/logging/adapters/pino.adapter");
      const adapter = new PinoAdapter(testConfig);

      expect((adapter as any).emitOtelLog).toBeUndefined();
    });
  });

  describe("Trace Correlation", () => {
    it("should NOT have captureTraceContext method", () => {
      const { PinoAdapter } = require("../../../src/logging/adapters/pino.adapter");
      const adapter = new PinoAdapter(testConfig);

      expect((adapter as any).captureTraceContext).toBeUndefined();
    });

    it("should not inject trace fields when no active span exists", () => {
      process.env.NODE_ENV = "production";
      const { PinoAdapter } = require("../../../src/logging/adapters/pino.adapter");
      const adapter = new PinoAdapter(testConfig);

      adapter.info("No trace context");
      const parsed = JSON.parse(capturedOutput.join("").trim());

      expect(parsed["trace.id"]).toBeUndefined();
      expect(parsed["span.id"]).toBeUndefined();
      expect(parsed["transaction.id"]).toBeUndefined();
    });
  });
});
