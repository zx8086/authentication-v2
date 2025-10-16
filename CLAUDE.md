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
  2. After committing and pushing code to git, move issue to "In Review" status
  3. Claude MUST ask user to explicitly confirm if the work is complete and ready for closure
  4. Claude MUST wait for user approval before touching issue status beyond "In Review"
  5. **THE USER DECIDES** when implementation work is complete and satisfactory
  6. User often verifies CI/CD passes and validates implementation before marking Done

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
  1. **ALWAYS read current issue first** using `mcp__linear_server__get_issue({ id: issueId })`
  2. **Extract existing description** from the current issue object
  3. **Append new content** to existing description (NEVER replace)
  4. **Use clear separators** (`---`) between existing and new content
  5. **Mark new additions** with timestamps and "UPDATE:" labels
  6. **Call update_issue** with the combined description

**CRITICAL TECHNICAL IMPLEMENTATION**:
```typescript
// ✅ CORRECT - Always preserve existing content
const currentIssue = await mcp__linear_server__get_issue({ id: issueId });
const existingDescription = currentIssue.description || "";

const updatedDescription = existingDescription +
  "\n\n---\n\n" +
  `**UPDATE [${new Date().toISOString().split('T')[0]}]**: ${newContent}`;

await mcp__linear_server__update_issue({
  id: issueId,
  description: updatedDescription
});

// ❌ WRONG - This destroys all existing content
await mcp__linear_server__update_issue({
  id: issueId,
  description: newContent  // This overwrites everything!
});
```

**LINEAR API BEHAVIOR**: The `update_issue` function **completely replaces** the description field. You MUST read existing content first and append to it manually.

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
- **Circuit Breaker**: Opossum-based Kong Admin API resilience with stale cache fallback
- **Observability**: Comprehensive OpenTelemetry instrumentation with Elastic APM integration

### Service Layer Structure
- **JWT Service** (`src/services/jwt.service.ts`): Native crypto.subtle JWT generation with HMAC-SHA256
- **Kong Service** (`src/services/kong.service.ts`): Kong Admin API integration with caching, health checks, and circuit breaker protection
- **Circuit Breaker Service** (`src/services/circuit-breaker.service.ts`): Opossum-based resilience with adaptive stale cache fallback
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
- **Rate Limiting**: Handled by Kong API Gateway at infrastructure level (not application-level)
- **Caching**: Kong consumer secret caching to reduce Admin API calls
- **Performance Monitoring**: Built-in metrics collection and reporting
- **CORS Support**: Configurable CORS with origin validation
- **Circuit Breaker**: Always-enabled Opossum-based Kong Admin API protection with stale cache fallback (SIO-45)
- **Stale Cache Resilience**: Extended service availability (up to 2 hours) during Kong outages using adaptive caching strategy
- **Performance Optimization**: .biomeignore for ~30% faster Biome code quality checks (SIO-46)
- **Telemetry Sampling**: Performed at collector level, not application level

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

**COMPREHENSIVE TEST COVERAGE (SIO-47, SIO-49, SIO-50)**:
- **Total Tests**: 260 tests (100% pass rate) across all frameworks
- **Circuit Breaker Testing**: Complete Kong failure scenario coverage with stale cache fallback testing
- **Kong Integration Testing**: Real endpoint testing (removed mocks) for Kong Konnect with circuit breaker integration
- **Performance Testing**: Enhanced K6 testing with circuit breaker scenarios under load

**CRITICAL RULE - NEVER APPLY TIMEOUTS TO TESTS**: Claude Code must NEVER apply artificial timeouts to test commands, especially K6 performance tests which are designed to run for their full duration (typically 3+ minutes). Tests must be allowed to complete naturally without time restrictions.

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

**Circuit Breaker Test Coverage (SIO-45, SIO-49, SIO-50)**:
- 26 comprehensive circuit breaker test cases with Kong failure simulation
- Stale cache fallback testing for both Redis (HA mode) and in-memory modes
- Kong Konnect integration testing with real endpoints
- Performance testing with circuit breaker scenarios under load

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

