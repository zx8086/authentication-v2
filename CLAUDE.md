# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## CRITICAL: Live Environment Testing Strategy

**ALL TESTS USE LIVE ENDPOINTS - NO MOCKS UNLESS EXPLICITLY STATED**

This project follows a **live environment testing strategy**:
- Tests connect to REAL Kong instances (not Docker, not mocks)
- Tests connect to REAL Redis instances (when available)
- Tests connect to REAL OpenTelemetry collectors
- Configuration comes from `.env` file with LIVE endpoints

**Kong Configuration:**
- Live Kong Admin URL: `http://192.168.178.3:30001` (from `.env`)
- Tests read `KONG_ADMIN_URL` from environment variables
- Tests gracefully skip if live Kong is unavailable
- **NEVER hardcode `http://kong:8001` or `http://localhost:8001`** in tests
- **Automatic Curl Fallback**: `fetchWithFallback()` handles Bun networking bugs with remote IPs
  - See `docs/development/profiling.md` Bun Fetch Curl Fallback section for details
  - No manual SSH/kubectl port forwarding needed

**Test Environment Variables:**
- Loaded via `test/preload.ts` before tests run
- All tests inherit live configuration from `.env`
- Unit tests that need isolation should use proper mocks, NOT env var pollution

**When Mocking:**
- Explicit mocks are ONLY used when specifically requested
- Mock implementations must be clearly labeled in code comments
- Default assumption: tests use live services

## Documentation Reference

For detailed information, refer to the **[Documentation Index](docs/README.md)**.

### Quick Links
| Category | Document | Description |
|----------|----------|-------------|
| Getting Started | [getting-started.md](docs/development/getting-started.md) | Development setup, commands, and workflow |
| API Reference | [endpoints.md](docs/api/endpoints.md) | Complete API documentation (16 endpoints) |
| Architecture | [overview.md](docs/architecture/overview.md) | System design and authentication flow |
| Configuration | [environment.md](docs/configuration/environment.md) | Environment variables and 4-pillar configuration |
| Testing | [testing.md](docs/development/testing.md) | Complete testing guide (2954 tests, mutation testing) |
| Profiling | [profiling.md](docs/development/profiling.md) | Profiling workflows and Bun fetch workaround |
| Deployment | [container-security.md](docs/deployment/container-security.md) | DHI migration, security, and CVE remediation |
| Monitoring | [monitoring.md](docs/operations/monitoring.md) | OpenTelemetry traces/metrics/logs, 65 instruments, tracer API |
| SLA | [sla.md](docs/operations/sla.md) | Performance SLAs and monitoring thresholds |
| Troubleshooting | [troubleshooting.md](docs/operations/troubleshooting.md) | Runbook, error codes, and FAQ |

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
**MANDATORY: ALL APPROVED PLANS MUST HAVE A LINEAR ISSUE**
- When a plan is approved and you exit plan mode, you MUST create a Linear issue BEFORE starting implementation
- This is NON-NEGOTIABLE - no implementation work begins without a tracked Linear issue
- Include in the issue: phases, milestones, acceptance criteria, files to modify/create
- Update existing issues if one already exists for the work
- This provides traceability between approved plans and implementation
- The Linear issue ID should be used in all related commits (e.g., `SIO-XXX: commit message`)

## Architecture Overview

High-performance authentication service using Bun runtime with 100% API compatibility.

### Core Stack
- **Runtime**: Bun native (`Bun.serve()` - 100k+ req/sec)
- **JWT**: `crypto.subtle` Web API (HMAC-SHA256, RFC 7519 compliant)
- **Kong**: Native `fetch` with caching + circuit breaker
- **Observability**: OpenTelemetry + Elastic APM
- **API Versioning**: Header-based (`Accept-Version: v1|v2`)

### JWT Token Format (RFC 7519 Compliant)

The Bun service generates JWT tokens that are **RFC 7519 compliant** for maximum interoperability:

**Required Claims**:
```json
{
  "sub": "user@example.com",
  "key": "consumer_key",
  "jti": "unique-token-id",
  "iat": 1768915398,
  "nbf": 1768915398,
  "exp": 1768916298,
  "iss": "http://sts.pvhcorp.com/",
  "aud": "http://api.pvhcorp.com/",  // String for single audience
  "name": "user@example.com",
  "unique_name": "pvhcorp.com#user@example.com"
}
```

**Multiple Audiences** (RFC 7519 compliant):
```json
{
  "aud": ["http://api.pvhcorp.com/", "http://api.pvh.com/"]  // Array for multiple audiences
}
```

