# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Documentation Reference

For detailed information, refer to the **[Documentation Index](docs/README.md)**.

### Quick Links
| Category | Document | Description |
|----------|----------|-------------|
| Getting Started | [getting-started.md](docs/development/getting-started.md) | Development setup and workflow |
| API Reference | [endpoints.md](docs/api/endpoints.md) | Complete API documentation (15 endpoints) |
| Configuration | [environment-setup.md](docs/configuration/environment-setup.md) | Environment variables and 4-pillar configuration |
| Deployment | [docker.md](docs/deployment/docker.md) | Container builds and deployment |
| Testing | [testing.md](docs/development/testing.md) | Testing strategy (210+ tests) |
| Kong Test Setup | [kong-test-setup.md](docs/development/kong-test-setup.md) | Test consumers, API keys, and Kong configuration |
| Monitoring | [monitoring.md](docs/operations/monitoring.md) | OpenTelemetry observability |
| SLA | [SLA.md](docs/operations/SLA.md) | Performance SLAs and monitoring thresholds |
| Troubleshooting | [TROUBLESHOOTING.md](docs/operations/TROUBLESHOOTING.md) | Runbook for common operational issues |
| Security | [PARALLEL-SECURITY-SCANNING.md](docs/security/PARALLEL-SECURITY-SCANNING.md) | CI/CD security scanning |

## Core Practices

### Universal Code Standards
- **ABSOLUTELY NO EMOJIS ANYWHERE** - No emojis in code, logs, comments, documentation, commit messages, or any output

### Terminology
- **Issue = Ticket = Linear Issue**: Use consistent terminology for Linear items

### Research Protocol
1. **Primary**: `mcp__perplexity__perplexity_research` for comprehensive research
2. **Fallback**: `mcp__perplexity__perplexity_search` for targeted searches
3. **Alternative**: `mcp__perplexity__perplexity_ask` for specific questions

### Code Validation
**MANDATORY**: Use Context7 for code/syntax validation:
1. `mcp__context7__resolve-library-id` to find library identifiers
2. `mcp__context7__get-library-docs` for up-to-date syntax/patterns

## Project Management

### Linear Project
- **URL**: https://linear.app/siobytes/project/authentication-service-f7a13083a8cc
- **Team**: Siobytes
- **Project**: Authentication Service

### Git Commits
```bash
# With Linear issue:
git commit -m "SIO-XX: Your commit message"

# Without Linear issue:
git commit -m "Descriptive commit message"
```

### Critical Rules

#### Git Commit Authorization
**NEVER commit without explicit user authorization**
- ALLOWED: Stage changes, show status, prepare messages
- NOT ALLOWED: Auto-commit, auto-push, decide when ready
- Exception: Slash commands (`/commit-push`) ARE authorization

#### Linear Issue Management
**NEVER set issues to "Done" without user approval**
- ALLOWED: Create issues, move to "In Progress", update descriptions
- NOT ALLOWED: Close issues, mark complete, decide completion
- User decides when work is complete and ready for closure

#### Linear Issue Updates
**ALWAYS preserve existing content when updating**
```typescript
// CORRECT
const currentIssue = await mcp__linear_server__get_issue({ id: issueId });
const updatedDescription = currentIssue.description + "\n\n---\n\n" + newContent;

// WRONG
description: newContent  // Destroys existing content!
```

#### Plan Mode and Linear Issues
**ALWAYS create/update a Linear issue when a plan is approved**
- When exiting plan mode with an approved plan, ensure a Linear issue exists with the full plan details
- Include: phases, milestones, acceptance criteria, files to modify/create
- Update existing issues if one already exists for the work
- This provides traceability between approved plans and implementation

## Architecture Overview

High-performance authentication service using Bun runtime with 100% API compatibility.

### Core Stack
- **Runtime**: Bun native (`Bun.serve()` - 100k+ req/sec)
- **JWT**: `crypto.subtle` Web API (HMAC-SHA256)
- **Kong**: Native `fetch` with caching + circuit breaker
- **Observability**: OpenTelemetry + Elastic APM
- **API Versioning**: Header-based (`Accept-Version: v1|v2`)

### Key Features
- Circuit breaker with stale cache fallback (SIO-45)
- Comprehensive testing (210+ tests: 178 unit + 32 E2E + K6 performance suite, 100% pass rate)
- Structured error codes (AUTH_001-012) for client consumption
- Security headers + audit logging (v2 only)
- License compliance check (593x faster than legacy)
- Multi-stage Docker builds with distroless base (security-hardened)

### External Dependencies (Not Implemented in This Service)
- **Rate Limiting**: Handled by Kong API Gateway - DO NOT implement in this service
- **Authentication Routing**: Managed by Kong - this service only generates/validates JWTs
- **Traffic Management**: Kong handles load balancing, retries at gateway level

## Critical Runtime Requirements

