# Bun Testing Guide

Standalone guide to multi-tier testing for Bun HTTP server applications covering unit tests, Playwright API E2E tests, and K6 performance tests. Drop this file into your project and start testing.

## Quick Start

### Minimal bunfig.toml

```toml
[test]
preload = ["./test/preload.ts"]
timeout = 30000
```

### First Test File

```typescript
// test/unit/services/greeting.test.ts
import { describe, expect, it } from "bun:test";

function greet(name: string): string {
  return `Hello, ${name}!`;
}

describe("greet", () => {
  it("returns a greeting string", () => {
    expect(greet("world")).toBe("Hello, world!");
  });

  it("includes the provided name", () => {
    expect(greet("Alice")).toContain("Alice");
  });
});
```

### Run Tests

```bash
# All tests
bun test

# Specific directory
bun test test/unit/services/

# Watch mode
bun test --watch

# With coverage
bun test --coverage
```

---

## Bun Test Runner

### describe / test / it

`describe` groups related tests. `test` and `it` are aliases -- use whichever reads better in context.

```typescript
import { describe, expect, it, test } from "bun:test";

describe("UserService", () => {
  describe("findById", () => {
    it("returns the user when found", async () => {
      const user = await UserService.findById("user-123");
      expect(user).toHaveProperty("id", "user-123");
    });

    it("returns null when not found", async () => {
      const user = await UserService.findById("nonexistent");
      expect(user).toBeNull();
    });
  });

  test("creates a user with a generated ID", async () => {
    const user = await UserService.create({ name: "Alice" });
    expect(user.id).toBeDefined();
    expect(user.name).toBe("Alice");
  });
});
```

### Lifecycle Hooks

Hooks run at specific points in the test lifecycle. `beforeAll`/`afterAll` run once per `describe` block. `beforeEach`/`afterEach` run around every `test`.

```typescript
import { afterAll, afterEach, beforeAll, beforeEach, describe, it } from "bun:test";

describe("DatabaseService", () => {
  let db: Database;

  beforeAll(async () => {
    db = await Database.connect(process.env.DATABASE_URL!);
    await db.migrate();
  });

  afterAll(async () => {
    await db.close();
  });

  beforeEach(async () => {
    await db.beginTransaction();
  });

  afterEach(async () => {
    await db.rollbackTransaction();
  });

  it("inserts a record", async () => {
    const id = await db.insert("users", { name: "Bob" });
    expect(id).toBeGreaterThan(0);
  });
});
```

### test.concurrent()

Runs tests in parallel within a `describe` block. Use when tests are independent and do not share mutable state.

```typescript
import { describe, expect, test } from "bun:test";

describe("parallel API calls", () => {
  test.concurrent("fetches /users", async () => {
    const res = await fetch("http://localhost:3000/users");
    expect(res.status).toBe(200);
  });

  test.concurrent("fetches /health", async () => {
    const res = await fetch("http://localhost:3000/health");
    expect(res.status).toBe(200);
  });

  test.concurrent("fetches /metrics", async () => {
    const res = await fetch("http://localhost:3000/metrics");
    expect(res.status).toBe(200);
  });
});
```

### test.skip() / test.todo() / test.only()

```typescript
import { describe, expect, it, test } from "bun:test";

describe("FeatureFlag", () => {
  // Skip: test is known-broken, will be fixed later
  test.skip("handles feature flag override", () => {
    // will not run
  });

  // Todo: placeholder for planned test
  test.todo("handles expired feature flags");

  // Only: run just this test during debugging -- remove before committing
  test.only("validates the flag schema", () => {
    expect(validateFlag({ name: "my-flag", enabled: true })).toBe(true);
  });

  it("returns false for disabled flags", () => {
    expect(evaluateFlag("my-flag", { enabled: false })).toBe(false);
  });
});
```

### test.each()

Run the same test logic with multiple input sets.

```typescript
import { describe, expect, test } from "bun:test";

describe("parseStatus", () => {
  test.each([
    [200, "ok"],
    [201, "created"],
    [400, "bad_request"],
    [401, "unauthorized"],
    [500, "internal_error"],
  ])("maps HTTP %d to %s", (httpCode, expectedStatus) => {
    expect(parseStatus(httpCode)).toBe(expectedStatus);
  });
});

// With objects
describe("validateEmail", () => {
  test.each([
    { input: "user@example.com", valid: true },
    { input: "not-an-email", valid: false },
    { input: "", valid: false },
    { input: "user@", valid: false },
  ])("$input is valid=$valid", ({ input, valid }) => {
    expect(validateEmail(input)).toBe(valid);
  });
});
```