**RFC 7519 Compliance**:
- **`nbf` (Not Before)**: Included for backward compatibility with JWT validators
- **`aud` (Audience)**: String for single audience, array for multiple (per RFC 7519 §4.1.3)
- **`iat` (Issued At)**: Number format (seconds since epoch)
- **Standard Claims**: All claims follow JWT specification

**Drop-in Replacement**: Standard JWT validation libraries will handle both single and multiple audience formats correctly.

### Key Features
- Circuit breaker with stale cache fallback
- Comprehensive testing (2954 tests, 100% pass rate)
- Chaos engineering tests (57 tests for Kong, Redis, resource, network failures)
- Structured error codes (AUTH_001-012)
- Security headers + audit logging (v2 only)
- Multi-stage Docker builds with distroless base (DHI, 0 CVEs)
- RFC 7807 Problem Details error format
- RFC 8594 Sunset headers for API deprecation
- **Redis Distributed Tracing**: Full trace hierarchy (HTTP → Kong → JWT → Redis)
  - See `docs/operations/monitoring.md` Redis Trace Hierarchy section
  - Commit f4bc0d5: Fixed Redis instrumentation trace context propagation

### External Dependencies (Not Implemented in This Service)
- **Rate Limiting**: Handled by Kong API Gateway
- **Authentication Routing**: Managed by Kong
- **Traffic Management**: Kong handles load balancing, retries

For detailed architecture, see [overview.md](docs/architecture/overview.md).

## Critical Runtime Requirements

**THIS IS A BUN PROJECT - NOT NPM/NODE**
- Use `bun` not `npm/node/npx`
- Commands: `bun install`, `bun run`, `bun src/index.ts` (NOT server.ts)
- Lockfile: `bun.lockb`
- Entry point: `src/index.ts` (uses `import.meta.main` for conditional execution)

## Essential Commands

```bash
# Development
bun run dev              # Development server with hot reload
bun run dev:quickstart   # Kill server, generate docs, start dev
bun run start            # Production server

# Quality Checks (Bun v1.3.9+ Parallel Execution)
bun run quality:check        # Parallel: typecheck, biome, yaml (17% faster)
bun run quality:check:all    # Include license check, non-blocking
bun run pre-commit           # Run before committing
bun run pre-commit:fast      # Quick check (parallel biome + typecheck)

# Testing (see test/README.md for complete documentation)
bun run test:bun             # Unit + integration tests (2954 tests)
bun run test:e2e             # E2E tests (3 suites)
bun run test:k6:quick        # Performance smoke tests
bun run test:k6:smoke:basic  # Parallel health, metrics, openapi (40% faster)
bun run test:suite           # Full suite with parallel E2E + K6 (44% faster)

# Validation Workflows
bun run validate:fast    # Quick validation (parallel quality + tests)
bun run validate:full    # Complete validation including Docker security

# Docker
bun run docker:build             # Build container
bun run docker:local             # Build and run locally
bun run docker:workflow:local    # Stop, build, run (sequential)
```

For complete command reference, see [getting-started.md](docs/development/getting-started.md).

## Profiling Workflows

The service includes production-safe profiling infrastructure using Bun's native profiling features.

### Quick Start
```bash
# Profile token generation scenario
bun run profile:scenario:tokens

# Profile during K6 tests
ENABLE_PROFILING=true bun run test:k6:smoke:health

# View enhanced analysis with recommendations
# (automatically displayed after profiling)
```

### Key Features
- **Bun Native Profiling**: CPU and heap profiling with markdown output
- **Automatic Analysis**: Pattern detection and actionable optimization recommendations
- **SLA Monitoring**: Automatic profiling triggered on P95/P99 violations
- **Production Safety**: 2% CPU overhead limit, 1GB storage quota, max 1 concurrent session
- **K6 Integration**: Profile during performance tests automatically

### Common Workflows
1. **Optimize Endpoint**: Profile → Analyze recommendations → Implement fix → Re-profile
2. **Production Investigation**: Enable SLA monitor → Auto-trigger on slow requests → Review profiles
3. **Performance Testing**: Run K6 with ENABLE_PROFILING=true → Review bottlenecks
4. **Memory Leak Detection**: Long-duration profiling → Check heap growth → Fix leaks

