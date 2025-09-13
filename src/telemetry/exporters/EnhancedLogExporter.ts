/* src/telemetry/exporters/EnhancedLogExporter.ts */

import { ExportResult, ExportResultCode } from "@opentelemetry/core";
import { LogRecordExporter, ReadableLogRecord } from "@opentelemetry/sdk-logs";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";

export class EnhancedLogExporter implements LogRecordExporter {
  private exporter: OTLPLogExporter;
  private url: string;

  constructor(config: { url: string; timeoutMillis?: number }) {
    this.url = config.url;
    this.exporter = new OTLPLogExporter({
      url: config.url,
      timeoutMillis: config.timeoutMillis || 10000,
    });
  }

  export(logs: ReadableLogRecord[], resultCallback: (result: ExportResult) => void): void {
    console.log(`BunLogExporter: Exporting ${logs.length} logs to ${this.url}`);
    
    this.exporter.export(logs, (result: ExportResult) => {
      console.log(`BunLogExporter: Export result:`, {
        code: result.code,
      });
      resultCallback(result);
    });
  }

  async shutdown(): Promise<void> {
    return this.exporter.shutdown();
  }

  async forceFlush(): Promise<void> {
    return this.exporter.forceFlush();
  }
}