# Documentation Index

**Production Ready: 10/10**

Comprehensive documentation for the Authentication Service - a high-performance JWT token generation service built with Bun runtime for Kong Gateway integration.

## Quick Navigation

| Category | Key Document | Description |
|----------|-------------|-------------|
| Getting Started | [getting-started.md](development/getting-started.md) | Development setup and workflow |
| API Reference | [endpoints.md](api/endpoints.md) | Complete API documentation (15 endpoints) |
| Configuration | [environment-setup.md](configuration/environment-setup.md) | Environment variables and 4-pillar configuration |
| Deployment | [docker.md](deployment/docker.md) | Container builds and deployment |
| Testing | [testing.md](development/testing.md) | Testing strategy (210+ tests) |

## Documentation Structure

### Architecture

System design and component relationships.

| Document | Description |
|----------|-------------|
| [system-overview.md](architecture/system-overview.md) | High-level architecture and component relationships |
| [authentication-flow.md](architecture/authentication-flow.md) | JWT token generation and Kong integration flow |

### API Reference

Complete API documentation and specifications.

| Document | Description |
|----------|-------------|
| [endpoints.md](api/endpoints.md) | All 15 API endpoints with request/response formats |
| [jwt-tokens.md](api/jwt-tokens.md) | JWT token structure, claims, and validation |

### Configuration

Environment setup and configuration management.

| Document | Description |
|----------|-------------|
| [environment-setup.md](configuration/environment-setup.md) | Environment variables and 4-pillar configuration pattern |
| [dependencies.md](configuration/dependencies.md) | Package requirements and runtime dependencies |

### Development

Development workflow and testing documentation.

| Document | Description |
|----------|-------------|
| [getting-started.md](development/getting-started.md) | Development setup, commands, and workflow |
| [testing.md](development/testing.md) | Testing strategy (178 unit + 32 E2E + K6 performance) |

### Deployment

Container builds and production deployment.

| Document | Description |
|----------|-------------|
| [docker.md](deployment/docker.md) | Docker container builds and deployment |
| [kubernetes.md](deployment/kubernetes.md) | Production Kubernetes deployment |
| [ci-cd.md](deployment/ci-cd.md) | GitHub Actions pipeline with security scanning |

### Operations

Monitoring, observability, and performance.

| Document | Description |
|----------|-------------|
| [monitoring.md](operations/monitoring.md) | OpenTelemetry observability, metrics, and alerting |
| [profiling.md](operations/profiling.md) | Performance analysis and debugging endpoints |

### Memory Management

Bun runtime memory monitoring and optimization.

| Document | Description |
|----------|-------------|
| [MEMORY_MONITORING_GUIDE.md](memory/MEMORY_MONITORING_GUIDE.md) | Enhanced memory monitoring using bun:jsc APIs |

### Docker

Container optimization and security.

| Document | Description |
|----------|-------------|
| [DOCKER-VALIDATION.md](docker/DOCKER-VALIDATION.md) | Container security validation procedures |

### Security

Security scanning and validation.

| Document | Description |
|----------|-------------|
| [PARALLEL-SECURITY-SCANNING.md](security/PARALLEL-SECURITY-SCANNING.md) | CI/CD parallel security scanning (5 scanners) |

### Migration

Legacy system migration documentation.

| Document | Description |
|----------|-------------|
| [MIGRATION_GAPS.md](MIGRATION_GAPS.md) | .NET to Bun migration gaps and verification checklist |

## Related Documentation

| Location | Description |
|----------|-------------|
| [README.md](../README.md) | Main project documentation |
| [CLAUDE.md](../CLAUDE.md) | Claude Code agent instructions |
| [test/README.md](../test/README.md) | Complete testing documentation |
| [test/k6/README-CONDITIONAL-TESTING.md](../test/k6/README-CONDITIONAL-TESTING.md) | K6 conditional testing configuration |

## Service Overview

### Key Capabilities

- **Performance**: 100,000+ requests/second with native Bun runtime
- **Security**: Zero client-side secrets, centralized token management
- **Error Handling**: Structured error codes (AUTH_001-012) for client consumption
- **Resilience**: Circuit breaker with stale cache fallback
- **Observability**: Comprehensive OpenTelemetry instrumentation
- **Container**: Multi-stage distroless builds with security hardening

### Production Readiness Checklist

| Category | Status |
|----------|--------|
| Security | Complete - OWASP headers, audit logging, no hardcoded secrets |
| Testing | Complete - 210+ tests (178 unit + 32 E2E), 100% pass rate |
| Observability | Complete - OpenTelemetry traces, metrics, logs |
| Error Handling | Complete - Structured error codes, circuit breaker |
| Documentation | Complete - OpenAPI spec, API docs, comprehensive guides |
| Configuration | Complete - 4-pillar pattern, .env.example comprehensive |
| Docker | Complete - Multi-stage distroless builds, security hardened |
| CI/CD | Complete - Parallel security scanning, consolidated workflow |

### Technology Stack

- **Runtime**: Bun v1.2.23+ (native performance)
- **Language**: TypeScript with strict validation
- **HTTP**: Native Bun.serve() Routes API
- **JWT**: Web Crypto API (crypto.subtle)
- **Monitoring**: OpenTelemetry with OTLP
- **Container**: Docker multi-stage distroless builds

### API Endpoints Summary

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | OpenAPI specification |
| `/tokens` | GET | Issue JWT token |
| `/health` | GET | Service health (liveness) |
| `/health/ready` | GET | Readiness probe |
| `/health/telemetry` | GET | Telemetry status |
| `/metrics` | GET | Performance metrics |
| `/memory/*` | GET/POST | Memory monitoring |
| `/debug/profiling/*` | GET/POST | Profiling endpoints |

See [endpoints.md](api/endpoints.md) for complete API documentation.