### Circuit Breaker Configuration (SIO-45)
```bash
# Circuit breaker is ALWAYS ENABLED (KISS principle)
CIRCUIT_BREAKER_TIMEOUT=500                    # Kong API timeout (ms)
CIRCUIT_BREAKER_ERROR_THRESHOLD=50             # Error threshold percentage
CIRCUIT_BREAKER_RESET_TIMEOUT=30000            # Reset timeout (ms)
STALE_DATA_TOLERANCE_MINUTES=60                # In-memory stale cache tolerance
HIGH_AVAILABILITY=true                         # Enable Redis stale cache (2-hour tolerance)
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
- `circuit_breaker_state` - Circuit breaker state (0=closed, 1=open, 2=half-open)
- `circuit_breaker_requests_total` - Circuit breaker requests by operation and result
- `circuit_breaker_rejected_total` - Circuit breaker rejections by operation
- `circuit_breaker_fallback_total` - Circuit breaker fallback usage by operation
- `cache_tier_operations` - Cache tier usage (redis-stale, in-memory)
- `cache_tier_latency` - Cache tier access latency by operation

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
curl http://localhost:3000/health/metrics              # Circuit breaker health
curl http://localhost:3000/metrics                     # Includes circuit breaker stats
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
- **Circuit breaker state transitions to "open"** (SIO-45)
- **Circuit breaker rejection rate >10%** (indicates Kong issues)
- **Stale data fallback usage >5%** (Kong degradation)
- **Cache tier errors** (Redis connectivity issues)

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

#### Performance Optimization (SIO-46)

The service includes a comprehensive `.biomeignore` file for enhanced code quality performance:

**Benefits**:
- **~30% faster Biome execution** (38 files: 21-51ms → 15-35ms)
- **Reduced memory usage** during code quality checks
- **Faster CI/CD pipelines** with optimized file discovery
- **Better IDE integration** with faster file watching

**Key Exclusions**:
- Dependencies: `node_modules/`, `bun.lockb`
- Build artifacts: `dist/`, `build/`, `coverage/`
- Environment files: `.env.*` (except `!.env.example`, `!.env.*.example`)
- Cache directories: `.cache/`, `.npm/`, `.yarn/`
- IDE files: `.vscode/`, `.idea/`, `*.swp`
- Temporary files: `tmp/`, `*.log`, `logs/`

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

### Enhanced CI/CD with Docker Cloud Builders (SIO-51)

The service now uses Docker Cloud Builders for enhanced build performance:

**Configuration**:
```yaml
# .github/workflows/build-and-deploy.yml
- name: Set up Docker Buildx
  uses: docker/setup-buildx-action@v3
  with:
    driver: cloud
    endpoint: "zx8086/cldbuild"
```

**Benefits**:
- **Enhanced Build Infrastructure**: Dedicated cloud resources for Docker builds
- **Improved ARM64 Performance**: Better cross-platform build support
- **Resource Efficiency**: Reduced GitHub Actions minutes usage
- **Enhanced Caching**: Cloud-native caching for improved build times

**Implementation Approach**:
- **KISS Principle**: Minimal 3-line addition to existing workflow
- **Preserved Features**: All security scanning, multi-platform builds, supply chain security maintained
- **Easy Rollback**: Simple to revert if needed

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

# Circuit breaker monitoring (SIO-45)
curl http://localhost:3000/health/metrics        # Circuit breaker health
curl http://localhost:3000/metrics               # Circuit breaker stats
```

#### Circuit Breaker Debugging (SIO-45)
```bash
# Monitor circuit breaker state and statistics
curl http://localhost:3000/metrics | jq '.circuitBreakers'
curl http://localhost:3000/health/metrics | jq '.circuitBreakerSummary'

# Test Kong failure scenarios (development only)
# Temporarily block Kong Admin API to trigger circuit breaker
# curl with invalid Kong credentials to simulate failures
```

### Architecture Decisions

#### Rate Limiting Strategy
**IMPORTANT**: Rate limiting is handled by Kong API Gateway at the infrastructure level, not within the authentication service. This follows microservices best practices by:
- **Separation of Concerns**: Kong handles traffic shaping, authentication service focuses on JWT generation
- **Performance**: Avoids duplicating rate limiting logic in application code
- **Scalability**: Centralized rate limiting across all services

#### Telemetry Sampling Strategy
**IMPORTANT**: Telemetry sampling is performed at the collector level, not at the application level. This approach:
- **Simplifies Application Logic**: Service focuses on generating complete telemetry data
- **Centralized Control**: Sampling policies managed at infrastructure level
- **Flexibility**: Different sampling strategies can be applied without code changes
- **Memory Pressure Handling**: Application-level memory pressure management handles volume reduction when needed

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

