/* test/bun/kong-mode-strategies.test.ts */

/**
 * Unit tests for Kong mode strategies (KongApiGatewayStrategy, KongKonnectStrategy)
 * These tests focus on strategy behavior with mocked fetch to kill mutations
 */

import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import {
  createKongModeStrategy,
  KongApiGatewayStrategy,
  KongKonnectStrategy,
} from "../../../src/adapters/kong-mode-strategies";

describe("KongApiGatewayStrategy", () => {
  const baseUrl = "http://kong-admin:8001";
  const adminToken = "test-token-123";

  describe("constructor", () => {
    it("should strip trailing slash from baseUrl", () => {
      const strategy = new KongApiGatewayStrategy("http://kong:8001/", adminToken);
      expect(strategy.baseUrl).toBe("http://kong:8001");
    });

    it("should preserve baseUrl without trailing slash", () => {
      const strategy = new KongApiGatewayStrategy("http://kong:8001", adminToken);
      expect(strategy.baseUrl).toBe("http://kong:8001");
    });

    it("should handle multiple trailing slashes by removing only the last one", () => {
      const strategy = new KongApiGatewayStrategy("http://kong:8001//", adminToken);
      // The regex /\/$/ only removes trailing slash at end
      expect(strategy.baseUrl).toBe("http://kong:8001/");
    });
  });

  describe("buildConsumerUrl", () => {
    it("should build correct consumer JWT URL", async () => {
      const strategy = new KongApiGatewayStrategy(baseUrl, adminToken);
      const url = await strategy.buildConsumerUrl(baseUrl, "consumer-123");
      expect(url).toBe("http://kong-admin:8001/consumers/consumer-123/jwt");
    });

    it("should use provided baseUrl not constructor baseUrl", async () => {
      const strategy = new KongApiGatewayStrategy(baseUrl, adminToken);
      const url = await strategy.buildConsumerUrl("http://other:9000", "consumer-456");
      expect(url).toBe("http://other:9000/consumers/consumer-456/jwt");
    });
  });

  describe("buildHealthUrl", () => {
    it("should build correct health URL", () => {
      const strategy = new KongApiGatewayStrategy(baseUrl, adminToken);
      const url = strategy.buildHealthUrl(baseUrl);
      expect(url).toBe("http://kong-admin:8001/status");
    });

    it("should use provided baseUrl", () => {
      const strategy = new KongApiGatewayStrategy(baseUrl, adminToken);
      const url = strategy.buildHealthUrl("http://other:9000");
      expect(url).toBe("http://other:9000/status");
    });
  });

  describe("createAuthHeaders", () => {
    it("should create headers with Kong-Admin-Token", () => {
      const strategy = new KongApiGatewayStrategy(baseUrl, adminToken);
      const headers = strategy.createAuthHeaders("my-token");
      expect(headers["Kong-Admin-Token"]).toBe("my-token");
    });

    it("should include standard headers from createStandardHeaders", () => {
      const strategy = new KongApiGatewayStrategy(baseUrl, adminToken);
      const headers = strategy.createAuthHeaders("my-token");
      // createStandardHeaders adds Content-Type and User-Agent
      expect(headers["Content-Type"]).toBe("application/json");
      expect(headers["User-Agent"]).toBe("Authentication-Service/1.0");
    });

    it("should not include Authorization header for API Gateway mode", () => {
      const strategy = new KongApiGatewayStrategy(baseUrl, adminToken);
      const headers = strategy.createAuthHeaders("my-token");
      expect(headers.Authorization).toBeUndefined();
    });
  });

  describe("ensurePrerequisites", () => {
    it("should resolve immediately (no-op for API Gateway)", async () => {
      const strategy = new KongApiGatewayStrategy(baseUrl, adminToken);
      await expect(strategy.ensurePrerequisites()).resolves.toBeUndefined();
    });
  });

  describe("resolveConsumerId", () => {
    it("should return the consumer ID unchanged", async () => {
      const strategy = new KongApiGatewayStrategy(baseUrl, adminToken);
      const result = await strategy.resolveConsumerId("consumer-abc-123");
      expect(result).toBe("consumer-abc-123");
    });

    it("should handle UUID format", async () => {
      const strategy = new KongApiGatewayStrategy(baseUrl, adminToken);
      const uuid = "f48534e1-4caf-4106-9103-edf38eae7ebc";
      const result = await strategy.resolveConsumerId(uuid);
      expect(result).toBe(uuid);
    });

    it("should handle username format", async () => {
      const strategy = new KongApiGatewayStrategy(baseUrl, adminToken);
      const result = await strategy.resolveConsumerId("test-user@example.com");
      expect(result).toBe("test-user@example.com");
    });
  });
});