### Profiling Output
```markdown
### ⚠️ HIGH: Kong Cache
**Issue**: Kong consumer lookups consuming 23.1% CPU time (target: <15%)
**Expected Impact**: -10-15ms P95 latency, -20% Kong API calls
**Action Items**:
1. Increase CACHING_TTL_SECONDS from 300 to 600
2. Review cache invalidation logic in src/services/kong/consumer.service.ts
3. Monitor metric: kong_cache_hits_total / kong_operations_total
```

### Configuration
```bash
# Enable continuous profiling (monitors SLA violations)
CONTINUOUS_PROFILING_ENABLED=true
CONTINUOUS_PROFILING_AUTO_TRIGGER_ON_SLA=true
CONTINUOUS_PROFILING_THROTTLE_MINUTES=60
```

For complete profiling documentation, see [profiling.md](docs/development/profiling.md).

## API Versioning

| Version | Features |
|---------|----------|
| V1 | Standard headers, backward compatible |
| V2 | V1 + OWASP security headers, audit logging |

```bash
curl -H "Accept-Version: v1" http://localhost:3000/health  # V1
curl -H "Accept-Version: v2" http://localhost:3000/health  # V2 with security headers
```

## Specialized Agents

When working on specific areas, use these agents:

| Agent | Use Case |
|-------|----------|
| `config-reviewer` | 4-pillar configuration patterns |
| `bun-reviewer` | Bun runtime optimization |
| `test-orchestrator` | Comprehensive testing strategy |
| `observability-engineer` | OpenTelemetry monitoring |
| `bun-test-specialist` | Unit/integration tests |
| `playwright-specialist` | E2E browser tests |
| `k6-specialist` | Performance/load testing |
| `docker-reviewer` | Container optimization |
| `github-deployment-specialist` | CI/CD workflows |
| `kong-konnect-engineer` | Kong configuration |

## Development Guidelines

### Code Quality
- **ABSOLUTELY NO EMOJIS ANYWHERE**
- Minimal comments (no excessive JSDoc)
- Run `bun run biome:check` before commits

### Security
- NEVER hardcode secrets in tests
- Use `TestConsumerSecretFactory` from `test/shared/test-consumer-secrets.ts`

### Server Management
**ALWAYS check if service is running before starting new processes**
```bash
curl -s http://localhost:3000/health > /dev/null 2>&1  # Check first
bun run server:kill && bun run dev                      # Clean restart
```

### Testing Rules
- **ZERO FAILING TESTS POLICY**: All tests must pass before proceeding
- **NEVER apply artificial timeouts to tests**
- **MANDATORY**: Fix all test failures immediately

For mutation testing guidelines, see [testing.md](docs/development/testing.md#4-mutation-testing-with-strykerjs).

**Mutation Testing Commands:**
```bash
# Full mutation testing (79 minutes baseline)
bun run test:mutation:fresh

# Incremental run (26 seconds with cache)
bun run test:mutation

# Dry run only (no mutations)
bun run test:mutation:dry

# With Kong integration
bun run test:mutation:with-kong
```

**Mutation Testing Documentation:**
- `docs/development/testing.md` - Complete testing guide including mutation testing (Section 5-6)

### CI/CD Rules
- **NEVER add timeouts to critical installation steps**
- Let operations complete naturally
- Single consolidated workflow in `build-and-deploy.yml`

## Structured Error Codes

| Code | HTTP | Description |
|------|------|-------------|
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

For troubleshooting each error, see [troubleshooting.md](docs/operations/troubleshooting.md).

## Production Readiness

**Status: 9.5/10 Production Ready - Exceptional Quality**

| Category | Status |
|----------|--------|
| Security | OWASP headers, audit logging, no hardcoded secrets, 0 CVEs, CodeQL |
| Testing | 2954 tests (live backend + 57 chaos tests), 100% pass rate |
| Observability | OpenTelemetry traces, metrics, logs |
| Error Handling | RFC 7807 Problem Details, structured error codes, circuit breaker |
| Documentation | OpenAPI spec, RFC 8594 Sunset headers, RTO/RPO targets |
| Docker | DHI distroless base (0 CVEs, 12/12 security score, SLSA Level 3) |
| CI/CD | Parallel security scanning (5 scanners + CodeQL) |
| Kubernetes | PDB, HPA, 22 Prometheus AlertManager rules, External Secrets options |

For detailed production considerations, see [sla.md](docs/operations/sla.md) and [monitoring.md](docs/operations/monitoring.md).

### Observability Cost Management
OpenTelemetry sampling is NOT needed at the application level - telemetry collectors handle intelligent sampling upstream. Do NOT implement application-level sampling unless specifically requested.
