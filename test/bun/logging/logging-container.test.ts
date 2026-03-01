/* test/bun/logging/logging-container.test.ts */
/* SIO-447: Output verification tests for logging container and backend selection */

import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { PinoAdapter } from "../../../src/logging/adapters/pino.adapter";
import { WinstonAdapter } from "../../../src/logging/adapters/winston.adapter";
import { loggerContainer } from "../../../src/logging/container";
import type { ITelemetryLogger, LoggerConfig } from "../../../src/logging/ports/logger.port";

describe("Logging Container", () => {
  const originalEnv = process.env.LOGGING_BACKEND;

  beforeEach(() => {
    loggerContainer.reset();
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.LOGGING_BACKEND = originalEnv;
    } else {
      delete process.env.LOGGING_BACKEND;
    }
    loggerContainer.reset();
  });

  describe("Backend Selection", () => {
    it("should default to pino backend", () => {
      delete process.env.LOGGING_BACKEND;
      loggerContainer.reset();

      const backend = loggerContainer.getBackend();
      // SIO-447: Default changed to pino for performance (5-10x faster)
      expect(backend).toBe("pino");
    });

    it("should use pino backend when LOGGING_BACKEND=pino", () => {
      process.env.LOGGING_BACKEND = "pino";
      loggerContainer.reset();

      const backend = loggerContainer.getBackend();
      expect(backend).toBe("pino");
    });

    it("should use winston backend when LOGGING_BACKEND=winston", () => {
      process.env.LOGGING_BACKEND = "winston";
      loggerContainer.reset();

      const backend = loggerContainer.getBackend();
      expect(backend).toBe("winston");
    });

    it("should allow programmatic backend switch", () => {
      loggerContainer.setBackend("pino");
      expect(loggerContainer.getBackend()).toBe("pino");

      loggerContainer.setBackend("winston");
      expect(loggerContainer.getBackend()).toBe("winston");
    });
  });

  describe("Logger Instance", () => {
    it("should return ITelemetryLogger instance", () => {
      const logger = loggerContainer.getLogger();
      expect(logger).toBeDefined();

      // Verify ILogger methods
      expect(typeof logger.debug).toBe("function");
      expect(typeof logger.info).toBe("function");
      expect(typeof logger.warn).toBe("function");
      expect(typeof logger.error).toBe("function");
      expect(typeof logger.child).toBe("function");
      expect(typeof logger.flush).toBe("function");
      expect(typeof logger.reinitialize).toBe("function");

      // Verify ITelemetryLogger methods
      expect(typeof logger.logHttpRequest).toBe("function");
      expect(typeof logger.logAuthenticationEvent).toBe("function");
      expect(typeof logger.logKongOperation).toBe("function");
    });

    it("should return same instance on repeated calls", () => {
      const logger1 = loggerContainer.getLogger();
      const logger2 = loggerContainer.getLogger();

      expect(logger1).toBe(logger2);
    });

    it("should create new instance after backend switch", () => {
      loggerContainer.setBackend("winston");
      const logger1 = loggerContainer.getLogger();

      loggerContainer.setBackend("pino");
      const logger2 = loggerContainer.getLogger();

      expect(logger1).not.toBe(logger2);
    });

    it("should create new instance after reset", () => {
      const logger1 = loggerContainer.getLogger();
      loggerContainer.reset();
      const logger2 = loggerContainer.getLogger();

      expect(logger1).not.toBe(logger2);
    });
  });

  describe("Custom Logger Injection (Testing)", () => {
    it("should allow custom logger injection", () => {
      const mockLogger: ITelemetryLogger = {
        debug: () => {},
        info: () => {},
        warn: () => {},
        error: () => {},
        child: () => mockLogger,
        flush: async () => {},
        reinitialize: () => {},
        logHttpRequest: () => {},
        logAuthenticationEvent: () => {},
        logKongOperation: () => {},
      };

      loggerContainer.setLogger(mockLogger);
      const retrieved = loggerContainer.getLogger();

      expect(retrieved).toBe(mockLogger);
    });
  });
});

