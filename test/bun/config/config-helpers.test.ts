/* test/bun/config-helpers.test.ts */
/* cspell:disable */
/* trunk-ignore-all(trufflehog) - Test file uses example.com URLs, not real secrets */

import { describe, expect, it } from "bun:test";
import {
  createOtlpConfig,
  deriveAllOtlpEndpoints,
  deriveEndpoint,
  deriveEndpoints,
  deriveOtlpEndpoint,
  OTLP_STANDARD_PATHS,
  type OtlpEndpointConfig,
  type OtlpEndpoints,
  validateOtlpEndpoints,
} from "../../../src/config/helpers";

describe("Configuration Helpers", () => {
  describe("deriveEndpoint", () => {
    it("should return specific endpoint when provided", () => {
      const result = deriveEndpoint(
        "https://base.example.com",
        "https://specific.example.com/custom",
        "/default/path"
      );

      expect(result).toBe("https://specific.example.com/custom");
    });

    it("should derive endpoint from base and path suffix", () => {
      const result = deriveEndpoint("https://base.example.com", undefined, "/v1/traces");

      expect(result).toBe("https://base.example.com/v1/traces");
    });

    it("should handle base endpoint with trailing slash", () => {
      const result = deriveEndpoint("https://base.example.com/", undefined, "/v1/traces");

      expect(result).toBe("https://base.example.com/v1/traces");
    });

    it("should handle path suffix without leading slash", () => {
      const result = deriveEndpoint("https://base.example.com", undefined, "v1/traces");

      expect(result).toBe("https://base.example.com/v1/traces");
    });

    it("should return undefined when no base endpoint and no specific endpoint", () => {
      const result = deriveEndpoint(undefined, undefined, "/v1/traces");
      expect(result).toBeUndefined();
    });

    it("should handle empty string as base endpoint", () => {
      const result = deriveEndpoint("", undefined, "/v1/traces");
      expect(result).toBe("/v1/traces"); // Empty string baseEndpoint should return just the path
    });

    it("should handle complex URL paths", () => {
      const result = deriveEndpoint(
        "https://otel-collector.company.com:4318/otel",
        undefined,
        "/v1/metrics"
      );

      expect(result).toBe("https://otel-collector.company.com:4318/otel/v1/metrics");
    });

    it("should handle multiple trailing slashes in base endpoint", () => {
      const result = deriveEndpoint("https://base.example.com///", undefined, "/v1/traces");

      expect(result).toBe("https://base.example.com///v1/traces"); // Only removes single trailing slash
    });
  });

  describe("deriveEndpoints", () => {
    it("should derive multiple endpoints from base and path mappings", () => {
      const pathMappings = {
        traces: "/v1/traces",
        metrics: "/v1/metrics",
        logs: "/v1/logs",
      };

      const result = deriveEndpoints("https://otel.example.com", {}, pathMappings);

      expect(result).toEqual({
        traces: "https://otel.example.com/v1/traces",
        metrics: "https://otel.example.com/v1/metrics",
        logs: "https://otel.example.com/v1/logs",
      });
    });

    it("should prefer specific endpoints over derived ones", () => {
      const pathMappings = {
        traces: "/v1/traces",
        metrics: "/v1/metrics",
        logs: "/v1/logs",
      };

      const specificEndpoints = {
        metrics: "https://custom-metrics.example.com/api/v2",
      };

      const result = deriveEndpoints("https://otel.example.com", specificEndpoints, pathMappings);

      expect(result).toEqual({
        traces: "https://otel.example.com/v1/traces",
        metrics: "https://custom-metrics.example.com/api/v2",
        logs: "https://otel.example.com/v1/logs",
      });
    });

    it("should handle partial specific endpoints", () => {
      const pathMappings = {
        traces: "/v1/traces",
        metrics: "/v1/metrics",
        logs: "/v1/logs",
      };

      const specificEndpoints = {
        traces: "https://jaeger.example.com/api/traces",
        logs: "https://loki.example.com/loki/api/v1/push",
      };

      const result = deriveEndpoints("https://otel.example.com", specificEndpoints, pathMappings);

      expect(result).toEqual({
        traces: "https://jaeger.example.com/api/traces",
        metrics: "https://otel.example.com/v1/metrics",
        logs: "https://loki.example.com/loki/api/v1/push",
      });
    });

    it("should handle missing base endpoint", () => {
      const pathMappings = {
        traces: "/v1/traces",
        metrics: "/v1/metrics",
      };

      const result = deriveEndpoints(
        undefined,
        { traces: "https://specific-traces.example.com" },
        pathMappings
      );

      expect(result).toEqual({
        traces: "https://specific-traces.example.com",
        metrics: undefined,
      });
    });

    it("should handle empty path mappings", () => {
      const result = deriveEndpoints("https://base.example.com", {}, {});

      expect(result).toEqual({});
    });
  });

  describe("deriveOtlpEndpoint", () => {
    it("should be alias for deriveEndpoint", () => {
      const baseResult = deriveEndpoint("https://otel.example.com", undefined, "/v1/traces");

      const otlpResult = deriveOtlpEndpoint("https://otel.example.com", undefined, "/v1/traces");

      expect(otlpResult).toBe(baseResult);
      expect(otlpResult).toBe("https://otel.example.com/v1/traces");
    });
  });

  describe("OTLP_STANDARD_PATHS", () => {
    it("should define standard OTLP paths", () => {
      expect(OTLP_STANDARD_PATHS).toEqual({
        traces: "/v1/traces",
        metrics: "/v1/metrics",
        logs: "/v1/logs",
      });
    });

    it("should be a readonly constant", () => {
      // TypeScript const assertion provides immutability at compile time
      // Runtime immutability depends on Object.freeze, which isn't used here
      expect(OTLP_STANDARD_PATHS.traces).toBe("/v1/traces");
      expect(OTLP_STANDARD_PATHS.metrics).toBe("/v1/metrics");
      expect(OTLP_STANDARD_PATHS.logs).toBe("/v1/logs");
    });
  });

  describe("deriveAllOtlpEndpoints", () => {
    it("should derive all OTLP endpoints from base endpoint", () => {
      const config: OtlpEndpointConfig = {
        baseEndpoint: "https://otel-collector.company.com:4318",
      };

      const result = deriveAllOtlpEndpoints(config);

      expect(result).toEqual({
        traces: "https://otel-collector.company.com:4318/v1/traces",
        metrics: "https://otel-collector.company.com:4318/v1/metrics",
        logs: "https://otel-collector.company.com:4318/v1/logs",
      });
    });

    it("should use specific endpoints when provided", () => {
      const config: OtlpEndpointConfig = {
        baseEndpoint: "https://otel-collector.company.com:4318",
        tracesEndpoint: "https://jaeger.company.com:14268/api/traces",
        metricsEndpoint: "https://prometheus.company.com:9090/api/v1/write",
      };

      const result = deriveAllOtlpEndpoints(config);

      expect(result).toEqual({
        traces: "https://jaeger.company.com:14268/api/traces",
        metrics: "https://prometheus.company.com:9090/api/v1/write",
        logs: "https://otel-collector.company.com:4318/v1/logs",
      });
    });

    it("should handle config with no base endpoint", () => {
      const config: OtlpEndpointConfig = {
        tracesEndpoint: "https://jaeger.company.com:14268/api/traces",
        metricsEndpoint: "https://prometheus.company.com:9090/api/v1/write",
        logsEndpoint: "https://loki.company.com:3100/loki/api/v1/push",
      };

      const result = deriveAllOtlpEndpoints(config);

      expect(result).toEqual({
        traces: "https://jaeger.company.com:14268/api/traces",
        metrics: "https://prometheus.company.com:9090/api/v1/write",
        logs: "https://loki.company.com:3100/loki/api/v1/push",
      });
    });

    it("should handle empty config", () => {
      const config: OtlpEndpointConfig = {};

      const result = deriveAllOtlpEndpoints(config);

      expect(result).toEqual({
        traces: undefined,
        metrics: undefined,
        logs: undefined,
      });
    });
  });

  describe("validateOtlpEndpoints", () => {
    it("should validate correct HTTPS endpoints in production", () => {
      const endpoints: OtlpEndpoints = {
        traces: "https://jaeger.company.com:14268/api/traces",
        metrics: "https://prometheus.company.com:9090/api/v1/write",
        logs: "https://loki.company.com:3100/loki/api/v1/push",
      };

      const errors = validateOtlpEndpoints(endpoints, true);
      expect(errors).toHaveLength(0);
    });

    it("should allow HTTP endpoints in non-production", () => {
      const endpoints: OtlpEndpoints = {
        traces: "http://localhost:14268/api/traces",
        metrics: "http://localhost:9090/api/v1/write",
        logs: "http://localhost:3100/loki/api/v1/push",
      };

      const errors = validateOtlpEndpoints(endpoints, false);
      expect(errors).toHaveLength(0);
    });

    it("should reject HTTP endpoints in production", () => {
      const endpoints: OtlpEndpoints = {
        traces: "http://jaeger.company.com:14268/api/traces",
        metrics: "https://prometheus.company.com:9090/api/v1/write",
        logs: "http://loki.company.com:3100/loki/api/v1/push",
      };

      const errors = validateOtlpEndpoints(endpoints, true);
      expect(errors).toHaveLength(2);
      expect(errors).toContainEqual({
        endpoint: "traces",
        error: "Production endpoints must use HTTPS",
      });
      expect(errors).toContainEqual({
        endpoint: "logs",
        error: "Production endpoints must use HTTPS",
      });
    });

    it("should reject invalid URL formats", () => {
      const endpoints: OtlpEndpoints = {
        traces: "invalid-url",
        metrics: "https://valid.company.com/api/v1/write",
        logs: "not-a-url-either",
      };

      const errors = validateOtlpEndpoints(endpoints, false);
      expect(errors).toHaveLength(2);
      expect(errors).toContainEqual({
        endpoint: "traces",
        error: "Invalid URL format: invalid-url",
      });
      expect(errors).toContainEqual({
        endpoint: "logs",
        error: "Invalid URL format: not-a-url-either",
      });
    });

    it("should handle undefined endpoints gracefully", () => {
      const endpoints: OtlpEndpoints = {
        traces: undefined,
        metrics: "https://prometheus.company.com:9090/api/v1/write",
        logs: undefined,
      };

      const errors = validateOtlpEndpoints(endpoints, true);
      expect(errors).toHaveLength(0);
    });

    it("should handle complex URL validation scenarios", () => {
      const endpoints: OtlpEndpoints = {
        traces: "https://otel-collector.company.com:4318/v1/traces?param=value",
        metrics: "https://metrics.company.com/custom/path#fragment",
        logs: "https://user:pass@logs.company.com:8080/api/v1/logs",
      };

      const errors = validateOtlpEndpoints(endpoints, true);
      expect(errors).toHaveLength(0);
    });

    it("should validate port numbers in URLs", () => {
      const endpoints: OtlpEndpoints = {
        traces: "https://jaeger.company.com:14268/api/traces",
        metrics: "https://prometheus.company.com:9090/api/v1/write",
        logs: "https://loki.company.com:65535/loki/api/v1/push",
      };

      const errors = validateOtlpEndpoints(endpoints, true);
      expect(errors).toHaveLength(0);
    });
  });

  describe("createOtlpConfig", () => {
    it("should create config from environment variables with base endpoint", () => {
      const env = {
        OTEL_EXPORTER_OTLP_ENDPOINT: "https://otel-collector.company.com:4318",
      };

      const config = createOtlpConfig(env);

      expect(config).toEqual({
        baseEndpoint: "https://otel-collector.company.com:4318",
        tracesEndpoint: undefined,
        metricsEndpoint: undefined,
        logsEndpoint: undefined,
        traces: "https://otel-collector.company.com:4318/v1/traces",
        metrics: "https://otel-collector.company.com:4318/v1/metrics",
        logs: "https://otel-collector.company.com:4318/v1/logs",
      });
    });

    it("should create config with specific endpoints overriding base", () => {
      const env = {
        OTEL_EXPORTER_OTLP_ENDPOINT: "https://otel-collector.company.com:4318",
        OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: "https://jaeger.company.com:14268/api/traces",
        OTEL_EXPORTER_OTLP_METRICS_ENDPOINT: "https://prometheus.company.com:9090/api/v1/write",
      };

      const config = createOtlpConfig(env);

      expect(config).toEqual({
        baseEndpoint: "https://otel-collector.company.com:4318",
        tracesEndpoint: "https://jaeger.company.com:14268/api/traces",
        metricsEndpoint: "https://prometheus.company.com:9090/api/v1/write",
        logsEndpoint: undefined,
        traces: "https://jaeger.company.com:14268/api/traces",
        metrics: "https://prometheus.company.com:9090/api/v1/write",
        logs: "https://otel-collector.company.com:4318/v1/logs",
      });
    });

    it("should handle environment with only specific endpoints", () => {
      const env = {
        OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: "https://jaeger.company.com:14268/api/traces",
        OTEL_EXPORTER_OTLP_METRICS_ENDPOINT: "https://prometheus.company.com:9090/api/v1/write",
        OTEL_EXPORTER_OTLP_LOGS_ENDPOINT: "https://loki.company.com:3100/loki/api/v1/push",
      };

      const config = createOtlpConfig(env);

      expect(config).toEqual({
        baseEndpoint: undefined,
        tracesEndpoint: "https://jaeger.company.com:14268/api/traces",
        metricsEndpoint: "https://prometheus.company.com:9090/api/v1/write",
        logsEndpoint: "https://loki.company.com:3100/loki/api/v1/push",
        traces: "https://jaeger.company.com:14268/api/traces",
        metrics: "https://prometheus.company.com:9090/api/v1/write",
        logs: "https://loki.company.com:3100/loki/api/v1/push",
      });
    });

    it("should handle empty environment", () => {
      const env = {};

      const config = createOtlpConfig(env);

      expect(config).toEqual({
        baseEndpoint: undefined,
        tracesEndpoint: undefined,
        metricsEndpoint: undefined,
        logsEndpoint: undefined,
        traces: undefined,
        metrics: undefined,
        logs: undefined,
      });
    });

    it("should handle environment with localhost endpoints", () => {
      const env = {
        OTEL_EXPORTER_OTLP_ENDPOINT: "http://localhost:4318",
        OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: "http://localhost:14268/api/traces",
      };

      const config = createOtlpConfig(env);

      expect(config.traces).toBe("http://localhost:14268/api/traces");
      expect(config.metrics).toBe("http://localhost:4318/v1/metrics");
      expect(config.logs).toBe("http://localhost:4318/v1/logs");
    });

    it("should handle Docker/Kubernetes service URLs", () => {
      const env = {
        OTEL_EXPORTER_OTLP_ENDPOINT: "http://otel-collector.monitoring.svc.cluster.local:4318",
      };

      const config = createOtlpConfig(env);

      expect(config.traces).toBe(
        "http://otel-collector.monitoring.svc.cluster.local:4318/v1/traces"
      );
      expect(config.metrics).toBe(
        "http://otel-collector.monitoring.svc.cluster.local:4318/v1/metrics"
      );
      expect(config.logs).toBe("http://otel-collector.monitoring.svc.cluster.local:4318/v1/logs");
    });
  });

  describe("Edge Cases and Error Handling", () => {
    it("should handle null and empty string values", () => {
      const config: OtlpEndpointConfig = {
        baseEndpoint: "",
        tracesEndpoint: undefined,
        metricsEndpoint: "",
        logsEndpoint: undefined,
      };

      const result = deriveAllOtlpEndpoints(config);

      expect(result.traces).toBe("/v1/traces");
      expect(result.metrics).toBe("/v1/metrics");
      expect(result.logs).toBe("/v1/logs");
    });

    it("should handle malformed URLs in validation", () => {
      const endpoints: OtlpEndpoints = {
        traces: "://missing-protocol.com",
        metrics: "https://",
        logs: "ftp://invalid-protocol.com/logs",
      };

      const errors = validateOtlpEndpoints(endpoints, false);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some((e) => e.endpoint === "traces")).toBe(true);
      expect(errors.some((e) => e.endpoint === "metrics")).toBe(true);
    });

    it("should handle URLs with unusual characters", () => {
      const result = deriveEndpoint(
        "https://otel-collector.compañy.com:4318",
        undefined,
        "/v1/metrics"
      );

      expect(result).toBe("https://otel-collector.compañy.com:4318/v1/metrics");
    });

    it("should handle very long URLs", () => {
      const longPath = "/very/long/path/".repeat(20);
      const result = deriveEndpoint("https://example.com", undefined, longPath);

      expect(result).toBe(`https://example.com${longPath}`);
    });

    it("should validate HTTPS requirement correctly", () => {
      const endpoints: OtlpEndpoints = {
        traces: "HTTPS://UPPERCASE-PROTOCOL.COM/TRACES",
        metrics: "https://valid.com/metrics",
      };

      const errors = validateOtlpEndpoints(endpoints, true);
      expect(errors).toHaveLength(0);
    });
  });

  describe("Real-World Configuration Scenarios", () => {
    it("should handle AWS OTEL collector configuration", () => {
      const env = {
        OTEL_EXPORTER_OTLP_ENDPOINT: "https://aws-otel-collector.us-west-2.amazonaws.com:4318",
      };

      const config = createOtlpConfig(env);
      const errors = validateOtlpEndpoints(config, true);

      expect(errors).toHaveLength(0);
      expect(config.traces).toBe(
        "https://aws-otel-collector.us-west-2.amazonaws.com:4318/v1/traces"
      );
    });

    it("should handle Azure Application Insights configuration", () => {
      const env = {
        OTEL_EXPORTER_OTLP_TRACES_ENDPOINT:
          "https://westus2-0.in.applicationinsights.azure.com/v2.1/track",
        OTEL_EXPORTER_OTLP_METRICS_ENDPOINT:
          "https://westus2-0.in.applicationinsights.azure.com/v2.1/track",
      };

      const config = createOtlpConfig(env);
      const errors = validateOtlpEndpoints(config, true);

      expect(errors).toHaveLength(0);
      expect(config.traces).toBe("https://westus2-0.in.applicationinsights.azure.com/v2.1/track");
    });

    it("should handle Google Cloud Trace configuration", () => {
      const env = {
        OTEL_EXPORTER_OTLP_ENDPOINT:
          "https://cloudtrace.googleapis.com/v1/projects/my-project/traces",
      };

      const config = createOtlpConfig(env);
      const errors = validateOtlpEndpoints(config, true);

      expect(errors).toHaveLength(0);
    });

    it("should handle development environment configuration", () => {
      const env = {
        OTEL_EXPORTER_OTLP_ENDPOINT: "http://localhost:4318",
        OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: "http://jaeger:14268/api/traces",
      };

      const config = createOtlpConfig(env);
      const devErrors = validateOtlpEndpoints(config, false);
      const prodErrors = validateOtlpEndpoints(config, true);

      expect(devErrors).toHaveLength(0);
      expect(prodErrors.length).toBeGreaterThan(0);
    });
  });
});
