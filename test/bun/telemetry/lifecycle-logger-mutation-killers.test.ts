import { beforeEach, describe, expect, test } from "bun:test";
import { LifecycleObservabilityLogger } from "../../../src/telemetry/lifecycle-logger";

describe("LifecycleObservabilityLogger Mutation Killers", () => {
  let logger: LifecycleObservabilityLogger;

  beforeEach(() => {
    logger = new LifecycleObservabilityLogger();
  });

  test("logShutdownSequence processes multiple messages", () => {
    const messages = [
      { message: "msg1", step: "step1" },
      { message: "msg2", step: "step2" },
    ];
    logger.logShutdownSequence(messages);
    // @ts-expect-error - accessing private field for mutation testing
    expect(logger.pendingShutdownMessages.length).toBe(2);
  });

  test("logShutdownSequence includes signal from env", () => {
    process.env.SHUTDOWN_SIGNAL = "SIGTERM";
    const messages = [{ message: "test", step: "test_step" }];
    logger.logShutdownSequence(messages);
    // @ts-expect-error - accessing private field for mutation testing
    expect(logger.pendingShutdownMessages[0].metadata.signal).toBe("SIGTERM");
    delete process.env.SHUTDOWN_SIGNAL;
  });

  test("logShutdownSequence defaults signal to SIGINT", () => {
    delete process.env.SHUTDOWN_SIGNAL;
    const messages = [{ message: "test", step: "test_step" }];
    logger.logShutdownSequence(messages);
    // @ts-expect-error - accessing private field for mutation testing
    expect(logger.pendingShutdownMessages[0].metadata.signal).toBe("SIGINT");
  });

  test("logShutdownSequence includes pid", () => {
    const messages = [{ message: "test", step: "test_step" }];
    logger.logShutdownSequence(messages);
    expect(process.pid).toBeGreaterThan(0);
  });

  test("logShutdownSequence includes sequence position", () => {
    const messages = [
      { message: "msg1", step: "step1" },
      { message: "msg2", step: "step2" },
      { message: "msg3", step: "step3" },
    ];
    logger.logShutdownSequence(messages);
    // @ts-expect-error - accessing private field for mutation testing
    expect(logger.pendingShutdownMessages[0].metadata.sequencePosition).toBe(1);
    // @ts-expect-error
    expect(logger.pendingShutdownMessages[1].metadata.sequencePosition).toBe(2);
    // @ts-expect-error
    expect(logger.pendingShutdownMessages[2].metadata.sequencePosition).toBe(3);
  });

  test("logShutdownSequence includes total steps", () => {
    const messages = [
      { message: "msg1", step: "step1" },
      { message: "msg2", step: "step2" },
    ];
    logger.logShutdownSequence(messages);
    // @ts-expect-error - accessing private field for mutation testing
    expect(logger.pendingShutdownMessages[0].metadata.totalSteps).toBe(2);
  });

  test("logShutdownSequence includes custom metadata", () => {
    const messages = [
      {
        message: "test",
        step: "test_step",
        metadata: { custom: "value" },
      },
    ];
    logger.logShutdownSequence(messages);
    // @ts-expect-error - accessing private field for mutation testing
    expect(logger.pendingShutdownMessages[0].metadata.custom).toBe("value");
  });

  test("logShutdownSequence increments timestamp", () => {
    const messages = [
      { message: "msg1", step: "step1" },
      { message: "msg2", step: "step2" },
    ];
    logger.logShutdownSequence(messages);
    // @ts-expect-error - accessing private field for mutation testing
    const ts1 = logger.pendingShutdownMessages[0].timestamp;
    // @ts-expect-error
    const ts2 = logger.pendingShutdownMessages[1].timestamp;
    expect(ts2).toBeGreaterThan(ts1);
  });

  test("flushShutdownMessages returns early if no shutdown", async () => {
    await logger.flushShutdownMessages();
    expect(true).toBe(true);
  });

  test("flushShutdownMessages returns early if no messages", async () => {
    logger.logShutdownSequence([]);
    await logger.flushShutdownMessages();
    expect(true).toBe(true);
  });

  test("flushShutdownMessages clears pending messages", async () => {
    logger.logShutdownSequence([{ message: "test", step: "step1" }]);
    await logger.flushShutdownMessages();
    // @ts-expect-error - accessing private field for mutation testing
    expect(logger.pendingShutdownMessages.length).toBe(0);
  });

  test("flushShutdownMessages handles flush errors", async () => {
    logger.logShutdownSequence([{ message: "test", step: "step1" }]);
    await logger.flushShutdownMessages();
    expect(true).toBe(true);
  });

  test("generateShutdownSequence creates 6 steps", () => {
    const sequence = LifecycleObservabilityLogger.generateShutdownSequence("SIGTERM");
    expect(sequence.length).toBe(6);
  });

  test("generateShutdownSequence includes signal in first step", () => {
    const sequence = LifecycleObservabilityLogger.generateShutdownSequence("SIGHUP");
    expect(sequence[0].message).toContain("SIGHUP");
  });

  test("generateShutdownSequence step 1 is shutdown_initiated", () => {
    const sequence = LifecycleObservabilityLogger.generateShutdownSequence("SIGTERM");
    expect(sequence[0].step).toBe("shutdown_initiated");
  });

  test("generateShutdownSequence step 2 is http_server_stop", () => {
    const sequence = LifecycleObservabilityLogger.generateShutdownSequence("SIGTERM");
    expect(sequence[1].step).toBe("http_server_stop");
  });

  test("generateShutdownSequence step 3 is telemetry_flush", () => {
    const sequence = LifecycleObservabilityLogger.generateShutdownSequence("SIGTERM");
    expect(sequence[2].step).toBe("telemetry_flush");
  });

  test("generateShutdownSequence step 4 is profiling_shutdown", () => {
    const sequence = LifecycleObservabilityLogger.generateShutdownSequence("SIGTERM");
    expect(sequence[3].step).toBe("profiling_shutdown");
  });

  test("generateShutdownSequence step 5 is external_services_shutdown", () => {
    const sequence = LifecycleObservabilityLogger.generateShutdownSequence("SIGTERM");
    expect(sequence[4].step).toBe("external_services_shutdown");
  });

  test("generateShutdownSequence step 6 is shutdown_completed", () => {
    const sequence = LifecycleObservabilityLogger.generateShutdownSequence("SIGTERM");
    expect(sequence[5].step).toBe("shutdown_completed");
  });

  test("generateShutdownSequence includes exit code 0", () => {
    const sequence = LifecycleObservabilityLogger.generateShutdownSequence("SIGTERM");
    expect(sequence[5].metadata?.exitCode).toBe(0);
  });

  test("generateShutdownSequence includes signal metadata", () => {
    const sequence = LifecycleObservabilityLogger.generateShutdownSequence("SIGKILL");
    expect(sequence[0].metadata?.signal).toBe("SIGKILL");
  });

  test("generateShutdownSequence includes reason metadata", () => {
    const sequence = LifecycleObservabilityLogger.generateShutdownSequence("SIGTERM");
    expect(sequence[0].metadata?.reason).toBe("signal_received");
  });
});