---

## bunfig.toml Reference

Full `bunfig.toml` configuration for the `[test]` section.

| Property | Type | Default | Description |
|---|---|---|---|
| `preload` | `string[]` | `[]` | Scripts to run before each test file. Use for env loading, global setup. |
| `timeout` | `number` | `5000` | Per-test timeout in milliseconds. Increase for integration tests hitting real services. |
| `maxConcurrency` | `number` | CPU count | Maximum number of test files to run in parallel. Lower to reduce load on shared services. |
| `env` | `Record<string, string>` | `{}` | Additional environment variables injected into all test processes. |
| `concurrentTestGlob` | `string \| string[]` | `undefined` | Glob pattern for test files to run concurrently (parallel). |
| `serialTestGlob` | `string \| string[]` | `undefined` | Glob pattern for test files to run serially (one at a time). Use for tests that share global state. |
| `ci` | `boolean` | auto-detected | Enables CI-specific behavior: no interactive output, deterministic ordering. |
| `coveragePathIgnorePatterns` | `string[]` | `[]` | Glob patterns to exclude from coverage reports. |
| `coverageThreshold` | `object` | `{}` | Fail the test run if coverage drops below thresholds. |

### Example bunfig.toml (Full)

```toml
[test]
preload = ["./test/preload.ts"]
timeout = 30000
maxConcurrency = 4
env = { NODE_ENV = "test" }

# Run unit tests concurrently, integration tests serially
concurrentTestGlob = ["test/unit/**/*.test.ts"]
serialTestGlob = ["test/integration/**/*.test.ts"]

ci = false

coveragePathIgnorePatterns = [
  "test/**",
  "src/generated/**",
  "src/**/*.d.ts"
]

[test.coverageThreshold]
line = 80
function = 80
statement = 80
```

---

## Preload Scripts

A preload script runs before every test file. Use it to load environment variables from a `.env` file so tests have access to live service URLs, credentials, and feature flags.

### Generic .env Loader

```typescript
// test/preload.ts
import { existsSync } from "node:fs";

async function loadEnv(path: string): Promise<void> {
  if (!existsSync(path)) {
    return;
  }

  const file = Bun.file(path);
  const text = await file.text();

  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();

    // Skip empty lines and comments
    if (!line || line.startsWith("#")) {
      continue;
    }

    const eqIndex = line.indexOf("=");
    if (eqIndex === -1) {
      continue;
    }

    const key = line.slice(0, eqIndex).trim();
    let value = line.slice(eqIndex + 1).trim();

    // Strip surrounding quotes (single or double)
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    // Only set if not already defined -- allow CI to override via real env vars
    if (key && !(key in process.env)) {
      process.env[key] = value;
    }
  }
}

// Load .env from project root (two levels up from test/)
await loadEnv(new URL("../../.env", import.meta.url).pathname);
```

### What Preload Handles

- Skips lines starting with `#` (comments) and blank lines
- Strips surrounding single or double quotes from values
- Does **not** overwrite variables already set in the environment -- CI variables take precedence
- Works with multi-line `.env` files from any generator (`dotenv`, `infisical`, `doppler`)

---

## Test Organization

### Directory Layout

```
test/
  preload.ts                    # Env loader, runs before every test file
  shared/                       # Shared utilities, factories, fixtures
    factories/
      user.factory.ts           # Creates test user objects
      request.factory.ts        # Creates test HTTP requests
    helpers/
      http.helper.ts            # fetch() wrappers for your endpoints
      assert.helper.ts          # Custom assertion helpers
  unit/
    handlers/                   # Tests for HTTP route handlers
      users.handler.test.ts
      health.handler.test.ts
    services/                   # Tests for business logic services
      user.service.test.ts
      cache.service.test.ts
    utils/                      # Tests for utility functions
      validation.test.ts
      formatting.test.ts
  integration/                  # Tests against real services (DB, cache, etc.)
    user.integration.test.ts
    cache.integration.test.ts
  chaos/                        # Resilience tests: circuit breakers, retries, timeouts
    circuit-breaker.chaos.test.ts
    timeout.chaos.test.ts
  e2e/                          # Playwright API end-to-end tests
    users.spec.ts
    health.spec.ts
  k6/                           # K6 performance test scripts
    smoke.js
    load.js
    stress.js
```

