/* src/telemetry/SimpleSmartSampler.ts */

// Simple Smart Sampler from the working implementation guide
import {
  type Attributes,
  type Context,
  type Link,
  type Sampler,
  SamplingDecision,
  type SamplingResult,
  type SpanKind,
} from "@opentelemetry/api";

export interface SimpleSmartSamplingConfig {
  traces: number;
  metrics: number;
  logs: number;
  preserveErrors: boolean;
  costOptimizationMode: boolean;
  healthCheckSampling: number;
}

export class SimpleSmartSampler implements Sampler {
  private readonly config: SimpleSmartSamplingConfig;

  constructor(config: SimpleSmartSamplingConfig) {
    this.config = config;
  }

  shouldSample(
    _context: Context,
    _traceId: string,
    spanName: string,
    _spanKind: SpanKind,
    attributes: Attributes,
    _links: Link[]
  ): SamplingResult {
    const decision = this.shouldSampleTrace(spanName, attributes);

    return {
      decision: decision.shouldSample ? SamplingDecision.RECORD_AND_SAMPLED : SamplingDecision.NOT_RECORD,
      attributes: decision.shouldSample ? {
        "sampling.signal_type": "trace",
        "sampling.rate": decision.samplingRate,
        "sampling.reason": decision.reason,
      } : undefined,
    };
  }

  shouldSampleTrace(spanName: string, attributes?: Attributes): {
    shouldSample: boolean;
    samplingRate: number;
    reason: string;
  } {
    // Always preserve errors
    if (this.config.preserveErrors && this.isErrorTrace(attributes)) {
      return {
        shouldSample: true,
        samplingRate: 1.0,
        reason: 'error_preservation',
      };
    }

    // Reduce health check noise
    if (this.isHealthCheckTrace(spanName, attributes)) {
      return {
        shouldSample: Math.random() < this.config.healthCheckSampling,
        samplingRate: this.config.healthCheckSampling,
        reason: 'health_check_sampling',
      };
    }

    // Standard sampling
    return {
      shouldSample: Math.random() < this.config.traces,
      samplingRate: this.config.traces,
      reason: 'standard_trace_sampling',
    };
  }

  private isErrorTrace(attributes?: Attributes): boolean {
    if (!attributes) return false;

    const httpStatusCode = attributes['http.status_code'];
    const hasError = attributes.error === true;
    const errorMessage = attributes['error.message'];

    return hasError ||
           (httpStatusCode && Number(httpStatusCode) >= 400) ||
           (errorMessage !== undefined);
  }

  private isHealthCheckTrace(spanName: string, attributes?: Attributes): boolean {
    const healthIndicators = ['/health', 'health-check', 'healthz', 'liveness', 'readiness'];

    if (healthIndicators.some(indicator => spanName.toLowerCase().includes(indicator))) {
      return true;
    }

    const httpRoute = attributes?.['http.route'] || attributes?.['http.target'];
    if (httpRoute && healthIndicators.some(indicator => String(httpRoute).toLowerCase().includes(indicator))) {
      return true;
    }

    return false;
  }
}