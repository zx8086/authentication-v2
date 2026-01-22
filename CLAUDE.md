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
| Configuration | [environment-setup.md](docs/configuration/environment-setup.md) | Environment variables and 4-pillar configuration |
| Deployment | [docker.md](docs/deployment/docker.md) | Container builds and deployment |
| Testing | [test/README.md](test/README.md) | Comprehensive testing documentation (1500+ tests) |
| Kong Test Setup | [kong-test-setup.md](docs/development/kong-test-setup.md) | Test consumers, API keys, and Kong configuration |
| Monitoring | [monitoring.md](docs/operations/monitoring.md) | OpenTelemetry observability |
| SLA | [SLA.md](docs/operations/SLA.md) | Performance SLAs and monitoring thresholds |
| Troubleshooting | [TROUBLESHOOTING.md](docs/operations/TROUBLESHOOTING.md) | Runbook, error codes, and FAQ |
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
- Comprehensive testing (1500+ tests, 100% pass rate)
- Structured error codes (AUTH_001-012)
- Security headers + audit logging (v2 only)
- Multi-stage Docker builds with distroless base

### External Dependencies (Not Implemented in This Service)
- **Rate Limiting**: Handled by Kong API Gateway
- **Authentication Routing**: Managed by Kong
- **Traffic Management**: Kong handles load balancing, retries

For detailed architecture, see [system-overview.md](docs/architecture/system-overview.md).

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
bun run start            # Production server
bun run quality:check    # Full quality check (TypeScript + Biome + YAML)

# Testing (see test/README.md for complete documentation)
bun run test:bun         # Unit + integration tests (1523 tests)
bun run test:e2e         # E2E tests (3 suites)
bun run test:k6:quick    # Performance smoke tests

# Docker
bun run docker:build     # Build container
bun run docker:local     # Build and run locally
```

For complete command reference, see [getting-started.md](docs/development/getting-started.md).

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

For troubleshooting each error, see [TROUBLESHOOTING.md](docs/operations/TROUBLESHOOTING.md).

## Production Readiness

**Status: 10/10 Production Ready**

| Category | Status |
|----------|--------|
| Security | OWASP headers, audit logging, no hardcoded secrets |
| Testing | 1500+ tests (48 unit + 4 integration + 3 E2E + 15 K6), 100% pass rate |
| Observability | OpenTelemetry traces, metrics, logs |
| Error Handling | Structured error codes, circuit breaker |
| Documentation | OpenAPI spec, comprehensive guides |
| Docker | Multi-stage distroless builds |
| CI/CD | Parallel security scanning |

For detailed production considerations, see [SLA.md](docs/operations/SLA.md) and [monitoring.md](docs/operations/monitoring.md).

### Observability Cost Management
OpenTelemetry sampling is NOT needed at the application level - telemetry collectors handle intelligent sampling upstream. Do NOT implement application-level sampling unless specifically requested.