### Selective Execution

```bash
# Run only handler unit tests
bun test test/unit/handlers/

# Run a single test file
bun test test/unit/services/user.service.test.ts

# Run tests matching a name pattern
bun test --test-name-pattern "findById"

# Run integration tests only
bun test test/integration/

# Run all unit + integration (exclude e2e and k6)
bun test test/unit/ test/integration/
```

### Naming Conventions

| Item | Convention | Example |
|---|---|---|
| Test files | `<feature>.test.ts` | `user.service.test.ts` |
| Integration files | `<feature>.integration.test.ts` | `cache.integration.test.ts` |
| Chaos files | `<feature>.chaos.test.ts` | `circuit-breaker.chaos.test.ts` |
| Playwright specs | `<feature>.spec.ts` | `users.spec.ts` |
| K6 scripts | `<scenario>.js` | `smoke.js`, `load.js` |
| Describe blocks | Match module/class name | `describe("UserService")` |
| Test names | Start with a verb | `"returns null when not found"` |

---

## Test Types

| Type | Isolation | Speed | Dependencies | When to Use |
|---|---|---|---|---|
| Unit | Full (mocked deps) | Very fast (<1ms each) | None | Business logic, transformations, validation |
| Integration | Partial (real services) | Moderate (10-500ms) | DB, cache, external APIs | Service interactions, data persistence |
| Chaos / Resilience | Live or simulated failures | Slow (seconds) | Real or stubbed failure modes | Circuit breakers, retries, graceful degradation |
| E2E (Playwright API) | None (real HTTP) | Moderate (100ms-2s) | Full running application | Contract testing, critical user flows |
| Performance (K6) | None (real HTTP) | Minutes | Full running application + K6 binary | SLA validation, regression detection |

### Choosing the Right Type

- Start with **unit tests** for all pure functions and business logic.
- Add **integration tests** for code paths that touch a database, cache, or external service.
- Add **chaos tests** when you implement a circuit breaker, retry loop, or timeout.
- Add **E2E tests** for critical paths that must work end-to-end (login, checkout, data export).
- Add **performance tests** to establish a baseline and detect regressions before production.

---

## Assertion Patterns

### Primitive Equality

```typescript
import { expect, it } from "bun:test";

it("demonstrates primitive assertions", () => {
  // Strict equality (===)
  expect(42).toBe(42);
  expect("hello").toBe("hello");
  expect(true).toBe(true);

  // Deep equality (for objects and arrays)
  expect({ id: 1, name: "Alice" }).toEqual({ id: 1, name: "Alice" });
  expect([1, 2, 3]).toEqual([1, 2, 3]);

  // Negation
  expect(42).not.toBe(0);
  expect({ a: 1 }).not.toEqual({ a: 2 });
});
```

### Object Shape

```typescript
it("checks object properties", () => {
  const user = { id: "u1", name: "Alice", role: "admin", createdAt: new Date() };

  expect(user).toHaveProperty("id");
  expect(user).toHaveProperty("name", "Alice");
  expect(user).toHaveProperty("role", "admin");

  // Nested properties using dot notation
  const response = { data: { user: { id: "u1" } } };
  expect(response).toHaveProperty("data.user.id", "u1");
});
```

### Numbers and Lengths

```typescript
it("checks numeric ranges and lengths", () => {
  expect(100).toBeGreaterThan(0);
  expect(100).toBeGreaterThanOrEqual(100);
  expect(5).toBeLessThan(10);
  expect(5).toBeLessThanOrEqual(5);

  expect([1, 2, 3]).toHaveLength(3);
  expect("hello").toHaveLength(5);
});
```

### Strings and Arrays

```typescript
it("checks string and array contents", () => {
  expect("Hello, world!").toContain("world");
  expect([1, 2, 3]).toContain(2);

  expect("user@example.com").toMatch(/^[^@]+@[^@]+\.[^@]+$/);
  expect("ERROR: connection refused").toMatch("connection refused");
});
```

### Errors

