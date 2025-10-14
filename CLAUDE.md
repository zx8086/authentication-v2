# CLAUDE.md

This file provides guidance to Claude Code when working with this authentication service.

## Project Management

### Linear Project
This service has a dedicated Linear project for tracking all development and maintenance work:
- **Project**: Authentication Service
- **URL**: https://linear.app/siobytes/project/authentication-service-f7a13083a8cc
- **Team**: Siobytes
- **Status**: In Progress

### Git Commit Integration with Linear
**IMPORTANT**: When making git commits, use the appropriate format based on whether the work is tied to a Linear issue:

```bash
# IF working on a specific Linear issue, commit with the issue prefix, and description e.g. replace XX with issue number:
git commit -m "SIO-XX: Your commit message here"

# IF NOT tied to a specific Linear issue:
git commit -m "Descriptive commit message without issue prefix"
```

**Examples:**
```bash
# With Linear issue (if you created/assigned a ticket for this work):
git commit -m "SIO-5: Add telemetry endpoint tests"
git commit -m "SIO-31: Implement GitHub Actions concurrency controls"

# Without Linear issue (general improvements, maintenance, etc.):
git commit -m "Consolidate duplicated environment variables in GitHub Actions workflow"
git commit -m "Fix TypeScript import paths for better modularity"
git commit -m "Update Docker configuration for multi-stage builds"
```

**Benefits of linking commits:**
- Automatic updates in Linear showing related commits
- Full traceability between code changes and issues
- Git branch names auto-generated from Linear issues
- Easy navigation between Linear and GitHub

### Linear Issue Status Management
**CRITICAL RULE - NEVER VIOLATE**: Claude Code can ONLY create new issues and move them to "In Progress" status. **ABSOLUTELY NEVER** set issues to "Done" status without explicit user approval.

- ✅ **Claude CAN do**:
  - Create new Linear issues
  - **ALWAYS assign new issues to "Authentication Service" project**
  - Move issues to "In Progress" when starting work
  - Update issue descriptions with additional findings and implementation progress
- ❌ **Claude CANNOT do UNDER ANY CIRCUMSTANCES**:
  - Set issues to "Done" or "Completed"
  - Close issues without explicit user instruction
  - Mark work as complete even if implementation is finished
  - Decide when implementation work is complete
- 📋 **MANDATORY Process**:
  1. When implementation plan is executed, Claude MUST summarize what was implemented
  2. Claude MUST ask user to explicitly confirm if the work is complete and ready for closure
  3. Claude MUST wait for user approval before touching issue status
  4. **THE USER DECIDES** when implementation work is complete and satisfactory
  5. User often commits code first to verify CI/CD passes before marking Done

**REMINDER**: Implementation completion ≠ work completion. User needs to verify CI/CD, testing, quality, and explicitly approve closure. Only the user can determine if the implementation meets their requirements and standards.

### Linear Issue Content Management
**CRITICAL RULE - PRESERVE ANALYSIS**: When updating Linear issue descriptions, Claude MUST preserve existing analysis and approach sections.

- ✅ **Claude CAN do**:
  - Add new findings to existing analysis
  - Append implementation details and progress updates
  - Enhance descriptions with additional context
  - Correct factual errors while preserving original approach
- ❌ **Claude CANNOT do UNDER ANY CIRCUMSTANCES**:
  - Overwrite or replace existing analysis sections
  - Remove original problem assessment or approach suggestions
  - Delete user-provided context or requirements
  - Replace the original issue scope or methodology
- 📋 **MANDATORY Process for Updates**:
  1. Read the current issue description completely
  2. Identify existing analysis, approach, and requirements sections
  3. ADD TO (do not replace) the existing content
  4. Clearly mark new additions with timestamps or "UPDATE:" labels
  5. Preserve all original context and user-provided information

