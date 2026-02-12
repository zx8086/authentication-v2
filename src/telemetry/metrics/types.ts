/* src/telemetry/metrics/types.ts */

import type { Attributes } from "@opentelemetry/api";

// HTTP Request Attributes
export interface HttpRequestAttributes extends Attributes {
  method: string;
  route: string;
  status_code?: string;
  status_class?: string;
  version?: "v1" | "v2";
}

// Process Attributes
export interface ProcessAttributes extends Attributes {
  component: string;
  pid?: string;
  gc_type?: string;
}

// Authentication Attributes
export interface AuthAttributes extends Attributes {
  consumer_id: string;
  operation: "token_generation" | "validation" | "refresh";
  result: "success" | "failure";
}

// Kong Operation Attributes
export interface KongAttributes extends Attributes {
  operation: "get_consumer" | "create_credential" | "health_check";
  cache_status: "hit" | "miss" | "stale";
}

// Circuit Breaker Attributes
export interface CircuitBreakerAttributes extends Attributes {
  operation: string;
  state: "closed" | "open" | "half_open";
}

// API Versioning Attributes
export interface ApiVersionAttributes extends Attributes {
  version: "v1" | "v2";
  endpoint: string;
  source: "header" | "default" | "fallback";
  method: string;
}

// Security Attributes (V2)
export interface SecurityAttributes extends Attributes {
  event_type: "jwt_anomaly" | "rate_limit" | "suspicious_activity" | "header_validation";
  severity: "low" | "medium" | "high" | "critical";
  consumer_id?: string;
  version: "v2";
}

// Cache Tier Attributes
export interface CacheTierAttributes extends Attributes {
  tier: "memory" | "redis" | "kong" | "fallback";
  operation: "get" | "set" | "delete" | "invalidate";
}

// Consumer Volume Attributes
export interface ConsumerVolumeAttributes extends Attributes {
  volume_category: "high" | "medium" | "low";
  consumer_id: string;
}

// Redis Operation Attributes
export interface RedisAttributes extends Attributes {
  operation: "get" | "set" | "del" | "exists" | "expire";
  key_pattern?: string;
}

// Error Attributes
export interface ErrorAttributes extends Attributes {
  error_type: string;
  operation: string;
  component: string;
}

// Telemetry Export Attributes
export interface TelemetryAttributes extends Attributes {
  exporter: "console" | "otlp" | "jaeger";
  status: "success" | "failure";
}