```typescript
it("checks thrown errors", () => {
  // Synchronous throw
  expect(() => {
    throw new Error("not found");
  }).toThrow("not found");

  expect(() => {
    throw new TypeError("invalid input");
  }).toThrow(TypeError);

  // Async throw
  expect(async () => {
    await fetchUser("bad-id");
  }).rejects.toThrow("User not found");
});
```

### Async Patterns

```typescript
import { expect, it } from "bun:test";

it("awaits promises directly", async () => {
  const result = await fetchUser("user-123");
  expect(result).toHaveProperty("id", "user-123");
});

it("resolves to a value", async () => {
  await expect(Promise.resolve(42)).resolves.toBe(42);
});

it("rejects with an error", async () => {
  await expect(Promise.reject(new Error("timeout"))).rejects.toThrow("timeout");
});
```

### Zod Schema Validation

```typescript
import { z } from "zod";
import { describe, expect, it } from "bun:test";

const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  email: z.string().email(),
  role: z.enum(["admin", "user", "guest"]),
});

describe("UserSchema", () => {
  it("accepts a valid user", () => {
    const result = UserSchema.safeParse({
      id: "550e8400-e29b-41d4-a716-446655440000",
      name: "Alice",
      email: "alice@example.com",
      role: "admin",
    });

    expect(result.success).toBe(true);
  });

  it("rejects a missing email", () => {
    const result = UserSchema.safeParse({
      id: "550e8400-e29b-41d4-a716-446655440000",
      name: "Alice",
      role: "user",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const emailError = result.error.issues.find((i) => i.path[0] === "email");
      expect(emailError).toBeDefined();
    }
  });

  it("rejects an invalid role", () => {
    const result = UserSchema.safeParse({
      id: "550e8400-e29b-41d4-a716-446655440000",
      name: "Alice",
      email: "alice@example.com",
      role: "superuser",
    });

    expect(result.success).toBe(false);
  });
});
```

---

## Mocking

### mock() -- Function Mocks

```typescript
import { describe, expect, it, mock } from "bun:test";

describe("NotificationService", () => {
  it("calls the mailer with the correct payload", async () => {
    const sendMail = mock(async (_payload: MailPayload) => ({ messageId: "msg-1" }));

    const service = new NotificationService({ sendMail });
    await service.notifyUser("user-1", "Your order is ready");

    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(sendMail).toHaveBeenCalledWith({
      to: "user-1",
      subject: expect.stringContaining("order"),
      body: "Your order is ready",
    });
  });

  it("does not send if the user has opted out", async () => {
    const sendMail = mock(async () => ({ messageId: "msg-1" }));

    const service = new NotificationService({ sendMail });
    await service.notifyUser("opted-out-user", "Your order is ready");

    expect(sendMail).not.toHaveBeenCalled();
  });
});
```

### mock.module() -- Module Mocks

```typescript
import { describe, expect, it, mock } from "bun:test";

// Mock the entire crypto module for deterministic IDs
mock.module("node:crypto", () => ({
  randomUUID: () => "00000000-0000-0000-0000-000000000000",
}));

describe("RecordFactory", () => {
  it("uses the generated UUID as the record ID", () => {
    const record = RecordFactory.create({ name: "test" });
    expect(record.id).toBe("00000000-0000-0000-0000-000000000000");
  });
});
```

### Spies

```typescript
import { describe, expect, it, spyOn } from "bun:test";

describe("CacheService", () => {
  it("logs a warning on cache miss", async () => {
    const logger = { warn: (msg: string) => {} };
    const warnSpy = spyOn(logger, "warn");

    const cache = new CacheService({ logger });
    await cache.get("missing-key");

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("cache miss")
    );
  });
});
```

### When to Mock vs When to Use Live Backends

| Scenario | Approach | Reason |
|---|---|---|
| External HTTP APIs | Mock with `mock()` | Avoid network dependency, control responses |
| `crypto.randomUUID()` | Mock for determinism | Tests should not depend on random values |
| `Date.now()` / `new Date()` | Mock for time-sensitive logic | Control time in expiry, TTL, scheduling tests |
| Local database | Live (test DB or transaction rollback) | ORM behavior, constraints, indexes matter |
| Redis / cache | Live (test instance) | Serialization, TTL, eviction behavior matters |
| Internal service functions | Live (no mock needed) | Mocking internals makes tests brittle |
| Circuit breaker open state | Simulate with failing stub | Cannot reliably trigger open state in tests |
| Third-party payment gateway | Mock | Avoid charges, control error scenarios |