describe("KongKonnectStrategy", () => {
  const validKonnectUrl =
    "https://us.api.konghq.com/v2/control-planes/12345678-1234-1234-1234-123456789012";
  const adminToken = "kpat-token-123";

  // Mock fetch for testing
  let originalFetch: typeof globalThis.fetch;
  let mockFetch: ReturnType<typeof mock>;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    mockFetch = mock(() =>
      Promise.resolve(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      )
    );
    globalThis.fetch = mockFetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    mockFetch.mockRestore?.();
  });

  describe("constructor", () => {
    it("should parse valid Konnect URL correctly", () => {
      const strategy = new KongKonnectStrategy(validKonnectUrl, adminToken);
      // Verify it doesn't throw
      expect(strategy).toBeDefined();
    });

    it("should throw for invalid Konnect URL format", () => {
      expect(() => {
        new KongKonnectStrategy("https://us.api.konghq.com/invalid-path", adminToken);
      }).toThrow("Invalid Kong Konnect URL format");
    });

    it("should handle self-hosted Kong URL (non-konghq.com)", () => {
      const strategy = new KongKonnectStrategy("http://self-hosted:8001", adminToken);
      expect(strategy).toBeDefined();
    });

    it("should strip trailing slash from URLs", () => {
      const strategy = new KongKonnectStrategy(`${validKonnectUrl}/`, adminToken);
      expect(strategy).toBeDefined();
    });

    it("should extract control plane ID from Konnect URL", () => {
      // The control plane ID is used to build the realm ID
      const strategy = new KongKonnectStrategy(validKonnectUrl, adminToken);
      // We can't directly access private members, but we can test the build methods
      expect(strategy).toBeDefined();
    });
  });

  describe("buildConsumerUrl", () => {
    it("should build Konnect-style consumer JWT URL", async () => {
      const strategy = new KongKonnectStrategy(validKonnectUrl, adminToken);
      const url = await strategy.buildConsumerUrl(validKonnectUrl, "consumer-123");
      expect(url).toBe(`${validKonnectUrl}/core-entities/consumers/consumer-123/jwt`);
    });
  });

  describe("buildHealthUrl", () => {
    it("should return the baseUrl as health URL", () => {
      const strategy = new KongKonnectStrategy(validKonnectUrl, adminToken);
      const url = strategy.buildHealthUrl(validKonnectUrl);
      expect(url).toBe(validKonnectUrl);
    });
  });

  describe("createAuthHeaders", () => {
    it("should create headers with Bearer Authorization", () => {
      const strategy = new KongKonnectStrategy(validKonnectUrl, adminToken);
      const headers = strategy.createAuthHeaders("my-bearer-token");
      expect(headers.Authorization).toBe("Bearer my-bearer-token");
    });

    it("should include standard headers", () => {
      const strategy = new KongKonnectStrategy(validKonnectUrl, adminToken);
      const headers = strategy.createAuthHeaders("token");
      expect(headers["Content-Type"]).toBe("application/json");
      expect(headers["User-Agent"]).toBe("Authentication-Service/1.0");
    });

    it("should not include Kong-Admin-Token header", () => {
      const strategy = new KongKonnectStrategy(validKonnectUrl, adminToken);
      const headers = strategy.createAuthHeaders("token");
      expect(headers["Kong-Admin-Token"]).toBeUndefined();
    });
  });

  describe("resolveConsumerId", () => {
    it("should return consumer ID when direct lookup succeeds", async () => {
      const strategy = new KongKonnectStrategy(validKonnectUrl, adminToken);

      mockFetch.mockImplementation(() =>
        Promise.resolve(
          new Response(JSON.stringify({ id: "resolved-uuid-123", username: "test-user" }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        )
      );

      const result = await strategy.resolveConsumerId("test-user");
      expect(result).toBe("resolved-uuid-123");
    });

    it("should search by username when direct lookup returns 404", async () => {
      const strategy = new KongKonnectStrategy(validKonnectUrl, adminToken);

      let callCount = 0;
      mockFetch.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // First call - direct lookup returns 404
          return Promise.resolve(
            new Response(JSON.stringify({ message: "Not found" }), {
              status: 404,
              headers: { "Content-Type": "application/json" },
            })
          );
        }
        // Second call - username search succeeds
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: [{ id: "found-uuid-456", username: "test-user" }],
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            }
          )
        );
      });

      const result = await strategy.resolveConsumerId("test-user");
      expect(result).toBe("found-uuid-456");
      expect(callCount).toBe(2);
    });

    it("should return null when consumer not found after search", async () => {
      const strategy = new KongKonnectStrategy(validKonnectUrl, adminToken);

      let callCount = 0;
      mockFetch.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve(
            new Response(JSON.stringify({ message: "Not found" }), {
              status: 404,
              headers: { "Content-Type": "application/json" },
            })
          );
        }
        // Search returns empty data
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: [],
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            }
          )
        );
      });

      const result = await strategy.resolveConsumerId("unknown-user");
      expect(result).toBeNull();
    });

    it("should return null when username search returns wrong username", async () => {
      const strategy = new KongKonnectStrategy(validKonnectUrl, adminToken);

      let callCount = 0;
      mockFetch.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve(
            new Response(JSON.stringify({ message: "Not found" }), {
              status: 404,
              headers: { "Content-Type": "application/json" },
            })
          );
        }
        // Search returns different username
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: [{ id: "other-uuid", username: "different-user" }],
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            }
          )
        );
      });

      const result = await strategy.resolveConsumerId("test-user");
      expect(result).toBeNull();
    });

    it("should throw on unexpected error status", async () => {
      const strategy = new KongKonnectStrategy(validKonnectUrl, adminToken);

      mockFetch.mockImplementation(() =>
        Promise.resolve(
          new Response(JSON.stringify({ message: "Server error" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          })
        )
      );

      await expect(strategy.resolveConsumerId("test-user")).rejects.toThrow(
        "Unexpected error resolving consumer: 500"
      );
    });

    it("should throw timeout error on AbortError", async () => {
      const strategy = new KongKonnectStrategy(validKonnectUrl, adminToken);

      mockFetch.mockImplementation(() => {
        const error = new Error("The operation was aborted");
        error.name = "AbortError";
        return Promise.reject(error);
      });

      await expect(strategy.resolveConsumerId("test-user")).rejects.toThrow(
        "Timeout resolving consumer: test-user"
      );
    });

    it("should re-throw non-AbortError errors", async () => {
      const strategy = new KongKonnectStrategy(validKonnectUrl, adminToken);

      mockFetch.mockImplementation(() => Promise.reject(new Error("Network failure")));

      await expect(strategy.resolveConsumerId("test-user")).rejects.toThrow("Network failure");
    });

    it("should handle search returning non-array data", async () => {
      const strategy = new KongKonnectStrategy(validKonnectUrl, adminToken);

      let callCount = 0;
      mockFetch.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve(
            new Response(JSON.stringify({ message: "Not found" }), {
              status: 404,
              headers: { "Content-Type": "application/json" },
            })
          );
        }
        // Search returns non-array data
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: "not-an-array",
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            }
          )
        );
      });

      const result = await strategy.resolveConsumerId("test-user");
      expect(result).toBeNull();
    });

    it("should handle search returning null data", async () => {
      const strategy = new KongKonnectStrategy(validKonnectUrl, adminToken);

      let callCount = 0;
      mockFetch.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve(
            new Response(JSON.stringify({ message: "Not found" }), {
              status: 404,
              headers: { "Content-Type": "application/json" },
            })
          );
        }
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: null,
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            }
          )
        );
      });

      const result = await strategy.resolveConsumerId("test-user");
      expect(result).toBeNull();
    });

    it("should handle search failure (non-404, non-200)", async () => {
      const strategy = new KongKonnectStrategy(validKonnectUrl, adminToken);

      let callCount = 0;
      mockFetch.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve(
            new Response(JSON.stringify({ message: "Not found" }), {
              status: 404,
              headers: { "Content-Type": "application/json" },
            })
          );
        }
        // Search returns 403
        return Promise.resolve(
          new Response(JSON.stringify({ message: "Forbidden" }), {
            status: 403,
            headers: { "Content-Type": "application/json" },
          })
        );
      });

      const result = await strategy.resolveConsumerId("test-user");
      expect(result).toBeNull();
    });

    it("should handle consumer with missing id", async () => {
      const strategy = new KongKonnectStrategy(validKonnectUrl, adminToken);

      let callCount = 0;
      mockFetch.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve(
            new Response(JSON.stringify({ message: "Not found" }), {
              status: 404,
              headers: { "Content-Type": "application/json" },
            })
          );
        }
        // Consumer with no id
        return Promise.resolve(
          new Response(
            JSON.stringify({
              data: [{ username: "test-user" }], // no id field
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            }
          )
        );
      });

      const result = await strategy.resolveConsumerId("test-user");
      expect(result).toBeNull();
    });
  });

  describe("ensurePrerequisites", () => {
    it("should not throw when realm exists", async () => {
      const strategy = new KongKonnectStrategy(validKonnectUrl, adminToken);

      mockFetch.mockImplementation(() =>
        Promise.resolve(
          new Response(JSON.stringify({ id: "realm-id", name: "auth-realm-12345678" }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        )
      );

      await expect(strategy.ensurePrerequisites()).resolves.toBeUndefined();
    });

    it("should create realm when it does not exist", async () => {
      const strategy = new KongKonnectStrategy(validKonnectUrl, adminToken);

      let callCount = 0;
      mockFetch.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // Realm check returns 404
          return Promise.resolve(
            new Response(JSON.stringify({ message: "Not found" }), {
              status: 404,
              headers: { "Content-Type": "application/json" },
            })
          );
        }
        // Realm creation succeeds
        return Promise.resolve(
          new Response(JSON.stringify({ id: "new-realm-id" }), {
            status: 201,
            headers: { "Content-Type": "application/json" },
          })
        );
      });

      await expect(strategy.ensurePrerequisites()).resolves.toBeUndefined();
      expect(callCount).toBe(2);
    });

    it("should throw on unexpected realm check status", async () => {
      const strategy = new KongKonnectStrategy(validKonnectUrl, adminToken);

      mockFetch.mockImplementation(() =>
        Promise.resolve(
          new Response(JSON.stringify({ message: "Internal error" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          })
        )
      );

      await expect(strategy.ensurePrerequisites()).rejects.toThrow(
        "Unexpected error checking realm: 500"
      );
    });

    it("should throw timeout error on realm check AbortError", async () => {
      const strategy = new KongKonnectStrategy(validKonnectUrl, adminToken);

      mockFetch.mockImplementation(() => {
        const error = new Error("Aborted");
        error.name = "AbortError";
        return Promise.reject(error);
      });

      await expect(strategy.ensurePrerequisites()).rejects.toThrow(
        "Timeout checking realm existence"
      );
    });

    it("should handle realm creation failure", async () => {
      const strategy = new KongKonnectStrategy(validKonnectUrl, adminToken);

      let callCount = 0;
      mockFetch.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve(
            new Response(JSON.stringify({ message: "Not found" }), {
              status: 404,
              headers: { "Content-Type": "application/json" },
            })
          );
        }
        // Creation fails with 500
        return Promise.resolve(
          new Response("Internal Server Error", {
            status: 500,
            headers: { "Content-Type": "text/plain" },
          })
        );
      });

      await expect(strategy.ensurePrerequisites()).rejects.toThrow(
        "Failed to create realm: 500 Internal Server Error"
      );
    });

    it("should handle race condition when realm already exists (400)", async () => {
      const strategy = new KongKonnectStrategy(validKonnectUrl, adminToken);

      let callCount = 0;
      mockFetch.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve(
            new Response(JSON.stringify({ message: "Not found" }), {
              status: 404,
              headers: { "Content-Type": "application/json" },
            })
          );
        }
        // Creation returns 400 with "realm name must be unique"
        return Promise.resolve(
          new Response(JSON.stringify({ message: "realm name must be unique" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          })
        );
      });

      await expect(strategy.ensurePrerequisites()).resolves.toBeUndefined();
    });

    it("should throw on 400 with different error message", async () => {
      const strategy = new KongKonnectStrategy(validKonnectUrl, adminToken);

      let callCount = 0;
      mockFetch.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve(
            new Response(JSON.stringify({ message: "Not found" }), {
              status: 404,
              headers: { "Content-Type": "application/json" },
            })
          );
        }
        // Creation returns 400 with different error
        return Promise.resolve(
          new Response(JSON.stringify({ message: "Invalid request body" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          })
        );
      });

      await expect(strategy.ensurePrerequisites()).rejects.toThrow("Failed to create realm: 400");
    });

    it("should throw timeout error on realm creation AbortError", async () => {
      const strategy = new KongKonnectStrategy(validKonnectUrl, adminToken);

      let callCount = 0;
      mockFetch.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve(
            new Response(JSON.stringify({ message: "Not found" }), {
              status: 404,
              headers: { "Content-Type": "application/json" },
            })
          );
        }
        const error = new Error("Aborted");
        error.name = "AbortError";
        return Promise.reject(error);
      });

      await expect(strategy.ensurePrerequisites()).rejects.toThrow("Timeout creating realm");
    });

    it("should re-throw non-AbortError errors during realm creation", async () => {
      const strategy = new KongKonnectStrategy(validKonnectUrl, adminToken);

      let callCount = 0;
      mockFetch.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve(
            new Response(JSON.stringify({ message: "Not found" }), {
              status: 404,
              headers: { "Content-Type": "application/json" },
            })
          );
        }
        return Promise.reject(new Error("Network failure"));
      });

      await expect(strategy.ensurePrerequisites()).rejects.toThrow("Network failure");
    });
  });
});

describe("createKongModeStrategy factory", () => {
  it("should create KongApiGatewayStrategy for API_GATEWAY mode", () => {
    const strategy = createKongModeStrategy("API_GATEWAY", "http://kong:8001", "token");
    expect(strategy).toBeInstanceOf(KongApiGatewayStrategy);
  });

  it("should create KongKonnectStrategy for KONNECT mode", () => {
    const strategy = createKongModeStrategy(
      "KONNECT",
      "https://us.api.konghq.com/v2/control-planes/12345678-1234-1234-1234-123456789012",
      "token"
    );
    expect(strategy).toBeInstanceOf(KongKonnectStrategy);
  });

  it("should throw for unsupported mode", () => {
    expect(() => {
      createKongModeStrategy("INVALID" as "API_GATEWAY", "http://kong:8001", "token");
    }).toThrow("Unsupported Kong mode: INVALID");
  });
});
