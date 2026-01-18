# Authentication Service

High-performance JWT token generation service built with Bun runtime and TypeScript, designed for Kong Gateway integration.

## Why This Service?

### The Problem with Traditional Approaches

**Traditional JWT Generation** requires each client application to:
1. Store the JWT signing secret locally (in config, environment, or vault)
2. Implement JWT generation logic in every service
3. Handle secret rotation across all deployed instances
4. Risk secret exposure through logs, error messages, or memory dumps

```
Traditional Approach (Secrets Distributed):
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Client A   │     │  Client B   │     │  Client C   │
│ [SECRET]    │     │ [SECRET]    │     │ [SECRET]    │
│ JWT Logic   │     │ JWT Logic   │     │ JWT Logic   │
└─────────────┘     └─────────────┘     └─────────────┘
      │                   │                   │
      └───────────────────┼───────────────────┘
                          ▼
                    ┌───────────┐
                    │    API    │
                    └───────────┘

Problems:
- Secrets replicated N times (attack surface multiplied)
- Secret rotation requires redeploying all clients
- Each client implements JWT logic (inconsistency risk)
- Secrets in client memory/logs (exposure risk)
```

### Our Architectural Shift

This service centralizes JWT generation behind Kong Gateway, so **secrets exist in exactly one place**:

```
Centralized Approach (Secrets Never Leave Server):
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Client A   │     │  Client B   │     │  Client C   │
│ [API Key]   │     │ [API Key]   │     │ [API Key]   │
│ No secrets  │     │ No secrets  │     │ No secrets  │
└─────────────┘     └─────────────┘     └─────────────┘
      │                   │                   │
      └───────────────────┼───────────────────┘
                          ▼
                 ┌─────────────────┐
                 │  Kong Gateway   │  ← Validates API key, injects consumer headers
                 └────────┬────────┘
                          ▼
                 ┌─────────────────┐
                 │  Auth Service   │  ← Only place with JWT secrets
                 │ [SECRETS HERE]  │  ← Generates tokens on-demand
                 └────────┬────────┘
                          ▼
                 ┌─────────────────┐
                 │  Kong Admin API │  ← Manages consumer credentials
                 └─────────────────┘

Benefits:
- Secrets in ONE location (minimal attack surface)
- Secret rotation = update one service
- Consistent JWT generation (single implementation)
- Clients only handle API keys (no signing secrets)
```

### How It Works

1. **Client authenticates to Kong** using their API key (lightweight, rotatable)
2. **Kong validates** and injects `X-Consumer-ID` and `X-Consumer-Username` headers
3. **Auth Service receives request** with consumer identity (no secrets transmitted)
4. **Auth Service fetches signing secret** from Kong Admin API (server-to-server, cached)
5. **Auth Service generates JWT** and returns token to client
6. **Client uses JWT** for subsequent API calls

The client never sees, stores, or transmits the JWT signing secret. They only handle:
- Their API key (for Kong authentication)
- The generated JWT token (for API access)

### Key Differentiators

| Aspect | Traditional | This Service |
|--------|-------------|--------------|
| Secret Location | Every client | One server |
| Secret Rotation | Redeploy all clients | Update one service |
| JWT Implementation | N implementations | Single implementation |
| Attack Surface | N x secrets | 1 x secrets |
| Client Complexity | JWT library + secret mgmt | Simple HTTP call |
| Audit Trail | Distributed logs | Centralized telemetry |

### Additional Benefits

- **Native Performance**: Built on Bun runtime with `crypto.subtle` Web API, delivering 100,000+ req/sec with <10ms p99 latency
- **Resilient Operation**: Circuit breaker with stale cache fallback ensures token generation continues even during Kong Admin API outages
- **Full Observability**: W3C Trace Context propagation and OpenTelemetry instrumentation for end-to-end distributed tracing
- **Kong Flexibility**: Unified adapter supporting both self-hosted Kong API Gateway and Kong Konnect SaaS

### Who Benefits

- **Security Teams**: Single point of secret management, centralized audit logging
- **Platform Teams**: Consistent authentication across all services
- **SRE Teams**: Comprehensive SLAs, monitoring thresholds, and operational runbooks
- **Developers**: Simple API - send Kong headers, receive JWT token (no crypto libraries needed)

## Quick Start

```bash
# Install dependencies
bun install

# Start development server
bun run dev

# Request a JWT token (requires Kong consumer headers)
curl http://localhost:3000/tokens \
  -H "X-Consumer-ID: consumer-uuid" \
  -H "X-Consumer-Username: consumer-name"
```

## Documentation

See the **[Documentation Index](docs/README.md)** for comprehensive guides.

### Quick Navigation