---

## Playwright API E2E

Playwright supports HTTP API testing without a browser. It sends real HTTP requests and asserts on responses.

### Install

```bash
bun add -d @playwright/test
bunx playwright install --with-deps chromium
```

### playwright.config.ts

```typescript
// playwright.config.ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./test/e2e",
  testMatch: "**/*.spec.ts",
  timeout: 30_000,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : 4,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",

  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:3000",
    extraHTTPHeaders: {
      Accept: "application/json",
    },
  },

  projects: [
    {
      name: "api",
      // No browser needed for API tests
      use: {},
    },
    {
      name: "chromium",
      // Add browser-based projects only when testing a UI
      use: { browserName: "chromium" },
    },
  ],
});
```

### API Request Pattern

```typescript
// test/e2e/users.spec.ts
import { expect, test } from "@playwright/test";

test.describe("GET /users", () => {
  test("returns 200 with a list of users", async ({ request }) => {
    const response = await request.get("/users");

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body).toHaveProperty("users");
    expect(Array.isArray(body.users)).toBe(true);
  });

  test("returns 401 without Authorization header", async ({ request }) => {
    const response = await request.get("/users", {
      headers: { Authorization: "" },
    });

    expect(response.status()).toBe(401);

    const body = await response.json();
    expect(body).toHaveProperty("error");
  });
});

test.describe("POST /users", () => {
  test("creates a new user and returns 201", async ({ request }) => {
    const response = await request.post("/users", {
      data: {
        name: "Alice",
        email: "alice@example.com",
      },
    });

    expect(response.status()).toBe(201);

    const body = await response.json();
    expect(body).toHaveProperty("id");
    expect(body.name).toBe("Alice");
    expect(body.email).toBe("alice@example.com");
  });

  test("returns 400 for missing required fields", async ({ request }) => {
    const response = await request.post("/users", {
      data: { name: "Alice" }, // missing email
    });

    expect(response.status()).toBe(400);
  });
});
```

### Health Check Spec

```typescript
// test/e2e/health.spec.ts
import { expect, test } from "@playwright/test";

test("GET /health returns 200", async ({ request }) => {
  const response = await request.get("/health");
  expect(response.status()).toBe(200);
});

test("GET /health returns expected shape", async ({ request }) => {
  const response = await request.get("/health");
  const body = await response.json();

  expect(body).toHaveProperty("status", "ok");
  expect(body).toHaveProperty("uptime");
  expect(typeof body.uptime).toBe("number");
});

test("GET /metrics returns 200", async ({ request }) => {
  const response = await request.get("/metrics");
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("text/plain");
});
```

### Multi-Environment baseURL

```typescript
// playwright.config.ts -- environment-based base URL
const baseURL = (() => {
  switch (process.env.TEST_ENV) {
    case "staging":
      return "https://staging.my-app.example.com";
    case "production":
      return "https://my-app.example.com";
    default:
      return process.env.BASE_URL ?? "http://localhost:3000";
  }
})();

export default defineConfig({
  use: { baseURL },
  // ...
});
```

```bash
# Run against staging
TEST_ENV=staging bunx playwright test

# Run against a custom URL
BASE_URL=http://192.168.1.100:3000 bunx playwright test

# Run locally
bunx playwright test
```

---

## K6 Performance Testing

K6 is a developer-friendly load testing tool. Tests are written in JavaScript and run by the `k6` binary.

### Install

```bash
# macOS
brew install k6

# Linux (Debian/Ubuntu)
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update && sudo apt-get install k6

# Docker
docker run --rm -i grafana/k6 run - <test/k6/smoke.js
```

### Basic Test Structure

```javascript
// test/k6/smoke.js
import { check } from "k6";
import http from "k6/http";

export const options = {
  vus: 5,
  duration: "30s",
  thresholds: {
    http_req_duration: ["p(95)<200", "p(99)<500"],
    http_req_failed: ["rate<0.01"],
  },
};

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";

export default function () {
  const res = http.get(`${BASE_URL}/health`);

  check(res, {
    "status is 200": (r) => r.status === 200,
    "response has status field": (r) => {
      const body = JSON.parse(r.body);
      return body.status === "ok";
    },
    "response time under 200ms": (r) => r.timings.duration < 200,
  });
}
```

### Test Type Reference

