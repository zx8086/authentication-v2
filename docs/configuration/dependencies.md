# Package Dependencies

## Core Dependencies (package.json)

### Runtime Dependencies
```json
{
  "dependencies": {
    // OpenTelemetry Observability Stack
    "@elastic/ecs-winston-format": "^1.5.3",
    "@opentelemetry/api": "^1.9.0",
    "@opentelemetry/api-logs": "^0.206.0",
    "@opentelemetry/auto-instrumentations-node": "^0.65.0",
    "@opentelemetry/core": "^2.1.0",
    "@opentelemetry/exporter-logs-otlp-http": "^0.206.0",
    "@opentelemetry/exporter-metrics-otlp-http": "^0.206.0",
    "@opentelemetry/exporter-otlp-http": "^0.26.0",
    "@opentelemetry/exporter-trace-otlp-http": "^0.206.0",
    "@opentelemetry/host-metrics": "^0.36.2",
    "@opentelemetry/instrumentation-fetch": "^0.206.0",
    "@opentelemetry/instrumentation-http": "^0.206.0",
    "@opentelemetry/instrumentation-redis": "^0.55.0",
    "@opentelemetry/instrumentation-winston": "^0.51.0",
    "@opentelemetry/resources": "^2.1.0",
    "@opentelemetry/sdk-logs": "^0.206.0",
    "@opentelemetry/sdk-metrics": "^2.1.0",
    "@opentelemetry/sdk-node": "^0.206.0",
    "@opentelemetry/sdk-trace-base": "^2.1.0",
    "@opentelemetry/semantic-conventions": "^1.37.0",
    "@opentelemetry/winston-transport": "^0.17.0",

    // Resilience and Caching
    "opossum": "^9.0.0",                    // Circuit breaker for Kong API protection
    "redis": "^5.8.3",                     // Redis cache backend for HA mode

    // Logging and Configuration
    "winston": "^3.18.3",                  // Structured logging with ECS format
    "winston-transport": "^4.9.0",         // Winston transport abstractions
    "zod": "^4.1.12"                       // Schema validation with v4 features
  },
  "devDependencies": {
    "@biomejs/biome": "^2.2.5",            // Code quality (linting + formatting)
    "@playwright/test": "^1.56.0",         // E2E testing framework
    "@types/bun": "1.2.23",                // Bun runtime types
    "@types/k6": "^1.3.1",                 // K6 performance testing types
    "@types/opossum": "^8.1.9",            // Circuit breaker types
    "@types/redis": "^4.0.11",             // Redis client types
    "typescript": "^5.9.3"                 // TypeScript compiler
  },
  "engines": {
    "bun": ">=1.1.35"                      // Minimum Bun version requirement
  }
}
```

## Key Dependency Categories

### 1. OpenTelemetry Stack
Comprehensive observability with OTLP protocol support:
- **Metrics, traces, and logs instrumentation**
- **Redis instrumentation** for cache monitoring
- **Host metrics** for system-level telemetry
- **OTLP HTTP exporters** for standardized telemetry delivery
- **Winston integration** for structured logging

### 2. Resilience & Caching
High-availability architecture components:
- **`opossum`**: Circuit breaker protection for Kong Admin API
- **`redis`**: Cache backend with automatic failover support

### 3. Configuration & Validation
Enterprise-grade configuration management:
- **`zod` v4.1.12**: Advanced schema validation with format functions
- **Environment variable mapping** with type safety

### 4. Development Tools
Optimized development workflow:
- **`@biomejs/biome`**: Code quality with .biomeignore performance optimization
- **`@playwright/test`**: Cross-browser E2E testing
- **`@types/*`**: TypeScript support for all runtime dependencies

## Minimum Requirements

### Bun Runtime
- **Minimum Version**: 1.1.35
- **Recommended**: 1.2.23+
- **Reason**: Native `Bun.serve()` API improvements and crypto.subtle enhancements

### Node.js Compatibility
While this service runs on Bun, it maintains Node.js compatibility for:
- **CI/CD environments** that may use Node.js tooling
- **Development tools** that haven't migrated to Bun yet
- **OpenTelemetry libraries** designed for Node.js runtime

### System Requirements
- **Memory**: Minimum 512MB, recommended 1GB (production limit: 1Gi)
- **CPU**: Single core sufficient, multi-core for high throughput
- **Disk**: 58MB container image (distroless base)
- **Network**: Outbound HTTPS access for Kong Admin API and telemetry endpoints