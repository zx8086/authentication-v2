# Contributing to Authentication Service

## Development Setup

### Prerequisites

- **Bun Runtime**: v1.3.9+ ([install](https://bun.sh))
- **Kong Admin API**: Access to a Kong instance for integration testing
- **Redis** (optional): For high-availability cache testing

### Quick Start

```bash
# Clone and install
git clone <repository-url>
cd pvh.services.authentication-v2
bun install

# Configure environment
cp .env.example .env
# Edit .env with your Kong configuration

# Start development server
bun run dev
```

See [Getting Started Guide](docs/development/getting-started.md) for detailed setup instructions.

## Code Standards

### Critical Rules

- **ABSOLUTELY NO EMOJIS ANYWHERE** - No emojis in code, logs, comments, documentation, commit messages, or any output
- **Bun, not Node** - Use `bun` for all commands, never `npm`, `node`, or `npx`
- **Biome for formatting** - Run `bun run biome:check` before committing

### Code Quality

- Minimal comments (no excessive JSDoc)
- Use the 4-pillar configuration pattern for any new config additions (see [4-pillar-pattern.md](docs/configuration/4-pillar-pattern.md))
- Never hardcode secrets in tests; use `TestConsumerSecretFactory`
- Follow the existing layered architecture: Router -> Handler -> Service -> Adapter

### Testing Requirements

- **Zero failing tests policy** - All tests must pass before submitting changes
- **No artificial timeouts** - Never apply artificial timeouts to tests
- Run the full test suite before submitting:
  ```bash
  bun run test:bun           # Unit + integration tests (3191 tests)
  bun run quality:check      # TypeScript + Biome + YAML validation
  ```

## Workflow

### 1. Create a Branch

Branch from `master` with a descriptive name:

```bash
git checkout -b feature/description
# or
git checkout -b fix/description
```

### 2. Make Changes

- Follow existing patterns in the codebase
- Add tests for new functionality
- Update documentation if the change affects public APIs or configuration

### 3. Validate

```bash
# Quick validation (parallel quality + tests)
bun run validate:fast

# Full validation including Docker security
bun run validate:full
```

### 4. Commit

Follow the commit message convention:

```bash
# With Linear issue
git commit -m "SIO-XX: Your commit message"

# Without Linear issue
git commit -m "Descriptive commit message"
```

Commit messages should:
- Start with the Linear issue ID when applicable
- Be concise and describe the "why" not just the "what"
- Use imperative mood ("Add feature" not "Added feature")

### 5. Submit a Pull Request

- Provide a clear description of the changes
- Reference any related Linear issues
- Ensure all CI checks pass

## Project Structure

```
src/
  config/          # 4-pillar configuration (defaults, envMapping, loader, schemas)
  routes/          # Bun Routes API router
  handlers/        # HTTP request handlers (tokens, health, metrics, profiling)
  services/        # Business logic (JWT, circuit breaker, cache)
  adapters/        # External integrations (Kong Admin API)
  cache/           # Unified cache layer (Redis + in-memory)
  telemetry/       # OpenTelemetry instrumentation
  logging/         # Pino/Winston logging subsystem
  lifecycle/       # Graceful shutdown state machine
  errors/          # Structured error codes (AUTH_001-012)
  types/           # TypeScript type definitions
  middleware/      # CORS, error handling
test/
  unit/            # Unit tests
  integration/     # Integration tests
  chaos/           # Chaos engineering tests
  e2e/             # Playwright E2E tests
  k6/              # K6 performance tests
docs/              # Project documentation
```

## Key Commands Reference

| Command | Description |
|---------|-------------|
| `bun run dev` | Development server with hot reload |
| `bun run test:bun` | Run all unit + integration tests |
| `bun run quality:check` | Parallel typecheck + biome + yaml |
| `bun run validate:fast` | Quick validation (quality + tests) |
| `bun run validate:full` | Full validation including Docker |
| `bun run pre-commit` | Pre-commit checks |

For the complete command reference, see [Getting Started Guide](docs/development/getting-started.md).

## Documentation

When contributing documentation changes:

- Follow the existing document structure and formatting
- Use tables for structured data
- Include code examples with proper syntax highlighting
- Add cross-references to related documents
- Update [docs/README.md](docs/README.md) index if adding new documents
- No emojis in documentation

## Questions?

- Check the [Troubleshooting Guide](docs/operations/troubleshooting.md) for common issues
- Review existing documentation in the [docs/](docs/) directory
- Consult the [Architecture Overview](docs/architecture/overview.md) for design context
