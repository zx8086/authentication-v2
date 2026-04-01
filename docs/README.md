# Documentation Index

**Production Ready: 9.5/10 - Exceptional Quality**

## Quick Navigation

| Need to... | Go to... |
|------------|----------|
| Start developing | [Getting Started](development/getting-started.md) |
| Understand the API | [API Reference](api/endpoints.md) |
| Configure the service | [Configuration Guide](configuration/environment.md) |
| Add logging to code | [Logging Guide](development/logging.md) |
| Run tests | [Testing Guide](development/testing.md) |
| Deploy to production | [Container Security](deployment/container-security.md) |
| Debug issues | [Troubleshooting](operations/troubleshooting.md) |
| Add instrumentation | [Instrumentation Guide](development/instrumentation.md) |
| Monitor the service | [Monitoring & Metrics](operations/monitoring.md) |
| Handle an incident | [Incident Response](operations/incident-response.md) |
| Tune performance | [Performance Tuning](development/performance-tuning.md) |
| Migrate API versions | [Upgrade Guide](api/upgrade-guide.md) |
| Contribute to the project | [Contributing Guide](../CONTRIBUTING.md) |

---

## By Category

### API Reference

| Document | Description |
|----------|-------------|
| [endpoints.md](api/endpoints.md) | All 16 API endpoints with request/response formats |
| [jwt-tokens.md](api/jwt-tokens.md) | JWT token structure, claims, and validation |
| [upgrade-guide.md](api/upgrade-guide.md) | V1-to-V2 migration and sunset timeline |

### Architecture

| Document | Description |
|----------|-------------|
| [overview.md](architecture/overview.md) | System design, authentication flow, lifecycle management, and technology stack |
| [telemetry.md](architecture/telemetry.md) | Telemetry architecture, SDK config, data flow, sampling strategy |
| [adr-template.md](architecture/adr-template.md) | Architecture Decision Records template and index |

### Configuration

| Document | Description |
|----------|-------------|
| [environment.md](configuration/environment.md) | Environment variables, 4-pillar configuration, dependencies |
| [4-pillar-pattern.md](configuration/4-pillar-pattern.md) | Type-safe 4-pillar configuration architecture with Zod validation |

### Development

| Document | Description |
|----------|-------------|
| [getting-started.md](development/getting-started.md) | Development setup, commands, and workflow |
| [logging.md](development/logging.md) | Logging architecture, public API, configuration, and patterns |
| [devcontainer.md](development/devcontainer.md) | Zed IDE DevContainer setup for local Docker development |
| [zed-tasks.md](development/zed-tasks.md) | Complete Zed IDE task reference (172 tasks) |
| [testing.md](development/testing.md) | Complete testing guide (unit, E2E, K6, mutation, chaos) |
| [api-best-practices.md](development/api-best-practices.md) | API standards: method validation, ETag, rate limiting |
| [kong-test-setup.md](development/kong-test-setup.md) | Kong integration, dual-mode E2E testing, http-log setup, test consumers |
| [instrumentation.md](development/instrumentation.md) | Adding spans, metrics, testing instrumentation |
| [profiling.md](development/profiling.md) | CPU/memory profiling and Bun fetch workaround |
| [performance-tuning.md](development/performance-tuning.md) | Configuration knobs for different load profiles |

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
| [monitoring.md](operations/monitoring.md) | Metrics catalog, health endpoints, alerting, troubleshooting |
| [sla.md](operations/sla.md) | Performance SLAs and availability targets |
| [troubleshooting.md](operations/troubleshooting.md) | Runbook-style troubleshooting guide with FAQ |
| [incident-response.md](operations/incident-response.md) | Incident response playbook with escalation paths |
| [capacity-planning.md](operations/capacity-planning.md) | Scaling guidance based on throughput targets |

### Security

| Document | Description |
|----------|-------------|
| [security-scanning.md](security/PARALLEL-SECURITY-SCANNING.md) | CI/CD parallel security scanning |
| [token-revocation.md](security/token-revocation.md) | JWT token revocation strategies |

### Standalone Guides

Reusable guides extracted from project documentation. These are project-agnostic and can be dropped into any Bun application.

| Guide | Description |
|-------|-------------|
| [bun-profiling-guide.md](guides/bun-profiling-guide.md) | CPU and heap profiling for Bun servers |
| [4-pillar-configuration-guide.md](guides/4-pillar-configuration-guide.md) | Type-safe configuration architecture with Zod |
| [bun-docker-security-guide.md](guides/bun-docker-security-guide.md) | Secure Docker containers with distroless base |
| [bun-kubernetes-guide.md](guides/bun-kubernetes-guide.md) | Kubernetes deployment with security, scaling, monitoring |
| [bun-otel-guide.md](guides/bun-otel-guide.md) | OpenTelemetry tracing, metrics, and log export |
| [bun-logging-guide.md](guides/bun-logging-guide.md) | Structured logging with Pino, ECS, and trace context |
| [zed-devcontainer-guide.md](guides/zed-devcontainer-guide.md) | DevContainer configurations for Zed IDE projects |
| [zed-tasks-guide.md](guides/zed-tasks-guide.md) | Zed IDE task definitions and command patterns |
| [bun-testing-guide.md](guides/bun-testing-guide.md) | Bun test runner, Playwright E2E, and K6 performance testing |

---

## Related Documentation

| Location | Description |
|----------|-------------|
| [README.md](../README.md) | Main project documentation |
| [CLAUDE.md](../CLAUDE.md) | Claude Code agent instructions |
| [test/README.md](../test/README.md) | Complete testing documentation |
| [CHANGELOG.md](../CHANGELOG.md) | Version history and breaking changes |
| [CONTRIBUTING.md](../CONTRIBUTING.md) | Development workflow and contribution guide |

---

## Service Overview

### Key Capabilities

| Capability | Description |
|------------|-------------|
| **Performance** | 100,000+ requests/second with native Bun runtime |
| **Security** | Zero client-side secrets, centralized token management |
| **Error Handling** | RFC 7807 Problem Details with structured error codes |
| **Resilience** | Circuit breaker with stale cache fallback |
| **Graceful Shutdown** | 7-state lifecycle with request draining and component coordination |
| **Caching** | Redis/Valkey support with auto-detection |
| **Observability** | Comprehensive OpenTelemetry instrumentation |
| **Container** | DHI distroless builds (0 CVEs, 12/12 security score, attestation verification) |

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
| `/` | GET | OpenAPI specification (JSON/YAML) |
| `/tokens` | GET | Issue JWT token |
| `/tokens/validate` | GET | Validate JWT token |
| `/health` | GET | Service health with dependency status |
| `/health/ready` | GET | Kubernetes readiness probe |
| `/health/telemetry` | GET | Telemetry subsystem health |
| `/health/metrics` | GET | Metrics health with circuit breaker status |
| `/metrics` | GET | Unified performance metrics |
| `/debug/metrics/test` | POST | Record test metrics |
| `/debug/metrics/export` | POST | Force metrics export |
| `/debug/profiling/start` | POST | Start CPU/heap profiling session |
| `/debug/profiling/stop` | POST | Stop active profiling session |
| `/debug/profiling/status` | GET | Profiling subsystem status |
| `/debug/profiling/reports` | GET | List profiling reports |
| `/debug/profiling/report` | GET | Get specific profiling report |
| `/debug/profiling/cleanup` | POST | Clean profiling artifacts |

See [endpoints.md](api/endpoints.md) for complete API documentation.
