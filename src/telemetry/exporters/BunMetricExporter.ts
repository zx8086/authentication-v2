/* src/telemetry/exporters/BunMetricExporter.ts */

import { ExportResult, ExportResultCode } from "@opentelemetry/core";
import { PushMetricExporter, ResourceMetrics } from "@opentelemetry/sdk-metrics";

export class BunMetricExporter implements PushMetricExporter {
  private url: string;
  private timeoutMillis: number;

  constructor(config: { url: string; timeoutMillis?: number }) {
    this.url = config.url;
    this.timeoutMillis = config.timeoutMillis || 10000;
  }

  async export(metrics: ResourceMetrics, resultCallback: (result: ExportResult) => void): Promise<void> {
    try {
      const payload = this.serializeMetrics(metrics);
      
      const response = await fetch(this.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(this.timeoutMillis),
      });

      if (response.ok) {
        resultCallback({ code: ExportResultCode.SUCCESS });
      } else {
        resultCallback({ 
          code: ExportResultCode.FAILED,
          error: new Error(`HTTP ${response.status}: ${response.statusText}`)
        });
      }
    } catch (error) {
      resultCallback({
        code: ExportResultCode.FAILED,
        error: error as Error,
      });
    }
  }

  async shutdown(): Promise<void> {
    // Simple shutdown
  }

  async forceFlush(): Promise<void> {
    // Simple flush
  }

  private serializeMetrics(metrics: ResourceMetrics): any {
    return {
      resourceMetrics: [
        {
          resource: {
            attributes: this.serializeAttributes(metrics.resource.attributes),
          },
          scopeMetrics: metrics.scopeMetrics.map(scopeMetric => ({
            scope: {
              name: scopeMetric.scope.name,
              version: scopeMetric.scope.version,
            },
            metrics: scopeMetric.metrics.map(metric => this.serializeMetric(metric)),
          })),
        },
      ],
    };
  }

  private serializeMetric(metric: any): any {
    const baseMetric = {
      name: metric.descriptor.name,
      description: metric.descriptor.description,
      unit: metric.descriptor.unit,
    };

    // Check metric type and serialize accordingly
    if (metric.descriptor.type === 'HISTOGRAM') {
      return {
        ...baseMetric,
        histogram: {
          dataPoints: metric.dataPoints.map((dp: any) => ({
            attributes: this.serializeAttributes(dp.attributes),
            startTimeUnixNano: (dp.startTime[0] * 1e9 + dp.startTime[1]).toString(),
            timeUnixNano: (dp.endTime[0] * 1e9 + dp.endTime[1]).toString(),
            count: dp.value.count?.toString() || '0',
            sum: dp.value.sum || 0,
            bucketCounts: dp.value.buckets?.counts || [],
            explicitBounds: dp.value.buckets?.boundaries || [],
          })),
        },
      };
    } else {
      // Default to sum for counters and other types
      return {
        ...baseMetric,
        sum: {
          dataPoints: metric.dataPoints.map((dp: any) => ({
            attributes: this.serializeAttributes(dp.attributes),
            startTimeUnixNano: (dp.startTime[0] * 1e9 + dp.startTime[1]).toString(),
            timeUnixNano: (dp.endTime[0] * 1e9 + dp.endTime[1]).toString(),
            asDouble: dp.value,
          })),
          aggregationTemporality: 2, // AGGREGATION_TEMPORALITY_DELTA
          isMonotonic: true,
        },
      };
    }
  }

  private serializeAttributes(attributes: any): any[] {
    return Object.entries(attributes).map(([key, value]) => ({
      key,
      value: { stringValue: String(value) },
    }));
  }
}
