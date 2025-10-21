# CLAUDE.md

This file provides essential guidance for working with this authentication service.

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
- ✅ Stage changes, show status, prepare messages
- ❌ Auto-commit, auto-push, decide when ready
- Exception: Slash commands (`/commit-push`) ARE authorization

#### Linear Issue Management
**NEVER set issues to "Done" without user approval**
- ✅ Create issues, move to "In Progress", update descriptions
- ❌ Close issues, mark complete, decide completion
- User decides when work is complete and ready for closure

#### Linear Issue Updates
**ALWAYS preserve existing content when updating**
```typescript
// ✅ CORRECT
const currentIssue = await mcp__linear_server__get_issue({ id: issueId });
const updatedDescription = currentIssue.description + "\n\n---\n\n" + newContent;

// ❌ WRONG
description: newContent  // Destroys existing content!
```

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
- Comprehensive testing (238 tests, 100% pass rate)
- Security headers + audit logging (v2 only)
- License compliance check (593x faster than legacy)

## Critical Runtime Requirements

**THIS IS A BUN PROJECT - NOT NPM/NODE**
- Use `bun` not `npm/node/npx`
- Commands: `bun install`, `bun run`, `bun src/server.ts`
- Lockfile: `bun.lockb`

## Quick Commands

### Development
```bash
bun run dev              # Development server
bun run typecheck        # TypeScript checking
bun run biome:check      # Code quality
```

### Testing
```bash
bun run bun:test         # Unit tests
bun run playwright:test  # E2E tests
bun run k6:smoke:health  # Performance tests
```

### Debugging
```bash
curl http://localhost:3000/health           # Health check
curl -H "Accept-Version: v2" /health        # V2 with security headers
curl http://localhost:3000/metrics          # Performance metrics
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
bun src/server.ts &
```

### Testing Rules
- **NEVER apply artificial timeouts to tests**
- Let K6 performance tests run their full duration
- Tests are designed to complete naturally

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

This streamlined version removes redundant information while preserving all critical guidance.