| Type | Purpose | VUs | Duration | Ramp-up |
|---|---|---|---|---|
| Smoke | Verify basic functionality under minimal load | 1-5 | 30s-1m | None |
| Load | Simulate normal expected traffic | 10-100 | 5-30m | Gradual (2m) |
| Stress | Find the breaking point above normal load | 100-500 | 10-30m | Stepped |
| Spike | Sudden burst of traffic | 1 to 500 in seconds | 1-5m | Instant |
| Soak | Detect memory leaks and degradation over time | 10-50 | 1-8h | Gradual (5m) |

### Load Test with Stages

```javascript
// test/k6/load.js
import { check, sleep } from "k6";
import http from "k6/http";

export const options = {
  stages: [
    { duration: "2m", target: 20 },   // ramp up to 20 VUs
    { duration: "10m", target: 20 },  // hold at 20 VUs
    { duration: "2m", target: 0 },    // ramp down
  ],
  thresholds: {
    http_req_duration: ["p(95)<300", "p(99)<800"],
    http_req_failed: ["rate<0.005"],
    http_reqs: ["rate>100"],           // minimum throughput
  },
};

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";

export default function () {
  // Health check
  const healthRes = http.get(`${BASE_URL}/health`);
  check(healthRes, { "health: 200": (r) => r.status === 200 });

  sleep(0.1);

  // List users
  const usersRes = http.get(`${BASE_URL}/users`, {
    headers: { Authorization: `Bearer ${__ENV.API_TOKEN}` },
  });
  check(usersRes, {
    "users: 200": (r) => r.status === 200,
    "users: has array": (r) => {
      try {
        return Array.isArray(JSON.parse(r.body).users);
      } catch {
        return false;
      }
    },
  });

  sleep(1);
}
```

### Stress Test

```javascript
// test/k6/stress.js
import { check } from "k6";
import http from "k6/http";

export const options = {
  stages: [
    { duration: "2m", target: 50 },
    { duration: "5m", target: 100 },
    { duration: "5m", target: 200 },
    { duration: "5m", target: 300 },
    { duration: "2m", target: 0 },
  ],
  thresholds: {
    // Stress tests often have looser thresholds -- looking for the break point
    http_req_duration: ["p(95)<2000"],
    http_req_failed: ["rate<0.1"],
  },
};

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";

export default function () {
  const res = http.get(`${BASE_URL}/health`);
  check(res, { "status is 200": (r) => r.status === 200 });
}
```

### Thresholds Reference

```javascript
export const options = {
  thresholds: {
    // Duration percentiles
    "http_req_duration": ["p(50)<100", "p(95)<300", "p(99)<800", "max<2000"],

    // Error rate
    "http_req_failed": ["rate<0.01"],   // less than 1% errors

    // Throughput
    "http_reqs": ["rate>200"],          // at least 200 req/s

    // Specific URL pattern
    "http_req_duration{name:health}": ["p(95)<50"],

    // Custom counter
    "checks": ["rate>0.99"],            // 99%+ checks pass
  },
};
```

### Running K6 with Environment Variables

```bash
# Basic run
k6 run test/k6/smoke.js

# With custom base URL
k6 run -e BASE_URL=http://192.168.1.10:3000 test/k6/smoke.js

# With API token
k6 run -e BASE_URL=http://localhost:3000 -e API_TOKEN=my-token test/k6/load.js

# Output results to JSON
k6 run --out json=results/k6-load.json test/k6/load.js

# Output to Prometheus remote write
k6 run --out experimental-prometheus-rw test/k6/smoke.js
```

---