describe("PinoAdapter", () => {
  const testConfig: LoggerConfig = {
    level: "info",
    service: {
      name: "test-service",
      version: "1.0.0",
      environment: "test",
    },
    mode: "console",
  };

  it("should implement ITelemetryLogger interface", () => {
    const adapter = new PinoAdapter(testConfig);

    expect(typeof adapter.debug).toBe("function");
    expect(typeof adapter.info).toBe("function");
    expect(typeof adapter.warn).toBe("function");
    expect(typeof adapter.error).toBe("function");
    expect(typeof adapter.child).toBe("function");
    expect(typeof adapter.flush).toBe("function");
    expect(typeof adapter.reinitialize).toBe("function");
    expect(typeof adapter.logHttpRequest).toBe("function");
    expect(typeof adapter.logAuthenticationEvent).toBe("function");
    expect(typeof adapter.logKongOperation).toBe("function");
  });

  it("should create child logger with bound context", () => {
    const adapter = new PinoAdapter(testConfig);
    const childLogger = adapter.child({ requestId: "req-123" });

    expect(childLogger).toBeDefined();
    expect(typeof childLogger.info).toBe("function");
    expect(typeof childLogger.child).toBe("function");
  });

  it("should support nested child loggers", () => {
    const adapter = new PinoAdapter(testConfig);
    const child1 = adapter.child({ level1: "a" });
    const child2 = child1.child({ level2: "b" });

    expect(child2).toBeDefined();
    expect(typeof child2.info).toBe("function");
  });
});

describe("WinstonAdapter", () => {
  const testConfig: LoggerConfig = {
    level: "info",
    service: {
      name: "test-service",
      version: "1.0.0",
      environment: "test",
    },
    mode: "console",
  };

  it("should implement ITelemetryLogger interface", () => {
    const adapter = new WinstonAdapter(testConfig);

    expect(typeof adapter.debug).toBe("function");
    expect(typeof adapter.info).toBe("function");
    expect(typeof adapter.warn).toBe("function");
    expect(typeof adapter.error).toBe("function");
    expect(typeof adapter.child).toBe("function");
    expect(typeof adapter.flush).toBe("function");
    expect(typeof adapter.reinitialize).toBe("function");
    expect(typeof adapter.logHttpRequest).toBe("function");
    expect(typeof adapter.logAuthenticationEvent).toBe("function");
    expect(typeof adapter.logKongOperation).toBe("function");
  });

  it("should create child logger with bound context", () => {
    const adapter = new WinstonAdapter(testConfig);
    const childLogger = adapter.child({ requestId: "req-456" });

    expect(childLogger).toBeDefined();
    expect(typeof childLogger.info).toBe("function");
    expect(typeof childLogger.child).toBe("function");
  });

  it("should support nested child loggers", () => {
    const adapter = new WinstonAdapter(testConfig);
    const child1 = adapter.child({ level1: "x" });
    const child2 = child1.child({ level2: "y" });

    expect(child2).toBeDefined();
    expect(typeof child2.info).toBe("function");
  });
});

describe("Backend Parity", () => {
  const testConfig: LoggerConfig = {
    level: "info",
    service: {
      name: "parity-test-service",
      version: "2.0.0",
      environment: "test",
    },
    mode: "console",
  };

  it("should have identical method signatures", () => {
    const pino = new PinoAdapter(testConfig);
    const winston = new WinstonAdapter(testConfig);

    const pinoMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(pino));
    const winstonMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(winston));

    // Both should have ILogger methods
    const requiredMethods = [
      "debug",
      "info",
      "warn",
      "error",
      "child",
      "flush",
      "reinitialize",
      "logHttpRequest",
      "logAuthenticationEvent",
      "logKongOperation",
    ];

    for (const method of requiredMethods) {
      expect(pinoMethods).toContain(method);
      expect(winstonMethods).toContain(method);
    }
  });

  it("should both support child logger creation", () => {
    const pino = new PinoAdapter(testConfig);
    const winston = new WinstonAdapter(testConfig);

    const pinoChild = pino.child({ test: "pino" });
    const winstonChild = winston.child({ test: "winston" });

    expect(typeof pinoChild.info).toBe("function");
    expect(typeof winstonChild.info).toBe("function");
  });
});