**EXAMPLE UPDATE FORMAT**:
```
[Original analysis and approach preserved]

---
**UPDATE [Date]**: Additional findings during implementation:
- [New discovery 1]
- [New discovery 2]
[Additional details while keeping original intact]
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
- **Telemetry Layer** (`src/telemetry/`): OpenTelemetry instrumentation, structured logging, metrics collection
- **Configuration** (`src/config/`): 4-pillar configuration pattern (see `config-reviewer` agent for details)

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

## CRITICAL: THIS IS A BUN PROJECT - NOT NPM/NODE

**ALWAYS REMEMBER: This project uses BUN as its runtime and package manager**
- **NEVER use npm commands** - use `bun` instead
- **NEVER use `npm install` or `npm ls`** - use `bun install` or `bun pm ls`
- **NEVER use `npx`** - use `bunx` instead
- **NEVER use node** - use `bun` instead
- Package management: `bun install`, `bun add`, `bun remove`, `bun pm ls`
- Running scripts: `bun run <script>` or just `bun <script>`
- Direct execution: `bun src/server.ts` (not `node src/server.ts`)
- The lockfile is `bun.lockb` (NOT package-lock.json or yarn.lock)

## Quick Reference Commands

### Development
```bash
bun run dev              # Development server with hot reload
bun run start            # Production server
bun run build            # Build for production
bun run typecheck        # TypeScript type checking
bun run biome:check      # Code quality (see biome-config agent)
bun run health-check     # Health check endpoint
bun run generate-docs    # Generate OpenAPI documentation
bun run test:clean       # Clean test results and artifacts
```

### Testing
For detailed testing configuration and patterns, see specialized agents:
- **Test Orchestration**: Use `test-orchestrator` agent
- **Unit & Integration Tests**: Use `bun-test-specialist` agent
- **E2E Browser Tests**: Use `playwright-specialist` agent
- **Performance Testing**: Use `k6-specialist` agent

```bash
bun run bun:test         # Run all unit tests
bun run bun:test:watch   # Watch mode for TDD
bun run bun:test:coverage # Coverage reports

bun run playwright:test  # E2E tests
bun run playwright:ui    # Interactive E2E testing UI

bun run k6:smoke:health  # Performance smoke tests
bun run k6:load          # Production load simulation
bun run k6:stress        # System breaking point tests
bun run k6:info          # Display all K6 test options

# K6 Convenience Scripts
bun run k6:quick         # Quick smoke tests (health + tokens)
bun run k6:full          # Full test suite (all smoke, load, stress, spike)

# Individual K6 Test Categories
bun run k6:smoke:metrics    # Metrics endpoint smoke test
bun run k6:smoke:openapi    # OpenAPI endpoint smoke test
bun run k6:smoke:tokens     # Token generation smoke test
bun run k6:smoke:all-endpoints # All endpoints smoke test
bun run k6:spike            # Traffic spike testing
```

### Test Consumer Management
**Automatic Setup**: Test consumers are automatically provisioned during test execution. No manual setup required.

#### Recent Updates (October 2025)
**Standardized Test Consumer Management**: Implemented automatic test consumer setup across all test frameworks (Bun, Playwright, K6):
- Centralized consumer configuration in `test/shared/test-consumers.ts`
- Automatic setup hooks provision consumers before tests
- Idempotent operations (safe to run multiple times)
- Intelligent dependencies (only tests needing Kong consumers perform setup)
- Consistent test data across all frameworks (5 test consumers + 1 anonymous)

## Environment Configuration

### File Structure
```
.env                    # Your local development (NODE_ENV=local)
.env.dev                # Development environment
.env.stg                # Staging environment
.env.prod               # Production environment
.env.test              # Test environment (with console logs)

