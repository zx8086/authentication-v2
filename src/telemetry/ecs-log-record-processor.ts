// src/telemetry/ecs-log-record-processor.ts

import type { Context } from "@opentelemetry/api";
import type { LogRecordProcessor, SdkLogRecord } from "@opentelemetry/sdk-logs";

/**
 * ECS metadata keys injected by @elastic/ecs-pino-format and PinoAdapter's
 * trace mixin that duplicate fields already present in OTel Resource,
 * LogRecord metadata, or Elasticsearch's standard ECS mapping.
 *
 * These leak into Elasticsearch labels.* via OTelPinoStream because it only
 * strips standard Pino keys (time, level, hostname, pid, trace_id, span_id,
 * trace_flags), not the ECS dot-notation equivalents.
 */
const ECS_REDUNDANT_KEYS: ReadonlySet<string> = new Set([
  // ECS metadata (from @elastic/ecs-pino-format formatters.bindings/log)
  "ecs.version",
  "event.dataset",
  "event.message",
  "event.duration_ms",

  // Service fields (duplicate of OTel Resource service.*)
  "service.name",
  "service.version",
  "service.environment",
  "service.node.name",

  // Process/host fields (duplicate of OTel Resource process.*/host.*)
  "process.pid",
  "host.hostname",

  // Logger metadata (low-value ECS field)
  "log.logger",

  // Severity (redundant with LogRecord.severityText)
  "log.level",

  // Timestamp (redundant with LogRecord.hrTime)
  "@timestamp",

  // Trace context (redundant with LogRecord.spanContext from OTel correlation)
  "trace.id",
  "span.id",
  "transaction.id",
]);

/**
 * Custom LogRecordProcessor that cleans OTel log records before export.
 *
 * Solves two issues introduced when OTLP export was delegated to
 * PinoInstrumentation's OTelPinoStream (commit bb6516d):
 *
 * 1. Strips ECS metadata attributes that duplicate OTel Resource/LogRecord
 *    fields, preventing bloated labels.* in Elasticsearch.
 *
 * 2. Renames "span.event" to "event_name" to avoid ECS span.* namespace
 *    collision that causes event/message field swapping in Elasticsearch.
 *
 * Wraps a delegate processor (typically BatchLogRecordProcessor) and
 * modifies log records during the mutable onEmit phase before forwarding.
 */
export class EcsLogRecordProcessor implements LogRecordProcessor {
  constructor(private readonly delegate: LogRecordProcessor) {}

  onEmit(logRecord: SdkLogRecord, context?: Context): void {
    const attrs = logRecord.attributes as Record<string, unknown>;

    for (const key of ECS_REDUNDANT_KEYS) {
      if (key in attrs) {
        delete attrs[key];
      }
    }

    // Rename span.event to event_name to avoid ECS namespace collision
    if ("span.event" in attrs) {
      attrs.event_name = attrs["span.event"];
      delete attrs["span.event"];
    }

    this.delegate.onEmit(logRecord, context);
  }

  forceFlush(): Promise<void> {
    return this.delegate.forceFlush();
  }

  shutdown(): Promise<void> {
    return this.delegate.shutdown();
  }
}