## CI/CD Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Test

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  unit:
    name: Unit and Integration Tests
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest

      - name: Install dependencies
        run: bun install --frozen-lockfile

      - name: Type check
        run: bun run typecheck

      - name: Lint
        run: bun run lint

      - name: Unit tests
        run: bun test test/unit/ test/integration/ --coverage

      - name: Upload coverage
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: coverage-report
          path: coverage/
          retention-days: 7

  e2e:
    name: E2E Tests
    runs-on: ubuntu-latest
    needs: unit

    steps:
      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest

      - name: Install dependencies
        run: bun install --frozen-lockfile

      - name: Install Playwright browsers
        run: bunx playwright install --with-deps chromium

      - name: Start application
        run: bun run start &
        env:
          NODE_ENV: test
          PORT: 3000

      - name: Wait for application
        run: |
          for i in $(seq 1 30); do
            curl -sf http://localhost:3000/health && break
            sleep 1
          done

      - name: Run E2E tests
        run: bunx playwright test
        env:
          BASE_URL: http://localhost:3000

      - name: Upload Playwright report
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7

  performance:
    name: Performance Smoke Test
    runs-on: ubuntu-latest
    needs: e2e
    if: github.ref == 'refs/heads/main'

    steps:
      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest

      - name: Install dependencies
        run: bun install --frozen-lockfile

      - name: Install K6
        run: |
          sudo gpg --no-default-keyring \
            --keyring /usr/share/keyrings/k6-archive-keyring.gpg \
            --keyserver hkp://keyserver.ubuntu.com:80 \
            --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
          echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" \
            | sudo tee /etc/apt/sources.list.d/k6.list
          sudo apt-get update -qq && sudo apt-get install -y k6

      - name: Start application
        run: bun run start &
        env:
          NODE_ENV: production
          PORT: 3000

      - name: Wait for application
        run: |
          for i in $(seq 1 30); do
            curl -sf http://localhost:3000/health && break
            sleep 1
          done

      - name: Run smoke performance test
        run: k6 run -e BASE_URL=http://localhost:3000 test/k6/smoke.js

      - name: Upload K6 results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: k6-results
          path: results/
          retention-days: 7
```

---

## Package.json Scripts

Use a hierarchical naming convention so scripts compose naturally.

### Script Table

| Script | Command | Purpose |
|---|---|---|
| `test` | `bun test` | All tests (default) |
| `test:unit` | `bun test test/unit/` | Unit tests only |
| `test:integration` | `bun test test/integration/` | Integration tests only |
| `test:chaos` | `bun test test/chaos/` | Resilience/chaos tests |
| `test:e2e` | `bunx playwright test` | Playwright API E2E |
| `test:k6:smoke` | `k6 run test/k6/smoke.js` | K6 smoke (quick verify) |
| `test:k6:load` | `k6 run test/k6/load.js` | K6 load (normal traffic) |
| `test:k6:stress` | `k6 run test/k6/stress.js` | K6 stress (find breaking point) |
| `test:suite` | Sequential: unit + integration + e2e + k6:smoke | Full pre-release test suite |
| `test:watch` | `bun test --watch` | Watch mode for TDD |
| `test:coverage` | `bun test --coverage` | Unit tests with coverage |

### package.json Example

```json
{
  "scripts": {
    "test": "bun test",
    "test:unit": "bun test test/unit/",
    "test:integration": "bun test test/integration/",
    "test:chaos": "bun test test/chaos/",
    "test:e2e": "bunx playwright test",
    "test:e2e:ui": "bunx playwright test --ui",
    "test:k6:smoke": "k6 run test/k6/smoke.js",
    "test:k6:load": "k6 run test/k6/load.js",
    "test:k6:stress": "k6 run test/k6/stress.js",
    "test:watch": "bun test --watch",
    "test:coverage": "bun test --coverage",
    "test:suite": "bun test test/unit/ test/integration/ && bunx playwright test && k6 run test/k6/smoke.js"
  }
}
```

---

## Best Practices

1. **Write tests in the same commit as the feature.** Merging a feature without tests creates debt that is rarely repaid. Treat untested code as unfinished code.

2. **Prefer live backends over mocks for stateful services.** Mocking a database or cache hides real bugs: serialization mismatches, index violations, TTL edge cases. Use a dedicated test database or transaction rollback instead.

3. **Keep unit tests fast and isolated.** A unit test that waits on I/O is not a unit test. If a test needs a running service, move it to `test/integration/`. Fast unit tests encourage developers to run them constantly during development.

4. **Load environment variables from `.env` in the preload script, not inline.** Centralizing env loading in `test/preload.ts` means every test file gets consistent configuration without manual setup. It also makes it easy for CI to override values with real environment variables.

5. **Never commit `test.only()`.** `test.only()` silences all other tests, which means your CI passes while most of your test suite does not run. Add a lint rule or pre-commit hook to catch it.

6. **Set meaningful thresholds in K6, not just defaults.** A smoke test with no thresholds only tells you the server is up. Define `p(95)` latency targets and an error rate limit before you have a baseline -- otherwise you have nothing to compare against.

7. **Use `test.each()` for boundary values, not copy-paste tests.** Duplicated test bodies with different literals are hard to maintain. A `test.each()` table makes it obvious what cases are covered and what is missing.

8. **Keep Playwright E2E tests focused on critical paths.** E2E tests are slow and flaky compared to unit tests. Reserve them for the flows that matter most: login and session flows, core data operations, and the paths that are the hardest to cover from below.

9. **Separate chaos and resilience tests from happy-path integration tests.** Chaos tests often manipulate shared state (circuit breaker counts, retry budgets, connection pools). Running them in the same suite as integration tests causes intermittent failures.

10. **Store K6 results as CI artifacts and compare over time.** A single K6 run is a data point; a series of runs is a trend. Upload JSON output as CI artifacts, import into Grafana or a simple spreadsheet, and review before each release.

---

## Anti-Patterns

1. **Testing implementation details instead of behavior.**

```typescript
// BAD: testing internal state
it("sets the internal _cache field", () => {
  const service = new UserService();
  service.findById("u1");
  expect((service as any)._cache.size).toBe(1);
});

