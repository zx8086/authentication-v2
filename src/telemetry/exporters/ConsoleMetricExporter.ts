/* src/telemetry/exporters/ConsoleMetricExporter.ts */

import { ExportResult, ExportResultCode } from "@opentelemetry/core";
import { PushMetricExporter, ResourceMetrics } from "@opentelemetry/sdk-metrics";
import { logger } from "../../utils/logger";

export class ConsoleMetricExporter implements PushMetricExporter {
  export(metrics: ResourceMetrics, resultCallback: (result: ExportResult) => void): void {
    try {
      const metricData = {
        resource: metrics.resource.attributes,
        scopeMetrics: metrics.scopeMetrics.map(scope => ({
          scope: {
            name: scope.scope.name,
            version: scope.scope.version
          },
          metrics: scope.metrics.map(metric => ({
            descriptor: metric.descriptor,
            dataPointType: metric.dataPointType,
            dataPoints: metric.dataPoints.map(dp => ({
              attributes: dp.attributes,
              startTime: new Date(dp.startTime).toISOString(),
              endTime: new Date(dp.endTime).toISOString(),
              value: dp.value
            }))
          }))
        }))
      };

      logger.info("OpenTelemetry Metrics", {
        'telemetry.signal': 'metrics',
        'metrics.data': metricData
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