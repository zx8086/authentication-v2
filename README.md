# Authentication Service

High-performance JWT token generation service built with Bun runtime and TypeScript, designed for Kong Gateway integration.

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

## Overview

The Authentication Service is a secure JWT token issuer that bridges Kong API Gateway's consumer management with standardized token generation. It provides centralized authentication without distributing secrets to client applications.

### Key Features
- **High Performance**: 100,000+ requests/second with native Bun runtime
- **Kong Integration**: Supports both Kong API Gateway and Kong Konnect
- **Security First**: Zero client-side secrets, centralized token management
- **Circuit Breaker**: Resilient operation with stale cache fallback
- **Observability**: Comprehensive OpenTelemetry instrumentation
- **Docker Ready**: Multi-stage builds with security hardening

### Performance Characteristics
- **Throughput**: 100,000+ req/sec capability
- **Memory**: ~50-80MB baseline usage
- **Response Time**: <10ms p99 latency
- **Container Size**: <100MB
- **Cold Start**: <100ms

## Documentation

See the **[Documentation Index](docs/README.md)** for comprehensive guides.

### Quick Navigation

| Category | Document | Description |
|----------|----------|-------------|
| Getting Started | [getting-started.md](docs/development/getting-started.md) | Development setup and workflow |
| API Reference | [endpoints.md](docs/api/endpoints.md) | Complete API documentation (15 endpoints) |
| Configuration | [environment-setup.md](docs/configuration/environment-setup.md) | Environment variables and 4-pillar configuration |
| Deployment | [docker.md](docs/deployment/docker.md) | Container builds and deployment |
| Testing | [testing.md](docs/development/testing.md) | Testing strategy (210+ tests) |
| Monitoring | [monitoring.md](docs/operations/monitoring.md) | OpenTelemetry observability |
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
bun run bun:test              # Unit tests (178 tests)
bun run playwright:test       # E2E tests (32 tests)
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
| `/health` | GET | Service health check (liveness) |
| `/health/ready` | GET | Readiness probe (checks Kong connectivity) |
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