// GOOD: testing observable behavior
it("returns the same user on repeated calls without extra fetches", async () => {
  const fetcher = mock(async (id: string) => ({ id, name: "Alice" }));
  const service = new UserService({ fetcher });

  await service.findById("u1");
  await service.findById("u1");

  expect(fetcher).toHaveBeenCalledTimes(1);
});
```

2. **Hardcoding secrets or credentials in test files.**

```typescript
// BAD: hardcoded secret
const response = await request.get("/users", {
  headers: { Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." },
});

// GOOD: read from environment
const response = await request.get("/users", {
  headers: { Authorization: `Bearer ${process.env.TEST_API_TOKEN}` },
});
```

3. **Using artificial sleep() to wait for async operations.**

```typescript
// BAD: brittle, slow, and non-deterministic
it("publishes an event", async () => {
  await service.processOrder("order-1");
  await Bun.sleep(500); // hope the event arrives in time
  expect(events).toHaveLength(1);
});

// GOOD: wait for the condition explicitly
it("publishes an event", async () => {
  await service.processOrder("order-1");
  await waitFor(() => events.length === 1, { timeout: 2000, interval: 50 });
  expect(events).toHaveLength(1);
});
```

4. **Sharing mutable state between tests.**

```typescript
// BAD: tests depend on each other's side effects
let userId: string;

it("creates a user", async () => {
  userId = await db.createUser({ name: "Alice" }); // sets shared state
});

it("fetches the created user", async () => {
  const user = await db.findUser(userId); // depends on previous test
  expect(user.name).toBe("Alice");
});

// GOOD: each test is self-contained
it("creates and retrieves a user", async () => {
  const id = await db.createUser({ name: "Alice" });
  const user = await db.findUser(id);
  expect(user.name).toBe("Alice");
});
```

5. **Writing K6 tests with no thresholds.**

```javascript
// BAD: no thresholds -- test always passes unless the server crashes
export const options = {
  vus: 50,
  duration: "1m",
};

// GOOD: explicit SLA thresholds
export const options = {
  vus: 50,
  duration: "1m",
  thresholds: {
    http_req_duration: ["p(95)<200", "p(99)<500"],
    http_req_failed: ["rate<0.01"],
  },
};
```

6. **Mocking so much that the test proves nothing.**

```typescript
// BAD: every dependency is mocked -- the test only proves the mock works
it("saves a user", async () => {
  const db = { save: mock(async () => ({ id: "1" })) };
  const validator = { validate: mock(() => true) };
  const logger = { info: mock(() => {}) };

  const service = new UserService({ db, validator, logger });
  const result = await service.saveUser({ name: "Alice" });

  // This only tests that the mock was called, not that the service works
  expect(db.save).toHaveBeenCalled();
  expect(result).toEqual({ id: "1" });
});

// GOOD: mock only the external boundary (the DB call), test real behavior
it("saves a user and returns the generated ID", async () => {
  const db = { save: mock(async (data: unknown) => ({ id: "generated-id", ...data })) };

  const service = new UserService({ db });
  const result = await service.saveUser({ name: "Alice" });

  // Test the full behavior: validation, transformation, persistence
  expect(result.id).toBe("generated-id");
  expect(result.name).toBe("Alice");
  expect(db.save).toHaveBeenCalledWith(
    expect.objectContaining({ name: "Alice" })
  );
});
```