.env.example           # Template for .env file (committed to git)
.env.*.example         # Template files for each environment (committed to git)
```

### How Bun Loads Environment Files
1. **Always loads `.env` first** (your local settings)
2. **Then loads environment-specific file** based on NODE_ENV:
   - `NODE_ENV=local` → uses `.env` only (your local machine)
   - `NODE_ENV=development` → loads `.env` then `.env.dev` (overrides)
   - `NODE_ENV=staging` → loads `.env` then `.env.stg` (overrides)
   - `NODE_ENV=production` → loads `.env` then `.env.prod` (overrides)
   - `NODE_ENV=test` → loads `.env` then `.env.test` (overrides)

### Usage Examples
```bash
# Local development (your machine)
bun run dev                              # Uses .env with NODE_ENV=local

# Development environment
NODE_ENV=development bun run dev         # Uses .env + .env.dev

# Test mode with console logs
NODE_ENV=test bun run dev                # Uses .env + .env.test

# Production mode
NODE_ENV=production bun run start        # Uses .env + .env.prod
```

### Core Service Settings
```bash
PORT=3000
NODE_ENV=local|development|staging|production|test

KONG_JWT_AUTHORITY=https://auth.example.com
KONG_JWT_AUDIENCE=api.example.com
KONG_JWT_ISSUER=auth.example.com
KONG_JWT_KEY_CLAIM_NAME=key
JWT_EXPIRATION_MINUTES=15

KONG_MODE=API_GATEWAY|KONNECT
KONG_ADMIN_URL=https://kong-admin:8001
KONG_ADMIN_TOKEN=<minimum 32 characters in production>
```

### OpenTelemetry Configuration
```bash
TELEMETRY_MODE=console|otlp|both
OTEL_SERVICE_NAME=authentication-service
OTEL_SERVICE_VERSION=1.0.0
OTEL_EXPORTER_OTLP_ENDPOINT=https://apm.example.com
OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=https://apm.example.com/v1/traces
OTEL_EXPORTER_OTLP_METRICS_ENDPOINT=https://apm.example.com/v1/metrics
OTEL_EXPORTER_OTLP_LOGS_ENDPOINT=https://apm.example.com/v1/logs
OTEL_EXPORTER_OTLP_TIMEOUT=30000
OTEL_BSP_MAX_EXPORT_BATCH_SIZE=2048
OTEL_BSP_MAX_QUEUE_SIZE=10000
```

### Testing Configuration
See specialized testing agents for complete configuration details:
- **Playwright E2E**: `playwright-specialist` agent
  - `API_BASE_URL` - Base URL for E2E tests (default: http://localhost:3000)
- **K6 Performance**: `k6-specialist` agent
  - `TARGET_HOST`, `TARGET_PORT`, `TARGET_PROTOCOL` - Target service configuration
  - `K6_SMOKE_VUS`, `K6_LOAD_TARGET_VUS`, `K6_STRESS_VUS` - Test load parameters
  - `K6_*_P95_THRESHOLD`, `K6_ERROR_RATE_THRESHOLD` - Performance thresholds
- **Bun Unit Tests**: `bun-test-specialist` agent
  - Test timeout, coverage, and execution configuration

### Configuration Management
For configuration architecture, schema validation, and the 4-pillar pattern:
- **Configuration patterns**: Use `config-reviewer` agent
- **Schema validation**: Use `zod-validator` agent

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

### Key Metrics
- `nodejs.eventloop.delay` - Event loop utilization percentage
- `process.memory.usage` - Memory usage by type (heap_used, heap_total, rss, external)
- `process.cpu.usage` - CPU utilization percentage
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
curl -X POST http://localhost:3000/debug/metrics/test
curl -X POST http://localhost:3000/debug/metrics/export
curl http://localhost:3000/debug/metrics/stats
curl http://localhost:3000/health/telemetry
```

## Deployment & Production

### Production Considerations
- **Memory Usage**: ~50-80MB baseline with telemetry enabled
- **CPU Overhead**: <2% additional overhead for full observability
- **Network**: Metrics export every 10 seconds, logs exported in batches
- **Container Optimized**: <100MB image size, <100ms cold start
- **Graceful Shutdown**: Proper telemetry cleanup on SIGTERM