**THIS IS A BUN PROJECT - NOT NPM/NODE**
- Use `bun` not `npm/node/npx`
- Commands: `bun install`, `bun run`, `bun src/index.ts` (NOT server.ts)
- Lockfile: `bun.lockb`
- Entry point: `src/index.ts` (uses `import.meta.main` for conditional execution)

## Quick Commands

### Development
```bash
bun run dev              # Development server with hot reload
bun run start            # Production server (src/index.ts)
bun run typecheck        # TypeScript checking
bun run quality:check    # Full quality check (TypeScript + Biome + YAML)
bun run quality:fix      # Auto-fix quality issues
```

### Testing
```bash
# Unit Tests (Bun)
bun run bun:test                # All unit tests (178 tests across 10 files)
bun run bun:test:concurrent     # Parallel execution (4 workers)
bun run bun:test:watch          # Watch mode

# E2E Tests (Playwright)
bun run playwright:test         # All E2E tests (32 tests across 3 files)
bun run playwright:ui           # Interactive test UI

# Performance Tests (K6)
bun run k6:quick               # Health + tokens smoke tests
bun run k6:smoke:health        # Health endpoint only
bun run k6:smoke:tokens        # JWT token generation
bun run k6:load                # Load testing
bun run k6:stress              # Stress testing

# Full Test Suite
bun run test:suite             # All tests: Bun + Playwright + K6
```

### Debugging
```bash
curl http://localhost:3000/health           # Health check
curl -H "Accept-Version: v2" http://localhost:3000/health  # V2 with security headers
curl http://localhost:3000/metrics          # Performance metrics
bun run health-check                        # Automated health check
bun run kill-server                         # Kill any running server on port 3000
```

### Docker Operations
```bash
# Build and Run
bun run docker:build             # Build with metadata and caching
bun run docker:local             # Build and run locally
bun run docker:dev               # Build and run for development

# Security Validation
bun run docker:security:full     # Complete security validation
bun run docker:security:trivy    # Trivy vulnerability scan
```

## Environment Configuration

### Structure
```
.env         # Local development (NODE_ENV=local)
.env.dev     # Development environment
.env.stg     # Staging environment
.env.prod    # Production environment
.env.test    # Test environment
```

### Key Variables
```bash
NODE_ENV=local|development|staging|production|test
PORT=3000
KONG_MODE=API_GATEWAY|KONNECT
KONG_ADMIN_URL=https://kong-admin:8001
TELEMETRY_MODE=console|otlp|both
```

## API Versioning

### V1 (Original)
- Standard headers only
- No security enhancements
- Backward compatible

### V2 (Enhanced Security - SIO-58)
- All v1 features PLUS:
- OWASP security headers (HSTS, CSP, X-Frame-Options, etc.)
- Enhanced JWT audit logging
- Security event monitoring
- **No configuration needed - works out of the box**

### Usage
```bash
# V1 endpoint
curl -H "Accept-Version: v1" http://localhost:3000/health

# V2 endpoint (with security headers)
curl -H "Accept-Version: v2" http://localhost:3000/health
```

## Specialized Agents

When working on specific areas, use these agents:

### Primary Agents
- `config-reviewer` - 4-pillar configuration patterns
- `bun-reviewer` - Bun runtime optimization
- `test-orchestrator` - Comprehensive testing strategy
- `observability-engineer` - OpenTelemetry monitoring

### Testing Agents
- `bun-test-specialist` - Unit/integration tests
- `playwright-specialist` - E2E browser tests
- `k6-specialist` - Performance/load testing

### Infrastructure Agents
- `docker-reviewer` - Container optimization
- `github-deployment-specialist` - CI/CD workflows
- `kong-konnect-engineer` - Kong configuration

## Development Guidelines

### Code Quality
- **ABSOLUTELY NO EMOJIS ANYWHERE** - code, logs, comments, documentation, commits
- Minimal comments (no excessive JSDoc)
- Run `bun run biome:check` before commits

### Security
- NEVER hardcode secrets in tests
- Use `TestConsumerSecretFactory` from `test/shared/test-consumer-secrets.ts`
- Run `bunx snyk test` for security scanning

### Server Management
**ALWAYS check if service is running before starting new processes**
```bash
# Check first
curl -s http://localhost:3000/health > /dev/null 2>&1

# Only start if not running
bun src/index.ts &

# Or use helper commands
bun run kill-server && bun run dev    # Clean restart
```

### Testing Rules
- **ZERO FAILING TESTS POLICY**: We do not accept ANY failing tests. All tests must pass before proceeding with any development work
- **NEVER apply artificial timeouts to tests**
- Let K6 performance tests run their full duration
- Tests are designed to complete naturally
- **MANDATORY**: Fix all test failures immediately before continuing development

### CI/CD Workflow Rules
- **NEVER add timeouts to critical installation steps** (Playwright browsers, dependencies)
- Failing workflows due to artificial timeouts is counterproductive
- Let operations complete naturally - optimize the operation, not restrict the time
- Only use timeouts for known quick operations (cache, checkout, etc.)

