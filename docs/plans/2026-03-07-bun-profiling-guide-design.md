# Design: Standalone Bun Profiling Guide

**Date**: 2026-03-07
**Status**: Approved
**Goal**: Create a self-contained, project-agnostic Bun profiling guide that any Bun HTTP server application can adopt.

## Context

The authentication service has a comprehensive profiling guide (`docs/development/profiling.md`) with valuable Bun-specific knowledge, but it is tightly coupled to auth-service infrastructure (Kong, OTel auto-triggers, SLA endpoints, fetch workarounds). Other Bun projects need the same profiling capabilities without the project-specific content.

## Scope

### In Scope
- Bun native profiling commands (CPU + heap, markdown + DevTools formats)
- Copy-paste `package.json` scripts block
- Profiling a running `Bun.serve()` server under load
- Reading and interpreting heap profile markdown output
- Heap profile comparison methodology (duration matching, type-level analysis, sanity checks)
- Memory leak detection patterns (red flags vs normal behavior)
- Load testing integration (bombardier, oha, K6)
- Profile directory structure and management
- Chrome and Safari DevTools viewing
- Troubleshooting common issues

### Out of Scope
- OTel-specific instrumentation
- Container deployment (Fargate/K8s) profiling paths
- SLA auto-trigger infrastructure
- Project-specific scenarios or endpoints
- IDE-specific tasks (Zed, WebStorm)
- Bun fetch workarounds

## Target Audience
- Server-oriented: assumes `Bun.serve()` with HTTP endpoints
- Familiar with load testing tools (bombardier/oha/K6)
- Any Bun version supporting `--cpu-prof-md` and `--heap-prof-md`

## Output
- Single file: `bun-profiling-guide.md` in `docs/development/`
- Fully self-contained with no cross-references to other project docs
- Includes blank comparison table template for teams to fill in
