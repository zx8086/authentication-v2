# Design: OTel Documentation Split & Reusable Standard

**Date**: 2026-03-06
**Status**: Approved
**Goal**: Split monitoring.md (2,678 lines) by audience, close documentation gaps, and create a reusable OTel standard for other applications.

---

## Problem Statement

The current `docs/operations/monitoring.md` serves three audiences (developers, SREs, architects) in a single 2,678-line file. Key gaps prevent reuse as an organizational standard:

1. No custom instrumentation guide (developers can't extend the 65 instruments)
2. No telemetry testing patterns (can't verify instrumentation without production traffic)
3. No sampling strategy documentation (deferred to collectors but undocumented)
4. Missing standard OTEL_* environment variables
5. No telemetry data flow diagram
6. 77 vs 65 instrument count discrepancy

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Split strategy | By audience | Matches how people search: developer vs SRE vs architect |
| Instrumentation guide scope | Generic OTel + auth-service examples | Reusable standard with concrete reference implementation |
| Test runtime | Bun-primary with generic notes | Matches this project; OTel test utilities are runtime-agnostic |
| Collector config scope | OTLP-only | Collector config is the platform team's responsibility |

## Document Structure

```
docs/
  operations/
    monitoring.md          # TRIMMED: ops/SRE reference (~1,400 lines)
  development/
    instrumentation.md     # NEW: developer guide (~500 lines)
    logging.md             # EXISTING: minor cross-ref updates
  architecture/
    telemetry.md           # NEW: architecture & SDK config (~400 lines)
    overview.md            # EXISTING: add cross-ref
```

## Content Migration Map

### monitoring.md -> development/instrumentation.md

- Tracer API, span creation, span naming conventions
- Span events, TelemetryEmitter API, SpanEvents constants
- Custom instrumentation examples
- Cardinality Guard API

### monitoring.md -> architecture/telemetry.md

- Telemetry Architecture, SDK initialization
- Memory optimization patches, Memory Guardian
- Telemetry Modes, Circuit Breakers
- Environment variables reference
- SDK 0.212.0 compatibility
- Package dependencies

### Stays in operations/monitoring.md

- Metrics catalog (65 instruments), recording functions
- Health check endpoints
- Debug telemetry endpoints
- Monitoring best practices, alerts, dashboards
- Production monitoring setup, K8s/Docker config examples
- OTEL Collector transform config
- Graceful shutdown
- Troubleshooting
- ECS Field Mapping, Structured Logging

## New Content

### development/instrumentation.md

1. **Generic OTel patterns**: `tracer.startActiveSpan()`, `meter.createCounter()`, `meter.createHistogram()`, choosing instrument types
2. **Service wrappers**: `telemetryTracer.createSpan()`, specialized span methods, TelemetryEmitter
3. **"How do I instrument a new feature?"**: step-by-step workflow
4. **Naming conventions**: generic + service-specific
5. **Telemetry testing**: InMemorySpanExporter, InMemoryMetricReader, span/metric assertions (bun:test primary, Jest/Vitest notes)
6. **Cardinality management**: guidance for new metrics

### architecture/telemetry.md

1. **Data flow diagram**: App -> OTel SDK -> BatchProcessors -> OTLP Exporters -> Collector -> Backend
2. **SDK configuration**: all OTEL_* env vars including missing ones (OTEL_EXPORTER_OTLP_PROTOCOL, OTEL_RESOURCE_ATTRIBUTES, OTEL_TRACES_SAMPLER, etc.)
3. **Sampling strategy**: explicit "collector handles it" rationale
4. **Memory optimizations**: lazy-loading, guardian
5. **Telemetry circuit breakers**
6. **Telemetry modes**

## Fixes Included

- Reconcile 77 vs 65 instrument count (clarify HostMetrics/GC are separate from application instruments)
- Fix metric export interval (30s in code vs 10s in some doc sections)
- Add missing OTEL_* env vars to reference

## Cross-Reference Updates

- `docs/README.md` -- add instrumentation.md and telemetry.md rows
- `docs/architecture/overview.md` -- link to telemetry.md
- `docs/development/logging.md` -- update cross-refs to new docs
- `docs/configuration/environment.md` -- cross-ref to telemetry.md for OTel vars
- `CLAUDE.md` -- add instrumentation.md and telemetry.md to quick links

## Estimated Sizes

| Document | Before | After |
|----------|--------|-------|
| operations/monitoring.md | 2,678 lines | ~1,400 lines |
| development/instrumentation.md | N/A | ~500 lines |
| architecture/telemetry.md | N/A | ~400 lines |
| development/logging.md | 834 lines | ~840 lines |