### CI/CD Architecture
**Single Consolidated Workflow**: All quality checks, testing, building, and security scanning in one optimized pipeline:
- **build-and-deploy.yml**: Comprehensive CI/CD with parallel security scans
- **security-audit.yml**: Dedicated security auditing workflow
- No duplicate workflows - quality checks run once per build
- 5 parallel security scans: Snyk (code + container), Trivy, Docker Scout, License compliance

## Production Considerations

### Performance
- Memory: ~50-80MB baseline
- CPU: <2% overhead with full observability
- Cold start: <100ms

### Monitoring Alerts
- Event loop delay >100ms
- Memory usage >80%
- HTTP error rate >5%
- Kong API failures
- Circuit breaker state changes

### Observability Cost Management
**CONTEXT**: This service has telemetry collectors in place that manage data volume and costs at the infrastructure level.

**Current Status**: OpenTelemetry sampling is NOT needed at the application level because:
- Telemetry collectors handle intelligent sampling upstream
- Infrastructure-level cost controls are already implemented
- Application maintains full observability for debugging and business metrics
- Cost optimization is managed by the collector pipeline, not application configuration

**Guidance**: Do NOT implement application-level OpenTelemetry sampling unless specifically requested. The current comprehensive telemetry approach is intentional and cost-managed through collector infrastructure.

## Production Readiness

**Status: 10/10 Production Ready**

| Category | Status | Details |
|----------|--------|---------|
| Security | Complete | OWASP headers, audit logging, no hardcoded secrets |
| Testing | Complete | 210+ tests (178 unit + 32 E2E), 100% pass rate |
| Observability | Complete | OpenTelemetry traces, metrics, logs |
| Error Handling | Complete | Structured error codes (AUTH_001-012), circuit breaker |
| Documentation | Complete | OpenAPI spec, API docs, comprehensive guides |
| Configuration | Complete | 4-pillar pattern, .env.example comprehensive |
| Docker | Complete | Multi-stage distroless builds, security hardened |
| CI/CD | Complete | Parallel security scanning, consolidated workflow |

### Structured Error Codes

The service uses standardized error codes for client consumption:

| Code | HTTP Status | Description |
|------|-------------|-------------|
| AUTH_001 | 401 | Missing Consumer Headers |
| AUTH_002 | 401 | Consumer Not Found |
| AUTH_003 | 500 | JWT Creation Failed |
| AUTH_004 | 503 | Kong API Unavailable |
| AUTH_005 | 503 | Circuit Breaker Open |
| AUTH_006 | 429 | Rate Limit Exceeded |
| AUTH_007 | 400 | Invalid Request Format |
| AUTH_008 | 500 | Internal Server Error |
| AUTH_009 | 401 | Anonymous Consumer |
| AUTH_010 | 401 | Token Expired |
| AUTH_011 | 400 | Invalid Token |
| AUTH_012 | 400 | Missing Authorization |

### Known Tooling Limitations

**Mutation Testing (SIO-276)**: The `stryker-mutator-bun-runner` package has an ENOEXEC bug when Stryker (Node.js) spawns Bun processes. This is an external tooling limitation, not a code quality issue. Tracked for upstream reporting.

## Recent Architectural Improvements

### SIO-272: Structured Error Codes
- Implemented 12 standardized error codes (AUTH_001-012)
- Added to OpenAPI specification for client documentation
- Consistent error response format across all endpoints

### SIO-70: TypeScript Type Safety Architecture Refactoring
- **Phase 3 Complete**: Eliminated all 37 `as any` instances from src directory
- Type-safe OpenTelemetry metrics interfaces with runtime validation
- Enhanced enum validation patterns for metric attributes
- Zero breaking changes maintained across 210+ tests

### Docker Container Optimization
- **Entry Point Fix**: Changed from `src/server.ts` to `src/index.ts`
- Eliminates double startup issues and circular import problems
- Uses proper conditional execution via `import.meta.main`
- Multi-stage distroless builds for security hardening

### Workflow Consolidation
- Eliminated duplicate code quality workflows
- Single comprehensive CI/CD pipeline in `build-and-deploy.yml`
- Parallel security scanning matrix (5 concurrent scans)
- ~60-70% improvement in pipeline execution time

### Production Readiness Improvements (Latest)
- **Circular Dependency Fix**: Created `src/types/circuit-breaker.types.ts` to break config -> service -> metrics cycle
- **Memory Leak Fixes**: Added shutdown functions for all intervals:
  - `shutdownConsumerVolume()` - Consumer tracking cleanup
  - `shutdownCardinalityGuard()` - Cardinality guard cleanup
  - `shutdownTelemetryCircuitBreakers()` - Circuit breaker cleanup
- **W3C Trace Context Propagation**: Kong API calls now include `traceparent` and `tracestate` headers via `createStandardHeaders()`
- **Dead Code Removal**: Removed unused files (`metrics-backup.ts`, `shared-circuit-breaker.service.ts`)
- **Header Validation**: Added 256 character max length validation for consumer headers (security hardening)
- **Documentation**: Added SLA.md and TROUBLESHOOTING.md for operations teams