| Category | Document | Description |
|----------|----------|-------------|
| Getting Started | [getting-started.md](docs/development/getting-started.md) | Development setup and workflow |
| API Reference | [endpoints.md](docs/api/endpoints.md) | Complete API documentation (16 endpoints) |
| Configuration | [environment-setup.md](docs/configuration/environment-setup.md) | Environment variables and 4-pillar configuration |
| Deployment | [docker.md](docs/deployment/docker.md) | Container builds and deployment |
| Testing | [test/README.md](test/README.md) | Comprehensive testing documentation (1500+ tests) |
| Monitoring | [monitoring.md](docs/operations/monitoring.md) | OpenTelemetry observability |
| SLA | [SLA.md](docs/operations/SLA.md) | Performance SLAs and monitoring thresholds |
| Troubleshooting | [TROUBLESHOOTING.md](docs/operations/TROUBLESHOOTING.md) | Operational runbook and diagnostics |
| Security | [PARALLEL-SECURITY-SCANNING.md](docs/security/PARALLEL-SECURITY-SCANNING.md) | CI/CD security scanning |

### Additional Documentation

- **Architecture**: [system-overview.md](docs/architecture/system-overview.md), [authentication-flow.md](docs/architecture/authentication-flow.md)
- **Deployment**: [kubernetes.md](docs/deployment/kubernetes.md), [ci-cd.md](docs/deployment/ci-cd.md)
- **API**: [jwt-tokens.md](docs/api/jwt-tokens.md)
- **Operations**: [profiling.md](docs/operations/profiling.md), [MEMORY_MONITORING_GUIDE.md](docs/memory/MEMORY_MONITORING_GUIDE.md)
- **Testing**: [test/README.md](test/README.md), [K6 Conditional Testing](test/k6/README-CONDITIONAL-TESTING.md)

## Quick Commands

### Development
```bash
bun run dev                    # Development server with hot reload
bun run typecheck              # TypeScript validation
bun run quality:check          # Code quality and formatting
```

### Testing
```bash
bun run bun:test              # Unit + integration tests (1400+ tests)
bun run playwright:test       # E2E tests (3 suites)
bun run k6:quick              # Performance smoke tests
```

### Operations
```bash
bun run health-check          # Service health validation
curl http://localhost:3000/health    # Health endpoint
curl http://localhost:3000/metrics   # Operational metrics
```

## Core API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | OpenAPI specification |
| `/tokens` | GET | Issue JWT token |
| `/tokens/validate` | GET | Validate JWT token |
| `/health` | GET | Service health check (liveness) |
| `/health/ready` | GET | Readiness probe (checks Kong connectivity) |
| `/health/metrics` | GET | Metrics system health |
| `/metrics` | GET | Operational metrics |

## Environment Configuration

### Required Variables
```bash
# Kong Integration
KONG_MODE=API_GATEWAY              # or KONNECT
KONG_ADMIN_URL=http://kong:8001    # Kong Admin API
KONG_ADMIN_TOKEN=your-token        # Admin API token
KONG_JWT_AUTHORITY=https://sts.example.com/
KONG_JWT_AUDIENCE=http://api.example.com/

# Application
PORT=3000
NODE_ENV=development
TELEMETRY_MODE=console             # console|otlp|both
```

### Optional High Availability
```bash
# Redis Cache (optional)
REDIS_ENABLED=true
REDIS_URL=redis://localhost:6379
HIGH_AVAILABILITY=true            # Enable extended resilience
```

## Security & Compliance

- **Zero Client Secrets**: JWT signing secrets never leave the server
- **OWASP Security Headers**: HSTS, CSP, X-Frame-Options, X-Content-Type-Options on all responses
- **Circuit Breaker Protection**: Kong API resilience with stale cache fallback
- **Security Scanning**: Automated vulnerability detection (Snyk, Trivy, Docker Scout)
- **Container Security**: Non-root user, distroless base image, read-only filesystem
- **Supply Chain Security**: SBOM generation and build provenance attestations

## Technology Stack

- **Runtime**: Bun v1.2.23+ (native performance)
- **Language**: TypeScript with strict validation
- **HTTP**: Native Bun.serve() Routes API
- **JWT**: Web Crypto API (crypto.subtle)
- **Caching**: Redis with in-memory fallback
- **Monitoring**: OpenTelemetry with OTLP
- **Testing**: Bun Test + Playwright + K6
- **Container**: Docker multi-stage distroless builds

## Support & Contributing

### Getting Help
- **Documentation**: See [docs/](docs/) directory for comprehensive guides
- **Health Checks**: Use `/health` for liveness, `/health/ready` for readiness probes
- **Debugging**: Enable `TELEMETRY_MODE=both` for detailed logging

### Development Workflow
1. Read [Getting Started Guide](docs/development/getting-started.md)
2. Set up environment variables
3. Run `bun run dev` for development server
4. Use `bun run quality:check` before commits
5. Run full test suite: `bun run test:suite`

### Architecture Decisions
- **Bun Runtime**: Chosen for native performance and Web API compatibility
- **Kong Integration**: Unified adapter supporting both API Gateway and Konnect
- **Circuit Breaker**: Ensures service availability during Kong outages
- **4-Pillar Configuration**: Enterprise-grade configuration management

## License

See LICENSE file for details.

---

**Built with Bun runtime for maximum performance and developer experience.**
