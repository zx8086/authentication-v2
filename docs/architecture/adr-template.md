# Architecture Decision Records

## What is an ADR?

An Architecture Decision Record (ADR) captures a significant architectural decision along with its context and consequences. ADRs provide a historical record of why decisions were made, helping future contributors understand the reasoning behind the current architecture.

## Template

Use the following template when documenting a new architectural decision. Copy the template below into a new file named `docs/architecture/adr/NNNN-short-title.md`.

---

```markdown
# ADR-NNNN: Short Title

## Status

[Proposed | Accepted | Deprecated | Superseded by ADR-XXXX]

## Date

YYYY-MM-DD

## Context

What is the issue that we are seeing that motivates this decision? What are the forces at play (technical, business, team)?

## Decision

What is the change that we are proposing and/or doing?

## Consequences

What becomes easier or more difficult to do because of this change?

### Positive
- ...

### Negative
- ...

### Neutral
- ...

## Alternatives Considered

| Alternative | Pros | Cons | Reason Rejected |
|-------------|------|------|-----------------|
| ... | ... | ... | ... |
```

---

## Existing Decisions

The following architectural decisions have been made for the Authentication Service. Formal ADRs have not been written for all of these, but the rationale is captured here for reference.

### ADR-001: Bun Runtime over Node.js

**Status**: Accepted
**Date**: Project inception
**Context**: Needed a high-performance JavaScript runtime for a latency-sensitive authentication service.
**Decision**: Use Bun as the runtime for native performance (100k+ req/sec), built-in test runner, and TypeScript support without transpilation.
**Consequences**: Bun-specific APIs (`Bun.serve()`, `Bun.nanoseconds()`, `import.meta.main`) create runtime coupling. Some npm packages may not be fully compatible.

### ADR-002: HTTP/JSON over gRPC/Protobuf for OTLP

**Status**: Accepted
**Date**: 2026-02
**Context**: Bun has incomplete gRPC support. Protobuf buffer pools allocate ~50-70MB at startup.
**Decision**: Use HTTP/JSON protocol for all OTLP exports. Apply lazy-loading patch to prevent protobuf allocation.
**Consequences**: 64% memory reduction at startup. Slightly larger payload size vs protobuf (acceptable trade-off). See [Telemetry Architecture - Memory Optimization](telemetry.md#memory-optimization-otlp-transformer-lazy-loading-patch).

### ADR-003: 4-Pillar Configuration Pattern

**Status**: Accepted
**Date**: 2026-02
**Context**: Needed a robust, reusable configuration pattern with validation, type safety, and security enforcement.
**Decision**: Implement defaults, environment mapping, loader, and Zod schema validation as four separate concerns.
**Consequences**: Configuration changes require updating up to 4 files, but validation catches errors at startup. Pattern is reusable across projects. See [4-Pillar Pattern](../configuration/4-pillar-pattern.md).

### ADR-004: crypto.subtle over jsonwebtoken

**Status**: Accepted
**Date**: Project inception
**Context**: Needed fast JWT generation without heavy dependencies.
**Decision**: Use the Web Crypto API (`crypto.subtle`) for HMAC-SHA256 signing instead of the `jsonwebtoken` npm package.
**Consequences**: Zero external dependencies for JWT operations. Sub-millisecond token generation. Requires manual JWT header/payload construction.

### ADR-005: Opossum for Circuit Breaking

**Status**: Accepted
**Date**: Project inception
**Context**: Needed resilience for Kong Admin API calls with configurable thresholds.
**Decision**: Use the `opossum` library for circuit breaker implementation with per-operation configuration.
**Consequences**: Well-tested, battle-proven library. Stale cache fallback provides continued operation during Kong outages. See [Architecture Overview - Circuit Breaker](overview.md#resilience-circuit-breaker).

### ADR-006: DHI Distroless Base Image

**Status**: Accepted
**Date**: 2026-02
**Context**: Needed container security with zero CVEs and supply chain attestation.
**Decision**: Use Docker Hub Images (DHI) distroless base with SLSA Level 3 provenance.
**Consequences**: 0 CVEs, 12/12 security score. No shell access in container (debugging via kubectl debug). See [Container Security](../deployment/container-security.md).

### ADR-007: Application-Level Sampling Not Implemented

**Status**: Accepted
**Date**: 2026-02
**Context**: Tail-based sampling at the collector is strictly superior to head-based application sampling.
**Decision**: Export all telemetry at full fidelity. Sampling decisions are made by the OpenTelemetry Collector.
**Consequences**: Full trace visibility for incident investigation. Collector must handle sampling and rate limiting. See [Telemetry Architecture - Sampling Strategy](telemetry.md#sampling-strategy).

## Creating a New ADR

1. Determine the next ADR number
2. Create `docs/architecture/adr/NNNN-short-title.md` using the template above
3. Set status to "Proposed"
4. Discuss with the team
5. Update status to "Accepted" when agreed upon
6. Update this index with a summary entry

## Related Documentation

| Document | Description |
|----------|-------------|
| [Architecture Overview](overview.md) | System design and component architecture |
| [Telemetry Architecture](telemetry.md) | Telemetry decisions and trade-offs |
| [4-Pillar Pattern](../configuration/4-pillar-pattern.md) | Configuration architecture pattern |
| [Container Security](../deployment/container-security.md) | Container and supply chain decisions |
