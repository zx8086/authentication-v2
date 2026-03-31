// test/bun/telemetry/ecs-log-record-processor.test.ts

import { describe, expect, it, mock } from "bun:test";
import type { Context } from "@opentelemetry/api";
import type { LogRecordProcessor, SdkLogRecord } from "@opentelemetry/sdk-logs";
import { EcsLogRecordProcessor } from "../../../src/telemetry/ecs-log-record-processor";

function createMockLogRecord(attributes: Record<string, unknown>): SdkLogRecord {
  return {
    attributes,
    body: "Test log message",
    severityText: "INFO",
    severityNumber: 9,
  } as unknown as SdkLogRecord;
}

function createMockDelegate(): LogRecordProcessor & {
  onEmitCalls: Array<{ logRecord: SdkLogRecord; context?: Context }>;
} {
  const onEmitCalls: Array<{ logRecord: SdkLogRecord; context?: Context }> = [];
  return {
    onEmitCalls,
    onEmit: mock((logRecord: SdkLogRecord, context?: Context) => {
      onEmitCalls.push({ logRecord, context });
    }),
    forceFlush: mock(() => Promise.resolve()),
    shutdown: mock(() => Promise.resolve()),
  };
}

describe("EcsLogRecordProcessor", () => {
  describe("ECS metadata stripping", () => {
    it("should strip all ECS redundant keys from attributes", () => {
      const delegate = createMockDelegate();
      const processor = new EcsLogRecordProcessor(delegate);

      const attrs: Record<string, unknown> = {
        "ecs.version": "8.11.0",
        "service.name": "authentication-service",
        "service.version": "2.6.8",
        "service.environment": "local",
        "service.node.name": "test-node",
        "event.dataset": "authentication-service",
        "event.message": "JWT token generated successfully",
        "event.duration_ms": 3.5,
        "process.pid": 12345,
        "host.hostname": "test-host",
        "log.logger": "pino",
        "log.level": "info",
        "@timestamp": "2026-03-31T08:00:00.000Z",
        "trace.id": "abc123",
        "span.id": "def456",
        "transaction.id": "abc123",
        consumer_id: "test-consumer",
        username: "test-user",
      };

      const logRecord = createMockLogRecord(attrs);
      processor.onEmit(logRecord);

      expect(attrs["ecs.version"]).toBeUndefined();
      expect(attrs["service.name"]).toBeUndefined();
      expect(attrs["service.version"]).toBeUndefined();
      expect(attrs["service.environment"]).toBeUndefined();
      expect(attrs["service.node.name"]).toBeUndefined();
      expect(attrs["event.dataset"]).toBeUndefined();
      expect(attrs["event.message"]).toBeUndefined();
      expect(attrs["event.duration_ms"]).toBeUndefined();
      expect(attrs["process.pid"]).toBeUndefined();
      expect(attrs["host.hostname"]).toBeUndefined();
      expect(attrs["log.logger"]).toBeUndefined();
      expect(attrs["log.level"]).toBeUndefined();
      expect(attrs["@timestamp"]).toBeUndefined();
      expect(attrs["trace.id"]).toBeUndefined();
      expect(attrs["span.id"]).toBeUndefined();
      expect(attrs["transaction.id"]).toBeUndefined();
    });

    it("should preserve business-logic attributes", () => {
      const delegate = createMockDelegate();
      const processor = new EcsLogRecordProcessor(delegate);

      const attrs: Record<string, unknown> = {
        "ecs.version": "8.11.0",
        "log.level": "info",
        consumer_id: "f48534e1-4caf-4106-9103-edf38eae7ebc",
        username: "test-consumer-001",
        request_id: "26dd3a9e-6c86-404f-b54e-029bacc12695",
        duration_ms: 3.305,
      };

      const logRecord = createMockLogRecord(attrs);
      processor.onEmit(logRecord);

      expect(attrs.consumer_id).toBe("f48534e1-4caf-4106-9103-edf38eae7ebc");
      expect(attrs.username).toBe("test-consumer-001");
      expect(attrs.request_id).toBe("26dd3a9e-6c86-404f-b54e-029bacc12695");
      expect(attrs.duration_ms).toBe(3.305);
    });

    it("should handle records without any ECS keys", () => {
      const delegate = createMockDelegate();
      const processor = new EcsLogRecordProcessor(delegate);

      const attrs: Record<string, unknown> = {
        consumer_id: "test",
        operation: "auth",
      };

      const logRecord = createMockLogRecord(attrs);
      processor.onEmit(logRecord);

      expect(attrs.consumer_id).toBe("test");
      expect(attrs.operation).toBe("auth");
      expect(Object.keys(attrs)).toHaveLength(2);
    });

    it("should handle records with empty attributes", () => {
      const delegate = createMockDelegate();
      const processor = new EcsLogRecordProcessor(delegate);

      const attrs: Record<string, unknown> = {};
      const logRecord = createMockLogRecord(attrs);

      processor.onEmit(logRecord);

      expect(Object.keys(attrs)).toHaveLength(0);
    });
  });

  describe("span.event rename", () => {
    it("should rename span.event to event_name", () => {
      const delegate = createMockDelegate();
      const processor = new EcsLogRecordProcessor(delegate);

      const attrs: Record<string, unknown> = {
        "span.event": "token.request.success",
        consumer_id: "test",
      };

      const logRecord = createMockLogRecord(attrs);
      processor.onEmit(logRecord);

      expect(attrs["span.event"]).toBeUndefined();
      expect(attrs.event_name).toBe("token.request.success");
      expect(attrs.consumer_id).toBe("test");
    });

    it("should not add event_name when span.event is absent", () => {
      const delegate = createMockDelegate();
      const processor = new EcsLogRecordProcessor(delegate);

      const attrs: Record<string, unknown> = {
        consumer_id: "test",
      };

      const logRecord = createMockLogRecord(attrs);
      processor.onEmit(logRecord);

      expect(attrs.event_name).toBeUndefined();
      expect(Object.keys(attrs)).toEqual(["consumer_id"]);
    });

    it("should handle both ECS stripping and span.event rename together", () => {
      const delegate = createMockDelegate();
      const processor = new EcsLogRecordProcessor(delegate);

      const attrs: Record<string, unknown> = {
        "ecs.version": "8.11.0",
        "service.name": "authentication-service",
        "log.level": "info",
        "span.event": "cache.hit",
        "trace.id": "abc123",
        "span.id": "def456",
        key: "consumer:123",
      };

      const logRecord = createMockLogRecord(attrs);
      processor.onEmit(logRecord);

      expect(Object.keys(attrs).sort()).toEqual(["event_name", "key"]);
      expect(attrs.event_name).toBe("cache.hit");
      expect(attrs.key).toBe("consumer:123");
    });
  });

  describe("body preservation", () => {
    it("should not modify the log record body", () => {
      const delegate = createMockDelegate();
      const processor = new EcsLogRecordProcessor(delegate);

      const logRecord = createMockLogRecord({
        "ecs.version": "8.11.0",
        "span.event": "test.event",
      });

      processor.onEmit(logRecord);

      expect(logRecord.body).toBe("Test log message");
    });
  });

  describe("delegation", () => {
    it("should forward onEmit to delegate", () => {
      const delegate = createMockDelegate();
      const processor = new EcsLogRecordProcessor(delegate);

      const logRecord = createMockLogRecord({ key: "value" });
      processor.onEmit(logRecord);

      expect(delegate.onEmitCalls).toHaveLength(1);
      expect(delegate.onEmitCalls[0].logRecord).toBe(logRecord);
    });

    it("should forward context to delegate", () => {
      const delegate = createMockDelegate();
      const processor = new EcsLogRecordProcessor(delegate);

      const logRecord = createMockLogRecord({});
      const ctx = {} as Context;
      processor.onEmit(logRecord, ctx);

      expect(delegate.onEmitCalls).toHaveLength(1);
      expect(delegate.onEmitCalls[0].context).toBe(ctx);
    });

    it("should delegate forceFlush", async () => {
      const delegate = createMockDelegate();
      const processor = new EcsLogRecordProcessor(delegate);

      await processor.forceFlush();

      expect(delegate.forceFlush).toHaveBeenCalledTimes(1);
    });

    it("should delegate shutdown", async () => {
      const delegate = createMockDelegate();
      const processor = new EcsLogRecordProcessor(delegate);

      await processor.shutdown();

      expect(delegate.shutdown).toHaveBeenCalledTimes(1);
    });
  });
});