## Agent Directory

When working on this authentication service, use these specialized agents for optimal results:

### Primary Agents for This Project

- **Configuration management**: `config-reviewer` - 4-pillar pattern orchestrator (already implemented in `src/config/`)
- **Schema validation**: `zod-validator` - Zod v4 validation expert (extensive schemas in `src/config/schemas.ts`)
- **Bun optimization**: `bun-reviewer` - Critical for native `Bun.serve()` performance and API usage
- **Performance testing**: `k6-specialist` - Essential for validating 100k+ req/sec capability
- **Unit testing**: `bun-test-specialist` - Bun test framework patterns and TypeScript testing
- **Observability**: `observability-engineer` - OpenTelemetry integration and APM monitoring
- **Code quality**: `biome-config` - Pre-commit validation and linting standards with .biomeignore optimization
- **Circuit breaker specialist**: `couchbase-resilience-specialist` - For advanced circuit breaker patterns (if needed for Kong integration)

### Secondary Agents (invoke as needed)

- **API design**: `api-designer` - For endpoint expansion and OpenAPI specification
- **Docker containers**: `docker-reviewer` - Container optimization and multi-stage builds
- **CI/CD pipelines**: `github-deployment-specialist` - GitHub Actions workflow improvements
- **Architecture review**: `architect-reviewer` - System design validation and scalability
- **E2E testing**: `playwright-specialist` - Browser automation for authentication flows
- **Test orchestration**: `test-orchestrator` - Coordinate comprehensive testing strategies
- **Code refactoring**: `refactoring-specialist` - Safe code transformation and complexity reduction

### Kong Integration Specialists

- **Kong gateway**: `kong-konnect-engineer` - Kong Konnect configuration and deck deployment
- **API gateway**: `api-designer` - Kong plugin orchestration and authentication patterns

### Project-Specific Agent Usage

**For performance optimization**:
1. `bun-reviewer` - Optimize native Bun APIs and `Bun.serve()` patterns
2. `k6-specialist` - Validate performance under load
3. `observability-engineer` - Monitor metrics and telemetry

**For testing comprehensive coverage**:
1. `test-orchestrator` - Plan testing strategy
2. `bun-test-specialist` - Unit and integration tests
3. `playwright-specialist` - E2E authentication flows
4. `k6-specialist` - Performance and load testing

**For configuration changes**:
1. `config-reviewer` - Maintain 4-pillar pattern compliance
2. `zod-validator` - Update validation schemas
3. `biome-config` - Ensure code quality standards

**For deployment and infrastructure**:
1. `docker-reviewer` - Optimize container builds
2. `github-deployment-specialist` - Improve CI/CD workflows
3. `observability-engineer` - Enhance monitoring and alerting

### Quick Agent Reference

| Task | Primary Agent | Supporting Agents |
|------|---------------|-------------------|
| Add new endpoint | `api-designer` | `kong-konnect-engineer`, `bun-reviewer` |
| Optimize performance | `bun-reviewer` | `k6-specialist`, `observability-engineer` |
| Update configuration | `config-reviewer` | `zod-validator`, `biome-config` |
| Add comprehensive tests | `test-orchestrator` | `bun-test-specialist`, `playwright-specialist`, `k6-specialist` |
| Deploy changes | `docker-reviewer` | `github-deployment-specialist`, `observability-engineer` |
| Refactor code | `refactoring-specialist` | `biome-config`, `architect-reviewer` |

### Notes for Agent Usage

- **Always invoke `config-reviewer`** for any configuration changes to maintain the 4-pillar pattern
- **Use `bun-reviewer` proactively** for any Bun runtime optimizations or native API usage
- **Coordinate with `test-orchestrator`** when adding comprehensive testing across frameworks
- **Invoke `observability-engineer`** for any telemetry, monitoring, or APM-related changes
- **Use `k6-specialist`** for validating performance requirements (100k+ req/sec capability)
- **Circuit breaker considerations**: The service now has comprehensive circuit breaker protection - any Kong integration changes should consider circuit breaker impact
- **Performance testing**: All tests now include circuit breaker scenarios - validate Kong failure handling
- **Code quality**: .biomeignore optimization is in place - avoid modifying exclusion patterns without understanding performance impact

For complete agent capabilities and cross-project usage patterns, see the comprehensive Agent Directory in your user-level CLAUDE.md configuration.
