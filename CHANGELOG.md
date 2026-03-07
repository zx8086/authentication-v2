# Changelog

All notable changes to the Authentication Service are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.6.7] - 2026-03-06

### Added
- Documentation comprehensiveness audit with incident response playbook, ADR template, capacity planning, and more
- Split monitoring.md into audience-focused OTel documentation
- Comprehensive logging guide with Pino/Winston backend details

### Changed
- Deduplicated configuration documentation (OTEL, circuit breaker) with cross-references
- Added sequence diagrams for token flow, circuit breaker state transitions, and distributed tracing

## [2.6.6] - 2026-03-05

### Added
- ECS Pino compliance: dual-mode output, trace mixin, OTLP delegation
- Documentation currency audit report (SIO-455)

### Fixed
- SIO-456: Documentation currency issues from codebase audit
- SIO-455: Stale documentation references, broken anchor links, missing error code docs
- SIO-455: Updated Bun version references to match package.json (>=1.3.9)

## [2.6.5] - 2026-03-04

### Fixed
- SIO-453: Documentation discrepancies across 7 files

## [2.6.4] - 2026-03-03

### Added
- SIO-452: 6-state lifecycle management and graceful shutdown (INITIALIZING, STARTING, READY, DRAINING, STOPPING, STOPPED, ERROR)

### Fixed
- CVE-2026-27903 and CVE-2026-27904: Updated minimatch to 10.2.4
- Docker build: Added patches and scripts for bun install

## [2.6.3] - 2026-02-28

### Added
- SIO-448: Complete 4-pillar configuration for Memory Guardian and runtime metrics
- DNS caching, Bun tsconfig alignment, and quick benchmark tasks

### Fixed
- SIO-450: Documentation broken links and updated test counts

## [2.6.2] - 2026-02-26

### Added
- SIO-446: TelemetryEmitter facade for unified span events + logs
- SIO-446: Complete span events migration for tokens handler (148 typed events)

### Fixed
- Uptime interval leak and type assertions in process-metrics
- SIO-445: Production robustness issues for enhanced reliability
- healthMonitor null by wiring cache resilience config in loader
- Memory leaks with TTL-based cleanup and bounded data structures

## [2.6.1] - 2026-02-24

### Added
- AWS Fargate/ECS deployment documentation with security parity
- Expanded Zed tasks to 137 and reorganized by category

### Fixed
- SIO-443: Profiling EROFS error in container environments
- DHI scan failures by removing SLSA version mismatch
- Provenance from mode=max to true for DHI compatibility

## [2.6.0] - 2026-02-22

### Added
- Comprehensive 4-pillar configuration pattern documentation
- Complete OpenTelemetry instrumentation guide
- Per-type export stats to health endpoint with error details (SIO-337)

### Changed
- Removed unused generateSecureSecret methods after switching to static secrets
- Restructured health endpoint cache section for better readability (SIO-338)

### Fixed
- JWT credential accumulation by reusing existing credentials
- Removed hardcoded Docker build metadata

## [2.5.0] - 2026-02-20

### Added
- 3-layer cache resilience and in-memory fallback for HA mode
- Human-readable time formatting for uptime display
- CORS configuration improvements with per-header control
- Redis resilience: circuit breaker, reconnection manager, health monitor, per-operation timeouts

### Fixed
- CodeQL unused variable warnings across test files
- DHI verification to use sbom command for base images
- CI/CD test failures for Redis resilience tests

## Breaking Changes Log

### API V2 (Current)
- Added OWASP security headers to all responses
- Added audit logging for authentication events
- V2 is the recommended version for all new integrations

### API V1 (Stable)
- Original API format, fully supported
- No sunset date announced yet
- See [Upgrade Guide](docs/api/upgrade-guide.md) for V1-to-V2 migration

---

For detailed API differences between versions, see [API Endpoints](docs/api/endpoints.md).
