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
- **Performance Utils** (`src/utils/performance.ts`): Rate limiting and performance monitoring

### Telemetry & Observability Layer
- **Instrumentation** (`src/telemetry/instrumentation.ts`): OpenTelemetry SDK configuration with vendor-neutral OTLP export
- **Winston Logger** (`src/telemetry/winston-logger.ts`): ECS-formatted structured logging with APM correlation
- **Metrics Collection** (`src/telemetry/metrics.ts`): Custom business metrics and performance counters
- **Config Management** (`src/telemetry/config.ts`): Environment-based telemetry configuration with validation

### Configuration Management
- Environment-based configuration in `src/config/index.ts`
- Required environment variables: `JWT_AUTHORITY`, `JWT_AUDIENCE`, `KONG_ADMIN_URL`, `KONG_ADMIN_TOKEN`
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
- **Rate Limiting**: Per-consumer rate limiting with sliding window algorithm
- **Caching**: Kong consumer secret caching to reduce Admin API calls
- **Performance Monitoring**: Built-in metrics collection and reporting
- **CORS Support**: Configurable CORS with origin validation

### Kong Integration Details
- Requires Kong consumer headers: `x-consumer-id`, `x-consumer-username`
- Rejects anonymous consumers (`x-anonymous-consumer: true`)
- Creates and caches JWT credentials for Kong consumers
- Health checks Kong Admin API connectivity

### Environment Configuration
Copy `.env.example` to `.env` and configure:

#### Core Service Settings
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (development/production/test)
- `JWT_AUTHORITY` - JWT issuer authority URL
- `JWT_AUDIENCE` - JWT audience claim
- `JWT_KEY_CLAIM_NAME` - JWT key claim identifier
- `KONG_ADMIN_URL` - Kong Admin API endpoint
- `KONG_ADMIN_TOKEN` - Kong Admin API authentication token
- `ALLOWED_ORIGINS` - CORS allowed origins (comma-separated)

#### Rate Limiting Configuration
- `RATE_LIMIT_WINDOW_MS` - Rate limit window in milliseconds
- `RATE_LIMIT_MAX_REQUESTS` - Maximum requests per window

#### OpenTelemetry Configuration
- `TELEMETRY_MODE` - Telemetry mode: `console` (disabled), `otlp`, or `both` (determines if telemetry is enabled)
- `OTEL_SERVICE_NAME` - Service name for telemetry (default: authentication-service)
- `OTEL_SERVICE_VERSION` - Service version (default: from package.json)
- `OTEL_DEPLOYMENT_ENVIRONMENT` - Deployment environment
- `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT` - OTLP traces endpoint
- `OTEL_EXPORTER_OTLP_METRICS_ENDPOINT` - OTLP metrics endpoint
- `OTEL_EXPORTER_OTLP_LOGS_ENDPOINT` - OTLP logs endpoint
- `OTEL_EXPORTER_TIMEOUT` - Export timeout in milliseconds
- `OTEL_BATCH_SIZE` - Batch size for exports
- `OTEL_QUEUE_MAX_SIZE` - Maximum queue size

### Migration Context
This service is a complete migration from .NET Core 3.1, maintaining identical API contracts while improving:
- 3-4x performance improvement
- 60% reduction in memory usage
- 5x smaller container images
- <100ms cold start times

See `MIGRATION.md` for detailed migration procedures and performance comparisons.

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
**IMPORTANT: Always run `bun run check` after code changes and before committing/pushing**

The `check` command runs:
- Biome linting and formatting
- TypeScript type checking
- Code quality validation

### Code Style Guidelines
- DO NOT use emojis and do not add comments for every single code change
- We should have minimal comments throughout the code base
- Use standardized file headers: `/* src/path/file.ts */`

### Critical Development Rules
**NEVER ASSUME OR MAKE UP PSEUDO CODE**
- NEVER assume a method exists without verifying it first
- NEVER write code based on assumptions about APIs
- ALWAYS check actual method names and signatures before using them
- ALWAYS test code snippets or use runtime inspection to verify functionality
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

### Important Reminders
- ALWAYS run `bun run check` before committing
- Use `TELEMETRY_MODE=both` for development debugging
- Monitor telemetry export success rates in development
- Test both JWT and health endpoints after changes
- Verify Kong connectivity before deployment