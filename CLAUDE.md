# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Common Development Tasks
```bash
# Start development server with hot reload
bun run dev

# Start production server
bun run start

# Build for production
bun run build

# Run tests
bun test

# Run tests in watch mode
bun run test:watch

# Run tests with coverage
bun run test:coverage

# Type checking
bun run typecheck

# Code quality checks (lint + format + typecheck)
bun run check

# Health check endpoint
bun run health-check
```

## Testing Strategy

### Three-Tier Testing Approach

#### Bun Tests - Unit & Integration Testing
```bash
# Run all Bun tests
bun test

# Run specific test files
bun test test/bun/jwt.service.test.ts
bun test test/bun/kong.service.test.ts
bun test test/bun/server.test.ts
```

#### Playwright Tests - E2E Scenarios
```bash
# Run all E2E tests
bun run playwright:test

# Interactive testing UI
bun run playwright:ui
```

#### K6 Tests - Performance Testing
```bash
# Individual test categories
bun run k6:smoke:health        # Health endpoint validation
bun run k6:smoke:tokens        # JWT token generation validation
bun run k6:load                # Production load simulation
bun run k6:stress              # System breaking point
bun run k6:spike               # Traffic burst testing

# Test information
bun run k6:info                # Display all available tests

# Custom environment variable examples
K6_SMOKE_VUS=2 K6_SMOKE_DURATION=10s k6 run test/k6/smoke/health-smoke.ts
TARGET_HOST=staging.example.com TARGET_PORT=443 TARGET_PROTOCOL=https bun run k6:smoke:health
K6_HEALTH_P95_THRESHOLD=100 K6_ERROR_RATE_THRESHOLD=0.05 bun run k6:load
```

## Architecture Overview

This is a high-performance authentication service migrated from .NET Core to Bun runtime, maintaining 100% API compatibility while achieving significant performance improvements.

### Core Architecture
- **Runtime**: Bun native with zero external dependencies for core functionality
- **Server**: Native `Bun.serve()` HTTP server (100k+ req/sec capability)
- **JWT Generation**: Uses `crypto.subtle` Web API for HMAC-SHA256 signing
- **Kong Integration**: Native `fetch` with intelligent caching and connection pooling
- **Performance**: Built-in performance monitoring and rate limiting
- **Observability**: Comprehensive OpenTelemetry instrumentation with Elastic APM integration

### Service Layer Structure
- **JWT Service** (`src/services/jwt.service.ts`): Native crypto.subtle JWT generation with HMAC-SHA256
- **Kong Service** (`src/services/kong.service.ts`): Kong Admin API integration with caching and health checks

### Telemetry & Observability Layer
- **Instrumentation** (`src/telemetry/instrumentation.ts`): OpenTelemetry SDK configuration with vendor-neutral OTLP export
- **Winston Logger** (`src/telemetry/winston-logger.ts`): ECS-formatted structured logging with APM correlation
- **Metrics Collection** (`src/telemetry/metrics.ts`): Custom business metrics and performance counters
- **Config Management** (`src/telemetry/config.ts`): Environment-based telemetry configuration with validation

### Configuration Management
- Environment-based configuration in `src/config/index.ts`
- Required environment variables: `KONG_JWT_AUTHORITY`, `KONG_JWT_AUDIENCE`, `KONG_ADMIN_URL`, `KONG_ADMIN_TOKEN`
- Configuration validation with detailed error messages for missing variables

### API Endpoints
- `GET /tokens` - JWT token issuance (requires Kong consumer headers)
- `GET /health` - Health check with Kong dependency status
- `GET /health/telemetry` - Telemetry health status and configuration
- `GET /health/metrics` - Metrics health and debugging information
- `GET /metrics` - Performance metrics and cache statistics
- `POST /debug/metrics/test` - Record test metrics for verification
- `POST /debug/metrics/export` - Force immediate metrics export to OTLP endpoint
- `GET /debug/metrics/stats` - Export statistics and success rates

### Key Design Patterns
- **Error Handling**: Comprehensive error handling with request IDs for tracing
- **Rate Limiting**: Built-in rate limiting and performance monitoring
- **Caching**: Kong consumer secret caching to reduce Admin API calls
- **Performance Monitoring**: Built-in metrics collection and reporting
- **CORS Support**: Configurable CORS with origin validation

### Kong Integration Details
- **Kong Mode Selection**: Supports both Kong API Gateway and Kong Konnect via `KONG_MODE` environment variable
  - `API_GATEWAY`: Traditional self-hosted Kong with direct Admin API access
  - `KONNECT`: Cloud-native Kong with control planes and realm management
