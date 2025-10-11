/* src/config/helpers.ts */

/**
 * Generic endpoint derivation utilities for configuration management
 */

export interface EndpointConfig {
  baseEndpoint?: string;
  endpoints?: Record<string, string | undefined>;
}

export interface EndpointPaths {
  [key: string]: string;
}

export interface OtlpEndpoints {
  traces?: string;
  metrics?: string;
  logs?: string;
}

export interface OtlpEndpointConfig {
  baseEndpoint?: string;
  tracesEndpoint?: string;
  metricsEndpoint?: string;
  logsEndpoint?: string;
}

/**
 * Generic endpoint derivation utility
 * @param baseEndpoint - Base endpoint URL (e.g., "https://api.example.com")
 * @param specificEndpoint - Specific endpoint if already provided
 * @param pathSuffix - Path suffix to append (e.g., "/v1/traces", "/api/webhooks")
 * @returns Derived endpoint URL or undefined if base is not provided
 */
export function deriveEndpoint(
  baseEndpoint: string | undefined,
  specificEndpoint: string | undefined,
  pathSuffix: string
): string | undefined {
  // If specific endpoint is already provided, use it
  if (specificEndpoint) {
    return specificEndpoint;
  }

  // If no base endpoint, cannot derive
  if (!baseEndpoint) {
    return undefined;
  }

  // Normalize base endpoint (remove trailing slash)
  const normalizedBase = baseEndpoint.replace(/\/$/, "");

  // Normalize path suffix (ensure leading slash)
  const normalizedPath = pathSuffix.startsWith("/") ? pathSuffix : `/${pathSuffix}`;

  return `${normalizedBase}${normalizedPath}`;
}

/**
 * Derives multiple endpoints from a base endpoint using path mappings
 * @param baseEndpoint - Base endpoint URL
 * @param specificEndpoints - Map of specific endpoints if already provided
 * @param pathMappings - Map of endpoint names to path suffixes
 * @returns Map of derived endpoints
 */
export function deriveEndpoints<T extends string>(
  baseEndpoint: string | undefined,
  specificEndpoints: Partial<Record<T, string>> = {},
  pathMappings: Record<T, string>
): Partial<Record<T, string>> {
  const result: Partial<Record<T, string>> = {};

  for (const [key, pathSuffix] of Object.entries(pathMappings) as Array<[T, string]>) {
    result[key] = deriveEndpoint(baseEndpoint, specificEndpoints[key], pathSuffix);
  }

  return result;
}

/**
 * Legacy OTLP-specific endpoint derivation (for backward compatibility)
 * @deprecated Use deriveEndpoint instead for new implementations
 */
export function deriveOtlpEndpoint(
  baseEndpoint: string | undefined,
  specificEndpoint: string | undefined,
  pathSuffix: string
): string | undefined {
  return deriveEndpoint(baseEndpoint, specificEndpoint, pathSuffix);
}

/**
 * Derives all OTLP endpoints from a base endpoint with standard paths
 * @param config - OTLP endpoint configuration
 * @returns Complete set of derived OTLP endpoints
 */
export function deriveAllOtlpEndpoints(config: OtlpEndpointConfig): OtlpEndpoints {
  return deriveEndpoints(
    config.baseEndpoint,
    {
      traces: config.tracesEndpoint,
      metrics: config.metricsEndpoint,
      logs: config.logsEndpoint,
    },
    OTLP_STANDARD_PATHS
  ) as OtlpEndpoints;
}

/**
 * Validates that OTLP endpoints use HTTPS in production environments
 * @param endpoints - OTLP endpoints to validate
 * @param isProduction - Whether running in production environment
 * @returns Array of validation errors
 */
export function validateOtlpEndpoints(
  endpoints: OtlpEndpoints,
  isProduction: boolean = false
): Array<{ endpoint: keyof OtlpEndpoints; error: string }> {
  const errors: Array<{ endpoint: keyof OtlpEndpoints; error: string }> = [];

  for (const [key, value] of Object.entries(endpoints) as Array<
    [keyof OtlpEndpoints, string | undefined]
  >) {
    if (!value) continue;

    // Validate URL format
    try {
      new URL(value);
    } catch {
      errors.push({ endpoint: key, error: `Invalid URL format: ${value}` });
      continue;
    }

    // Validate HTTPS in production
    if (isProduction && !value.startsWith("https://")) {
      errors.push({ endpoint: key, error: "Production endpoints must use HTTPS" });
    }
  }

  return errors;
}

/**
 * Standard OTLP endpoint paths according to OpenTelemetry specification
 */
export const OTLP_STANDARD_PATHS = {
  traces: "/v1/traces",
  metrics: "/v1/metrics",
  logs: "/v1/logs",
} as const;

/**
 * Creates a complete OTLP configuration from environment variables
 * @param env - Environment variables object
 * @returns Complete OTLP endpoint configuration
 */
export function createOtlpConfig(env: {
  OTEL_EXPORTER_OTLP_ENDPOINT?: string;
  OTEL_EXPORTER_OTLP_TRACES_ENDPOINT?: string;
  OTEL_EXPORTER_OTLP_METRICS_ENDPOINT?: string;
  OTEL_EXPORTER_OTLP_LOGS_ENDPOINT?: string;
}): OtlpEndpointConfig & OtlpEndpoints {
  const config: OtlpEndpointConfig = {
    baseEndpoint: env.OTEL_EXPORTER_OTLP_ENDPOINT,
    tracesEndpoint: env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT,
    metricsEndpoint: env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT,
    logsEndpoint: env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT,
  };

  const derivedEndpoints = deriveAllOtlpEndpoints(config);

  return {
    ...config,
    ...derivedEndpoints,
  };
}
