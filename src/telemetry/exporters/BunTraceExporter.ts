/* src/telemetry/exporters/BunTraceExporter.ts */

import { ExportResult, ExportResultCode, hrTimeToMicroseconds } from "@opentelemetry/core";
import { ReadableSpan, SpanExporter } from "@opentelemetry/sdk-trace-base";

export class BunTraceExporter implements SpanExporter {
  private url: string;
  private timeoutMillis: number;

  constructor(config: { url: string; timeoutMillis?: number }) {
    this.url = config.url;
    this.timeoutMillis = config.timeoutMillis || 10000;
  }

  export(spans: ReadableSpan[], resultCallback: (result: ExportResult) => void): void {
    console.log(`BunTraceExporter: Exporting ${spans.length} spans to ${this.url}`);
    this.sendSpans(spans)
      .then(result => {
        console.log(`BunTraceExporter: Export result:`, result);
        resultCallback(result);
      })
      .catch(error => {
        console.error(`BunTraceExporter: Export failed:`, error);
        resultCallback({ code: ExportResultCode.FAILED, error });
      });
  }

  private async sendSpans(spans: ReadableSpan[]): Promise<ExportResult> {
    try {
      const payload = this.serializeSpans(spans);
      
      const response = await fetch(this.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(this.timeoutMillis),
      });

      if (response.ok) {
        return { code: ExportResultCode.SUCCESS };
      } else {
        return { 
          code: ExportResultCode.FAILED,
          error: new Error(`HTTP ${response.status}: ${response.statusText}`)
        };
      }
    } catch (error) {
      return {
        code: ExportResultCode.FAILED,
        error: error as Error,
      };
    }
  }

  async shutdown(): Promise<void> {
    // Simple shutdown
  }

  async forceFlush(): Promise<void> {
    // Simple flush
  }

  private serializeSpans(spans: ReadableSpan[]): any {
    const resourceSpans = this.groupSpansByResource(spans);

    return {
      resourceSpans: resourceSpans.map((group) => ({
        resource: {
          attributes: this.serializeAttributes(group.resource.attributes),
        },
        scopeSpans: [{
          scope: {
            name: group.instrumentationLibrary?.name || "unknown",
            version: group.instrumentationLibrary?.version || "1.0.0",
          },
          spans: group.spans.map((span) => this.serializeSpan(span)),
        }],
      })),
    };
  }

  private serializeSpan(span: ReadableSpan): any {
    const startTimeUnixNano = hrTimeToMicroseconds(span.startTime) * 1000;
    const endTimeUnixNano = hrTimeToMicroseconds(span.endTime) * 1000;

    return {
      traceId: span.spanContext().traceId,
      spanId: span.spanContext().spanId,
      parentSpanId: span.parentSpanId || undefined,
      name: span.name,
      kind: span.kind,
      startTimeUnixNano: startTimeUnixNano.toString(),
      endTimeUnixNano: endTimeUnixNano.toString(),
      attributes: this.serializeAttributes(span.attributes),
      status: {
        code: span.status.code,
        message: span.status.message,
      },
      events: span.events.map((event) => ({
        timeUnixNano: (hrTimeToMicroseconds(event.time) * 1000).toString(),
        name: event.name,
        attributes: this.serializeAttributes(event.attributes || {}),
      })),
    };
  }

  private groupSpansByResource(spans: ReadableSpan[]): any[] {
    const groups = new Map();
    
    for (const span of spans) {
      const resourceKey = JSON.stringify(span.resource?.attributes || {});
      if (!groups.has(resourceKey)) {
        groups.set(resourceKey, {
          resource: span.resource || { attributes: {} },
          instrumentationLibrary: span.instrumentationLibrary,
          spans: [],
        });
      }
      groups.get(resourceKey).spans.push(span);
    }
    
    return Array.from(groups.values());
  }

  private serializeAttributes(attributes: any): any[] {
    return Object.entries(attributes).map(([key, value]) => ({
      key,
      value: { stringValue: String(value) },
    }));
  }
}