- Requires Kong consumer headers: `x-consumer-id`, `x-consumer-username`
- Rejects anonymous consumers (`x-anonymous-consumer: true`)
- Creates and caches JWT credentials for Kong consumers
- Health checks Kong Admin API connectivity

### Environment Configuration
Copy `.env.example` to `.env` and configure:

#### Core Service Settings
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (development/production/test)
- `KONG_JWT_AUTHORITY` - JWT issuer authority URL (e.g., https://sts-api.pvhcorp.com/)
- `KONG_JWT_AUDIENCE` - JWT audience claim (e.g., http://api.pvhcorp.com/)
- `KONG_JWT_KEY_CLAIM_NAME` - JWT key claim identifier
- `KONG_MODE` - Kong implementation mode: `API_GATEWAY` or `KONNECT` (default: KONNECT)
- `KONG_ADMIN_URL` - Kong Admin API endpoint
  - For API_GATEWAY mode: `http://kong-gateway:8001`
  - For KONNECT mode: `https://region.api.konghq.com/v2/control-planes/{id}`
- `KONG_ADMIN_TOKEN` - Kong Admin API authentication token

#### OpenTelemetry Configuration
- `TELEMETRY_MODE` - Telemetry mode: `console` (disabled), `otlp`, or `both` (determines if telemetry is enabled)
- `OTEL_SERVICE_NAME` - Service name for telemetry (default: authentication-service)
- `OTEL_SERVICE_VERSION` - Service version (default: from package.json)
- `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` - OTLP traces endpoint
- `OTEL_EXPORTER_OTLP_METRICS_ENDPOINT` - OTLP metrics endpoint
- `OTEL_EXPORTER_OTLP_LOGS_ENDPOINT` - OTLP logs endpoint
- `OTEL_EXPORTER_OTLP_TIMEOUT` - Export timeout in milliseconds
- `OTEL_BSP_MAX_EXPORT_BATCH_SIZE` - Batch size for exports
- `OTEL_BSP_MAX_QUEUE_SIZE` - Maximum queue size

#### Testing Configuration

##### Playwright E2E Tests
- `API_BASE_URL` - Base URL for Playwright E2E tests (default: http://localhost:3000)

##### K6 Performance Testing
**Target Configuration:**
- `TARGET_HOST` - Target service host (default: localhost)
- `TARGET_PORT` - Target service port (default: 3000)
- `TARGET_PROTOCOL` - Target protocol (default: http)
- `K6_TIMEOUT` - Request timeout (default: 30s)

**Test Execution Parameters:**
- `K6_SMOKE_VUS` - Smoke test virtual users (default: 3)
- `K6_SMOKE_DURATION` - Smoke test duration (default: 3m)
- `K6_LOAD_INITIAL_VUS` - Load test initial VUs (default: 10)
- `K6_LOAD_TARGET_VUS` - Load test target VUs (default: 20)
- `K6_LOAD_RAMP_UP_DURATION` - Load test ramp up time (default: 2m)
- `K6_LOAD_STEADY_DURATION` - Load test steady state time (default: 5m)
- `K6_LOAD_RAMP_DOWN_DURATION` - Load test ramp down time (default: 2m)
- `K6_STRESS_INITIAL_VUS` - Stress test initial VUs (default: 50)
- `K6_STRESS_TARGET_VUS` - Stress test target VUs (default: 100)
- `K6_STRESS_PEAK_VUS` - Stress test peak VUs (default: 200)
- `K6_STRESS_DURATION` - Stress test duration (default: 5m)
- `K6_SPIKE_BASELINE_VUS` - Spike test baseline VUs (default: 10)
- `K6_SPIKE_TARGET_VUS` - Spike test target VUs (default: 100)
- `K6_SPIKE_DURATION` - Spike test duration (default: 3m)

**Performance Thresholds:**
- `K6_HEALTH_P95_THRESHOLD` - Health endpoint p95 threshold in ms (default: 400)
- `K6_HEALTH_P99_THRESHOLD` - Health endpoint p99 threshold in ms (default: 500)
- `K6_TOKENS_P95_THRESHOLD` - Tokens endpoint p95 threshold in ms (default: 50)
- `K6_TOKENS_P99_THRESHOLD` - Tokens endpoint p99 threshold in ms (default: 100)
- `K6_METRICS_P95_THRESHOLD` - Metrics endpoint p95 threshold in ms (default: 30)
- `K6_METRICS_P99_THRESHOLD` - Metrics endpoint p99 threshold in ms (default: 50)
- `K6_ERROR_RATE_THRESHOLD` - Error rate threshold as decimal (default: 0.01)
- `K6_STRESS_ERROR_RATE_THRESHOLD` - Stress test error rate threshold (default: 0.05)

**Test Consumer Configuration:**
- `TEST_CONSUMER_ID_1` through `TEST_CONSUMER_ID_5` - Consumer IDs for load testing
- `TEST_CONSUMER_USERNAME_1` through `TEST_CONSUMER_USERNAME_5` - Consumer usernames for load testing

#### API Documentation Configuration
- `API_TITLE` - API title for OpenAPI spec
- `API_DESCRIPTION` - API description for OpenAPI spec
- `API_VERSION` - API version for OpenAPI spec
- `API_CONTACT_NAME` - Contact name for OpenAPI spec
- `API_CONTACT_EMAIL` - Contact email for OpenAPI spec
- `API_LICENSE_NAME` - License name for OpenAPI spec
- `API_LICENSE_IDENTIFIER` - License identifier for OpenAPI spec

### Migration Context
This service is a complete migration from .NET Core 3.1, maintaining identical API contracts while improving:
- 3-4x performance improvement
- 60% reduction in memory usage
- 5x smaller container images
- <100ms cold start times

## OpenTelemetry Observability

### Overview
The service implements comprehensive observability using vendor-neutral OpenTelemetry standards, compatible with Elastic APM and other OTLP-compliant platforms.

### Telemetry Features
- **Distributed Tracing**: HTTP request tracing with automatic span correlation
- **Runtime Metrics**: Node.js event loop, memory usage, CPU utilization, active handles/requests
- **System Metrics**: Host-level CPU, memory, disk, and network metrics via HostMetrics
- **Custom Business Metrics**: JWT token generation, Kong operations, cache performance
- **Structured Logging**: ECS-formatted logs with trace correlation and APM integration
- **Auto-Instrumentation**: HTTP, DNS, and NET instrumentation with custom hooks

### Metrics Available
- `nodejs.eventloop.delay` - Event loop utilization percentage
- `process.memory.usage` - Memory usage by type (heap_used, heap_total, rss, external)
- `process.cpu.usage` - CPU utilization percentage
- `nodejs.active_handles` - Active handle count
- `nodejs.active_requests` - Active request count
- `system.cpu.utilization` - System CPU usage by logical core
- `system.memory.usage` - System memory metrics
- `http_requests_total` - HTTP request counters by method/status
- `http_response_time_seconds` - HTTP response time histograms
- `jwt_tokens_generated` - JWT generation counters
- `kong_operations` - Kong API operation metrics
- `cache_operations` - Cache hit/miss statistics

### Telemetry Modes
- **`console`**: Logs only to console (development)
- **`otlp`**: Exports only to OTLP endpoints (production)
- **`both`**: Console logs + OTLP export (debugging)

### Debugging Telemetry
```bash
# Test metrics export
curl -X POST http://localhost:3000/debug/metrics/test

# Force immediate metrics export
curl -X POST http://localhost:3000/debug/metrics/export

# View export statistics
curl http://localhost:3000/debug/metrics/stats

# Check telemetry health
curl http://localhost:3000/health/telemetry
```

## Deployment & Production

### Production Considerations
- **Memory Usage**: ~50-80MB baseline with telemetry enabled
- **CPU Overhead**: <2% additional overhead for full observability
- **Network**: Metrics export every 10 seconds, logs exported in batches
- **Storage**: Efficient resource attributes to minimize metric cardinality

### Environment Setup
```bash
# Production telemetry configuration
TELEMETRY_MODE=otlp
OTEL_SERVICE_NAME=authentication-service
OTEL_DEPLOYMENT_ENVIRONMENT=production
OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=https://your-apm.example.com/v1/traces
OTEL_EXPORTER_OTLP_METRICS_ENDPOINT=https://your-apm.example.com/v1/metrics
OTEL_EXPORTER_OTLP_LOGS_ENDPOINT=https://your-apm.example.com/v1/logs
```

### Container Deployment
The service is optimized for containerized deployments:
- **Image Size**: <100MB with all dependencies
- **Cold Start**: <100ms initialization time
- **Health Checks**: Multiple health endpoints for orchestrator readiness probes
- **Graceful Shutdown**: Proper telemetry cleanup on SIGTERM

### Monitoring Alerts
Recommended alerts based on available metrics:
- High event loop delay (>100ms sustained)
- Memory usage >80% of container limit
- HTTP error rate >5%
- Kong API failures
- Cache miss rate >50%
- Export failures in telemetry

## Code Quality Requirements

### Pre-Commit Checklist
Run `bun run check` after code changes and before committing/pushing

The `check` command runs:
- Biome linting and formatting
- TypeScript type checking
- Code quality validation

### Code Style Guidelines
- DO NOT use emojis and do not add comments for every single code change
- We should have minimal comments throughout the code base
- Use standardized file headers: `/* src/path/file.ts */`

### Development Guidelines
- Verify method existence before use
- Check actual method names and signatures
- Test code snippets or use runtime inspection
- When unsure about an API, use `console.log()` or runtime inspection to check available methods
- Example: `console.log('Available methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(instance)))`

## Development Workflow

### Local Development Setup
```bash
# Clone and install dependencies
git clone <repository>
cd pvh.services.authentication-v2
bun install

# Copy environment configuration
cp .env.example .env
# Edit .env with your configuration

# Start development server with telemetry
export TELEMETRY_MODE=both
bun run dev
```

### Development Commands Extended
```bash
# Clean development restart (kills existing processes)
bun run dev:clean

# Development with specific telemetry mode
TELEMETRY_MODE=console bun run dev      # Console logging only
TELEMETRY_MODE=otlp bun run dev         # OTLP export only
TELEMETRY_MODE=both bun run dev         # Both console + OTLP

# Kill any processes on port 3000
bun run kill-server

# Run unsafe biome fixes
bun run check:unsafe
```

### Debugging & Troubleshooting

#### Common Development Issues
1. **Port Already in Use**: Run `bun run kill-server` to clean up processes
2. **Telemetry Errors**: Check OTLP endpoints are reachable and credentials are correct
3. **Kong Connection Issues**: Verify `KONG_ADMIN_URL` and `KONG_ADMIN_TOKEN` in `.env`
4. **Rate Limiting**: Adjust `RATE_LIMIT_*` settings for development load

#### Telemetry Debugging
```bash
# Check telemetry status
curl http://localhost:3000/health/telemetry

# Test metrics are being collected
curl -X POST http://localhost:3000/debug/metrics/test
curl http://localhost:3000/debug/metrics/stats

# Force immediate export
curl -X POST http://localhost:3000/debug/metrics/flush

# Monitor export success rate
watch 'curl -s http://localhost:3000/debug/metrics/stats | jq .successRate'
```

#### Performance Testing
```bash
# Basic load test
curl -w "\\n%{time_total}s\\n" http://localhost:3000/health

# Test JWT endpoint (requires Kong headers)
curl -H "x-consumer-id: test-consumer" \\
     -H "x-consumer-username: test-user" \\
     http://localhost:3000/tokens

# Monitor metrics during load
curl http://localhost:3000/metrics

# K6 Performance Testing with Environment Variables
# Quick smoke test (2 VUs, 10 seconds)
K6_SMOKE_VUS=2 K6_SMOKE_DURATION=10s k6 run test/k6/smoke/health-smoke.ts

# Load testing against staging environment
TARGET_HOST=staging.example.com TARGET_PORT=443 TARGET_PROTOCOL=https \\
K6_LOAD_INITIAL_VUS=5 K6_LOAD_TARGET_VUS=15 \\
bun run k6:load

# Stress testing with relaxed thresholds
K6_HEALTH_P95_THRESHOLD=200 K6_ERROR_RATE_THRESHOLD=0.05 \\
K6_STRESS_TARGET_VUS=50 K6_STRESS_PEAK_VUS=100 \\
bun run k6:stress

# Custom consumer credentials testing
TEST_CONSUMER_ID_1=prod-consumer-001 TEST_CONSUMER_USERNAME_1=prod-user-001 \\
k6 run test/k6/smoke/tokens-smoke.ts
```

### Code Quality Automation
The project uses Biome for linting and formatting. Pre-commit hooks ensure code quality:
- Automatic formatting on save
- Lint error prevention in commits
- TypeScript strict type checking
- Import organization and cleanup

### Testing Strategy
```bash
# Run all tests
bun test

# Test specific components
bun test tests/jwt.service.test.ts
bun test tests/kong.service.test.ts
bun test tests/server.test.ts

# Watch mode for TDD
bun run test:watch

# Coverage reports
bun run test:coverage
```

### Reminders
- Run `bun run check` before committing
- Use `TELEMETRY_MODE=both` for development debugging
- Monitor telemetry export success rates in development
- Test both JWT and health endpoints after changes
- Verify Kong connectivity before deployment