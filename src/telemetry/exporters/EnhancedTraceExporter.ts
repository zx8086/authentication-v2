/* src/telemetry/exporters/EnhancedTraceExporter.ts */

import { ExportResult, ExportResultCode } from "@opentelemetry/core";
import { ReadableSpan, SpanExporter } from "@opentelemetry/sdk-trace-base";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";

export class EnhancedTraceExporter implements SpanExporter {
  private exporter: OTLPTraceExporter;
  private url: string;

  constructor(config: { url: string; timeoutMillis?: number }) {
    this.url = config.url;
    this.exporter = new OTLPTraceExporter({
      url: config.url,
      timeoutMillis: config.timeoutMillis || 10000,
    });
  }

  export(spans: ReadableSpan[], resultCallback: (result: ExportResult) => void): void {
    console.log(`BunTraceExporter: Exporting ${spans.length} spans to ${this.url}`);
    
    this.exporter.export(spans, (result: ExportResult) => {
      console.log(`BunTraceExporter: Export result:`, {
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