### Monitoring Alerts
Recommended alerts based on available metrics:
- High event loop delay (>100ms sustained)
- Memory usage >80% of container limit
- HTTP error rate >5%
- Kong API failures
- Cache miss rate >50%
- Export failures in telemetry

## Code Quality & Development

### Pre-Commit Checklist
Run `bun run biome:check` before commits. For Biome configuration details, see `biome-config` agent.

The `biome:check` command runs:
- Biome linting and formatting
- TypeScript type checking
- Code quality validation

### Code Style Guidelines
- NO emojis in code or logs
- Minimal comments (no excessive JSDoc)
- Standardized file headers: `/* src/path/file.ts */`

### Development Guidelines
- Verify method existence before use
- Check actual method names and signatures
- Test code snippets with runtime inspection
- Use `console.log()` for API exploration when unsure
- Example: `console.log('Available methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(instance)))`

### Bun Runtime Optimization
For Bun-specific runtime optimization and native API usage, see `bun-reviewer` agent:
- Native `Bun.serve()` routes API patterns
- `Bun.file()`, `Bun.spawn()` optimization
- Performance measurement with `Bun.nanoseconds()`
- Runtime detection patterns

## Local Development Setup

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
bun run biome:check:unsafe
```

### Docker Deployment Commands
```bash
# Build Docker image
bun run docker:build

# Environment-specific deployment
bun run docker:local        # Local development deployment
bun run docker:dev          # Development environment deployment
bun run docker:staging      # Staging environment deployment
bun run docker:production   # Production environment deployment

# Stop specific deployments
bun run docker:stop:local
bun run docker:stop:dev
bun run docker:stop:staging
bun run docker:stop:production

# Direct Docker run commands (without rebuild)
bun run docker:run:local    # Run with .env
bun run docker:run:dev      # Run with .env.dev
bun run docker:run:staging  # Run with .env.stg
bun run docker:run:production # Run with .env.prod
```

### Debugging & Troubleshooting

#### Common Development Issues
1. **Port Already in Use**: Run `bun run kill-server` to clean up processes
2. **Telemetry Errors**: Check OTLP endpoints are reachable and credentials are correct
3. **Kong Connection Issues**: Verify `KONG_ADMIN_URL` and `KONG_ADMIN_TOKEN` in `.env`
4. **Rate Limiting**: Adjust `RATE_LIMIT_*` settings for development load

#### Telemetry Debugging
```bash
curl http://localhost:3000/health/telemetry
curl -X POST http://localhost:3000/debug/metrics/test
curl http://localhost:3000/debug/metrics/stats
curl -X POST http://localhost:3000/debug/metrics/export

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

For comprehensive performance testing scenarios, see `k6-specialist` agent.

## Getting Help with Specialized Tasks

This project uses specialized agents for technical domains:

### Configuration & Validation
- **Configuration management**: `config-reviewer` agent - 4-pillar configuration pattern
- **Schema validation**: `zod-validator` agent - Zod v4 schemas and validation
- **Code quality**: `biome-config` agent - Biome linting and formatting setup

### Testing & Quality
- **Unit testing**: `bun-test-specialist` agent - Bun test framework and patterns
- **E2E testing**: `playwright-specialist` agent - Browser automation and visual testing
- **Performance testing**: `k6-specialist` agent - Load, stress, and spike testing
- **Test orchestration**: `test-orchestrator` agent - Cross-framework test coordination

### Runtime & Deployment
- **Bun optimization**: `bun-reviewer` agent - Native Bun API usage and performance
- **Docker containers**: `docker-reviewer` agent - Container optimization and deployment
- **CI/CD pipelines**: `github-deployment-specialist` agent - GitHub Actions workflows

When working on these specific areas, invoke the relevant specialist agent for detailed guidance and best practices.
