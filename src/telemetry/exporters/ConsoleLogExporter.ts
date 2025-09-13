/* src/telemetry/exporters/ConsoleLogExporter.ts */

import { ExportResult, ExportResultCode } from "@opentelemetry/core";
import { LogRecordExporter, ReadableLogRecord } from "@opentelemetry/sdk-logs";
import { logger } from "../../utils/logger";

export class ConsoleLogExporter implements LogRecordExporter {
  export(logs: ReadableLogRecord[], resultCallback: (result: ExportResult) => void): void {
    try {
      logs.forEach(log => {
        const logData = {
          timestamp: new Date(log.hrTime[0] * 1000 + log.hrTime[1] / 1000000).toISOString(),
          traceId: log.spanContext?.traceId,
          spanId: log.spanContext?.spanId,
          severityText: log.severityText,
          severityNumber: log.severityNumber,
          body: log.body,
          attributes: log.attributes,
          resource: log.resource?.attributes
        };

        logger.info("OpenTelemetry Logs", {
          'telemetry.signal': 'logs',
          'log.record': logData
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