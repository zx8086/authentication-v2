/* src/telemetry/exporters/ConsoleTraceExporter.ts */

import { ExportResult, ExportResultCode } from "@opentelemetry/core";
import { ReadableSpan, SpanExporter } from "@opentelemetry/sdk-trace-base";
import { logger } from "../../utils/logger";

export class ConsoleTraceExporter implements SpanExporter {
  export(spans: ReadableSpan[], resultCallback: (result: ExportResult) => void): void {
    try {
      spans.forEach(span => {
        const spanData = {
          traceId: span.spanContext().traceId,
          spanId: span.spanContext().spanId,
          parentSpanId: span.parentSpanId || undefined,
          name: span.name,
          kind: span.kind,
          startTime: new Date(span.startTime[0] * 1000 + span.startTime[1] / 1000000).toISOString(),
          endTime: new Date(span.endTime[0] * 1000 + span.endTime[1] / 1000000).toISOString(),
          duration: (span.endTime[0] - span.startTime[0]) * 1000 + (span.endTime[1] - span.startTime[1]) / 1000000,
          attributes: span.attributes,
          status: span.status,
          resource: span.resource?.attributes
        };

        logger.info("OpenTelemetry Trace", {
          'telemetry.signal': 'trace',
          'trace.span': spanData
        });
      });

      resultCallback({ code: ExportResultCode.SUCCESS });
    } catch (error) {
      resultCallback({ code: ExportResultCode.FAILED, error: error as Error });
    }
  }

  async shutdown(): Promise<void> {
    // No-op for console
  }

  async forceFlush(): Promise<void> {
    // No-op for console
  }
}