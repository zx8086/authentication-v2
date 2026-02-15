# Documentation Index

**Production Ready: 9.5/10 - Exceptional Quality**

## Quick Navigation

| Need to... | Go to... |
|------------|----------|
| Start developing | [Getting Started](development/getting-started.md) |
| Understand the API | [API Reference](api/endpoints.md) |
| Configure the service | [Configuration Guide](configuration/environment.md) |
| Run tests | [Testing Guide](development/testing.md) |
| Deploy to production | [Container Security](deployment/container-security.md) |
| Debug issues | [Troubleshooting](operations/troubleshooting.md) |
| Monitor the service | [Observability Guide](operations/monitoring.md) |

---

## By Category

### API Reference

| Document | Description |
|----------|-------------|
| [endpoints.md](api/endpoints.md) | All 16 API endpoints with request/response formats |
| [jwt-tokens.md](api/jwt-tokens.md) | JWT token structure, claims, and validation |

### Architecture

| Document | Description |
|----------|-------------|
| [overview.md](architecture/overview.md) | System design, authentication flow, and technology stack |

### Configuration

| Document | Description |
|----------|-------------|
| [environment.md](configuration/environment.md) | Environment variables, 4-pillar configuration, dependencies |

### Development

| Document | Description |
|----------|-------------|
| [getting-started.md](development/getting-started.md) | Development setup, commands, and workflow |
| [devcontainer.md](development/devcontainer.md) | Zed IDE DevContainer setup for local Docker development |
| [testing.md](development/testing.md) | Complete testing guide (unit, E2E, K6, mutation, chaos) |
| [api-best-practices.md](development/api-best-practices.md) | API standards: method validation, ETag, rate limiting |
| [kong-test-setup.md](development/kong-test-setup.md) | Kong integration, dual-mode E2E testing, http-log setup, test consumers |
| [profiling.md](development/profiling.md) | CPU/memory profiling and Bun fetch workaround |

### Deployment

| Document | Description |
|----------|-------------|
| [docker.md](deployment/docker.md) | Docker container builds |
| [kubernetes.md](deployment/kubernetes.md) | Production Kubernetes deployment |
| [ci-cd.md](deployment/ci-cd.md) | GitHub Actions pipeline |
| [container-security.md](deployment/container-security.md) | DHI migration, security features, CVE remediation |

### Operations

| Document | Description |
|----------|-------------|
| [monitoring.md](operations/monitoring.md) | OpenTelemetry observability and memory monitoring |
| [sla.md](operations/sla.md) | Performance SLAs and availability targets |
| [troubleshooting.md](operations/troubleshooting.md) | Runbook-style troubleshooting guide |

### Security

| Document | Description |
|----------|-------------|
| [security-scanning.md](security/PARALLEL-SECURITY-SCANNING.md) | CI/CD parallel security scanning |

---

## Related Documentation

| Location | Description |
|----------|-------------|
| [README.md](../README.md) | Main project documentation |
| [CLAUDE.md](../CLAUDE.md) | Claude Code agent instructions |
| [test/README.md](../test/README.md) | Complete testing documentation |

---

## Service Overview

### Key Capabilities

| Capability | Description |
|------------|-------------|
| **Performance** | 100,000+ requests/second with native Bun runtime |
| **Security** | Zero client-side secrets, centralized token management |
| **Error Handling** | RFC 7807 Problem Details with structured error codes |
| **Resilience** | Circuit breaker with stale cache fallback |
| **Observability** | Comprehensive OpenTelemetry instrumentation |
| **Container** | DHI distroless builds (0 CVEs, 12/12 security score) |

### Technology Stack

| Category | Technology |
|----------|------------|
| Runtime | Bun v1.3.9+ |
| Language | TypeScript |
| HTTP | Bun.serve() Routes API |
| JWT | Web Crypto API |
| Monitoring | OpenTelemetry + OTLP |
| Container | DHI distroless (SLSA Level 3) |

### API Endpoints Summary

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | OpenAPI specification |
| `/tokens` | GET | Issue JWT token |
| `/tokens/validate` | GET | Validate JWT token |
| `/health` | GET | Service health |
| `/health/ready` | GET | Readiness probe |
| `/metrics` | GET | Performance metrics |

See [endpoints.md](api/endpoints.md) for complete API documentation.
