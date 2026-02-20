import { describe, expect, it } from "bun:test";
import { envVarMapping } from "../../../src/config/envMapping";

describe("Environment Variable Mapping", () => {
  describe("Server Configuration", () => {
    it("should map PORT correctly", () => {
      expect(envVarMapping.server.port).toBe("PORT");
    });

    it("should map NODE_ENV correctly", () => {
      expect(envVarMapping.server.nodeEnv).toBe("NODE_ENV");
    });

    it("should map MAX_REQUEST_BODY_SIZE correctly", () => {
      expect(envVarMapping.server.maxRequestBodySize).toBe("MAX_REQUEST_BODY_SIZE");
    });

    it("should map REQUEST_TIMEOUT_MS correctly", () => {
      expect(envVarMapping.server.requestTimeoutMs).toBe("REQUEST_TIMEOUT_MS");
    });
  });

  describe("JWT Configuration", () => {
    it("should map KONG_JWT_AUTHORITY correctly", () => {
      expect(envVarMapping.jwt.authority).toBe("KONG_JWT_AUTHORITY");
    });

    it("should map KONG_JWT_AUDIENCE correctly", () => {
      expect(envVarMapping.jwt.audience).toBe("KONG_JWT_AUDIENCE");
    });

    it("should map KONG_JWT_ISSUER correctly", () => {
      expect(envVarMapping.jwt.issuer).toBe("KONG_JWT_ISSUER");
    });

    it("should map JWT_EXPIRATION_MINUTES correctly", () => {
      expect(envVarMapping.jwt.expirationMinutes).toBe("JWT_EXPIRATION_MINUTES");
    });
  });

  describe("Kong Configuration", () => {
    it("should map KONG_MODE correctly", () => {
      expect(envVarMapping.kong.mode).toBe("KONG_MODE");
    });

    it("should map KONG_ADMIN_URL correctly", () => {
      expect(envVarMapping.kong.adminUrl).toBe("KONG_ADMIN_URL");
    });

    it("should map KONG_ADMIN_TOKEN correctly", () => {
      expect(envVarMapping.kong.adminToken).toBe("KONG_ADMIN_TOKEN");
    });

    it("should map KONG_SECRET_CREATION_MAX_RETRIES correctly", () => {
      expect(envVarMapping.kong.secretCreationMaxRetries).toBe("KONG_SECRET_CREATION_MAX_RETRIES");
    });

    it("should map KONG_MAX_HEADER_LENGTH correctly", () => {
      expect(envVarMapping.kong.maxHeaderLength).toBe("KONG_MAX_HEADER_LENGTH");
    });

    it("should map circuit breaker settings correctly", () => {
      expect(envVarMapping.kong.circuitBreakerEnabled).toBe("CIRCUIT_BREAKER_ENABLED");
      expect(envVarMapping.kong.circuitBreakerTimeout).toBe("CIRCUIT_BREAKER_TIMEOUT");
      expect(envVarMapping.kong.circuitBreakerErrorThreshold).toBe(
        "CIRCUIT_BREAKER_ERROR_THRESHOLD"
      );
      expect(envVarMapping.kong.circuitBreakerResetTimeout).toBe("CIRCUIT_BREAKER_RESET_TIMEOUT");
      expect(envVarMapping.kong.circuitBreakerVolumeThreshold).toBe(
        "CIRCUIT_BREAKER_VOLUME_THRESHOLD"
      );
    });
  });

  describe("Caching Configuration", () => {
    it("should map HIGH_AVAILABILITY correctly", () => {
      expect(envVarMapping.caching.highAvailability).toBe("HIGH_AVAILABILITY");
    });

    it("should map REDIS_URL correctly", () => {
      expect(envVarMapping.caching.redisUrl).toBe("REDIS_URL");
    });

    it("should map CACHE_HEALTH_TTL_MS correctly", () => {
      expect(envVarMapping.caching.healthCheckTtlMs).toBe("CACHE_HEALTH_TTL_MS");
    });

    it("should map REDIS_MAX_RETRIES correctly", () => {
      expect(envVarMapping.caching.redisMaxRetries).toBe("REDIS_MAX_RETRIES");
    });

    it("should map REDIS_CONNECTION_TIMEOUT correctly", () => {
      expect(envVarMapping.caching.redisConnectionTimeout).toBe("REDIS_CONNECTION_TIMEOUT");
    });

    it("should map STALE_DATA_TOLERANCE_MINUTES correctly", () => {
      expect(envVarMapping.caching.staleDataToleranceMinutes).toBe("STALE_DATA_TOLERANCE_MINUTES");
    });
  });

  describe("Telemetry Configuration", () => {
    it("should map OTEL_SERVICE_NAME correctly", () => {
      expect(envVarMapping.telemetry.serviceName).toBe("OTEL_SERVICE_NAME");
    });

    it("should map TELEMETRY_MODE correctly", () => {
      expect(envVarMapping.telemetry.mode).toBe("TELEMETRY_MODE");
    });

    it("should map OTEL_EXPORTER_OTLP_ENDPOINT correctly", () => {
      expect(envVarMapping.telemetry.endpoint).toBe("OTEL_EXPORTER_OTLP_ENDPOINT");
    });

    it("should map telemetry circuit breaker settings correctly", () => {
      expect(envVarMapping.telemetry.circuitBreakerFailureThreshold).toBe(
        "TELEMETRY_CB_FAILURE_THRESHOLD"
      );
      expect(envVarMapping.telemetry.circuitBreakerRecoveryTimeout).toBe(
        "TELEMETRY_CB_RECOVERY_TIMEOUT"
      );
      expect(envVarMapping.telemetry.circuitBreakerSuccessThreshold).toBe(
        "TELEMETRY_CB_SUCCESS_THRESHOLD"
      );
      expect(envVarMapping.telemetry.circuitBreakerMonitoringInterval).toBe(
        "TELEMETRY_CB_MONITORING_INTERVAL"
      );
    });

    it("should map OTLP endpoint variants correctly", () => {
      expect(envVarMapping.telemetry.logsEndpoint).toBe("OTEL_EXPORTER_OTLP_LOGS_ENDPOINT");
      expect(envVarMapping.telemetry.tracesEndpoint).toBe("OTEL_EXPORTER_OTLP_TRACES_ENDPOINT");
      expect(envVarMapping.telemetry.metricsEndpoint).toBe("OTEL_EXPORTER_OTLP_METRICS_ENDPOINT");
    });
  });

  describe("Profiling Configuration", () => {
    it("should map PROFILING_ENABLED correctly", () => {
      expect(envVarMapping.profiling.enabled).toBe("PROFILING_ENABLED");
    });
  });

  describe("Continuous Profiling Configuration", () => {
    it("should map CONTINUOUS_PROFILING_ENABLED correctly", () => {
      expect(envVarMapping.continuousProfiling.enabled).toBe("CONTINUOUS_PROFILING_ENABLED");
    });

    it("should map CONTINUOUS_PROFILING_AUTO_TRIGGER_ON_SLA correctly", () => {
      expect(envVarMapping.continuousProfiling.autoTriggerOnSlaViolation).toBe(
        "CONTINUOUS_PROFILING_AUTO_TRIGGER_ON_SLA"
      );
    });

    it("should map CONTINUOUS_PROFILING_THROTTLE_MINUTES correctly", () => {
      expect(envVarMapping.continuousProfiling.slaViolationThrottleMinutes).toBe(
        "CONTINUOUS_PROFILING_THROTTLE_MINUTES"
      );
    });
  });

  describe("API Info Configuration", () => {
    it("should map API_TITLE correctly", () => {
      expect(envVarMapping.apiInfo.title).toBe("API_TITLE");
    });

    it("should map API_CORS correctly", () => {
      expect(envVarMapping.apiInfo.cors).toEqual({
        origin: "API_CORS_ORIGIN",
        allowHeaders: "API_CORS_ALLOW_HEADERS",
        allowMethods: "API_CORS_ALLOW_METHODS",
        maxAge: "API_CORS_MAX_AGE",
      });
    });

    it("should map legacy API_CORS correctly", () => {
      expect(envVarMapping.apiInfo.corsLegacy).toBe("API_CORS");
    });

    it("should map API_VERSION correctly", () => {
      expect(envVarMapping.apiInfo.version).toBe("API_VERSION");
    });
  });

  describe("Mapping Structure Validation", () => {
    it("should have all expected top-level sections", () => {
      const expectedSections = [
        "server",
        "jwt",
        "kong",
        "caching",
        "telemetry",
        "profiling",
        "continuousProfiling",
        "apiInfo",
      ];

      for (const section of expectedSections) {
        expect(envVarMapping).toHaveProperty(section);
      }
    });

    it("should have string values for all mappings", () => {
      const validateMappings = (obj: Record<string, unknown>, path = "") => {
        for (const [key, value] of Object.entries(obj)) {
          const currentPath = path ? `${path}.${key}` : key;
          if (typeof value === "object" && value !== null) {
            validateMappings(value as Record<string, unknown>, currentPath);
          } else {
            expect(typeof value).toBe("string");
          }
        }
      };

      validateMappings(envVarMapping);
    });

    it("should not have duplicate env var names across sections", () => {
      const allEnvVars: string[] = [];
      const duplicates: string[] = [];

      const collectEnvVars = (obj: Record<string, unknown>) => {
        for (const value of Object.values(obj)) {
          if (typeof value === "object" && value !== null) {
            collectEnvVars(value as Record<string, unknown>);
          } else if (typeof value === "string") {
            if (
              allEnvVars.includes(value) &&
              value !== "HIGH_AVAILABILITY" &&
              value !== "NODE_ENV"
            ) {
              duplicates.push(value);
            }
            allEnvVars.push(value);
          }
        }
      };

      collectEnvVars(envVarMapping);

      expect(duplicates.length).toBe(0);
    });

    it("should have env var names in uppercase format", () => {
      const validateUppercase = (obj: Record<string, unknown>) => {
        for (const value of Object.values(obj)) {
          if (typeof value === "object" && value !== null) {
            validateUppercase(value as Record<string, unknown>);
          } else if (typeof value === "string") {
            expect(value).toBe(value.toUpperCase());
          }
        }
      };

      validateUppercase(envVarMapping);
    });
  });
});
