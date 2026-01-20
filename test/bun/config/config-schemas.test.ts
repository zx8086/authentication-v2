/* test/bun/config-schemas.test.ts */

import { describe, expect, it } from "bun:test";
import { z } from "zod";
import { GenericCacheEntrySchema } from "../../../src/config/schemas";

describe("Config Schemas", () => {
  describe("GenericCacheEntrySchema", () => {
    it("should validate cache entry with string data", () => {
      const StringCacheEntry = GenericCacheEntrySchema(z.string());

      const validEntry = {
        data: "cached string value",
        expires: Date.now() + 3600000,
        createdAt: Date.now(),
      };

      const result = StringCacheEntry.parse(validEntry);
      expect(result.data).toBe("cached string value");
      expect(result.expires).toBeGreaterThan(Date.now());
    });

    it("should validate cache entry with object data", () => {
      const UserSchema = z.object({
        id: z.string(),
        name: z.string(),
        email: z.string(),
      });

      const UserCacheEntry = GenericCacheEntrySchema(UserSchema);

      const validEntry = {
        data: {
          id: "user-123",
          name: "John Doe",
          email: "john@example.com",
        },
        expires: Date.now() + 3600000,
        createdAt: Date.now(),
      };

      const result = UserCacheEntry.parse(validEntry);
      expect(result.data.id).toBe("user-123");
      expect(result.data.name).toBe("John Doe");
      expect(result.data.email).toBe("john@example.com");
    });

    it("should validate cache entry with number data", () => {
      const NumberCacheEntry = GenericCacheEntrySchema(z.number());

      const validEntry = {
        data: 42,
        expires: Date.now() + 1800000,
        createdAt: Date.now() - 300000,
      };

      const result = NumberCacheEntry.parse(validEntry);
      expect(result.data).toBe(42);
    });

    it("should validate cache entry with array data", () => {
      const ArrayCacheEntry = GenericCacheEntrySchema(z.array(z.string()));

      const validEntry = {
        data: ["item1", "item2", "item3"],
        expires: Date.now() + 7200000,
        createdAt: Date.now(),
      };

      const result = ArrayCacheEntry.parse(validEntry);
      expect(result.data.length).toBe(3);
      expect(result.data[0]).toBe("item1");
    });

    it("should reject cache entry with invalid data type", () => {
      const StringCacheEntry = GenericCacheEntrySchema(z.string());

      const invalidEntry = {
        data: 123,
        expires: Date.now() + 3600000,
        createdAt: Date.now(),
      };

      expect(() => StringCacheEntry.parse(invalidEntry)).toThrow();
    });

    it("should reject cache entry with missing fields", () => {
      const StringCacheEntry = GenericCacheEntrySchema(z.string());

      const invalidEntry = {
        data: "some data",
      };

      expect(() => StringCacheEntry.parse(invalidEntry)).toThrow();
    });

    it("should validate cache entry with complex nested data", () => {
      const ComplexSchema = z.object({
        user: z.object({
          id: z.string(),
          profile: z.object({
            name: z.string(),
            age: z.number(),
          }),
        }),
        metadata: z.record(z.string(), z.any()),
      });

      const ComplexCacheEntry = GenericCacheEntrySchema(ComplexSchema);

      const validEntry = {
        data: {
          user: {
            id: "user-456",
            profile: {
              name: "Jane Smith",
              age: 30,
            },
          },
          metadata: {
            source: "api",
            version: "v2",
          },
        },
        expires: Date.now() + 3600000,
        createdAt: Date.now(),
      };

      const result = ComplexCacheEntry.parse(validEntry);
      expect(result.data.user.id).toBe("user-456");
      expect(result.data.user.profile.age).toBe(30);
      expect(result.data.metadata.source).toBe("api");
    });
  });

  describe("Production Environment Validation", () => {
    it("should reject non-HTTPS telemetry endpoints in production", () => {
      const ProductionConfigSchema = z
        .object({
          environment: z.string(),
          telemetry: z.object({
            endpoints: z
              .array(
                z.object({
                  value: z.string().optional(),
                  path: z.array(z.string()).optional(),
                })
              )
              .optional(),
          }),
        })
        .superRefine((val, ctx) => {
          if (val.environment === "production" && val.telemetry.endpoints) {
            for (const endpoint of val.telemetry.endpoints) {
              if (endpoint.value && !endpoint.value.startsWith("https://")) {
                ctx.addIssue({
                  code: "custom",
                  message: "Production telemetry endpoints must use HTTPS",
                  path: endpoint.path || [],
                });
              }
            }
          }
        });

      const invalidConfig = {
        environment: "production",
        telemetry: {
          endpoints: [{ value: "http://telemetry.example.com", path: ["telemetry", "endpoint"] }],
        },
      };

      expect(() => ProductionConfigSchema.parse(invalidConfig)).toThrow();
    });

    it("should reject localhost in Kong Admin URL for production", () => {
      const ProductionKongConfigSchema = z
        .object({
          environment: z.string(),
          kong: z.object({
            adminUrl: z.string().optional(),
          }),
        })
        .superRefine((val, ctx) => {
          if (
            val.environment === "production" &&
            val.kong.adminUrl &&
            val.kong.adminUrl.includes("localhost")
          ) {
            ctx.addIssue({
              code: "custom",
              message: "Kong Admin URL cannot use localhost in production",
              path: ["kong", "adminUrl"],
            });
          }
        });

      const invalidConfig = {
        environment: "production",
        kong: {
          adminUrl: "http://localhost:8001",
        },
      };

      expect(() => ProductionKongConfigSchema.parse(invalidConfig)).toThrow();
    });

    it("should reject insecure Kong admin tokens in production", () => {
      const ProductionKongTokenSchema = z
        .object({
          environment: z.string(),
          kong: z.object({
            adminToken: z.string().optional(),
          }),
        })
        .superRefine((val, ctx) => {
          if (
            val.environment === "production" &&
            val.kong.adminToken &&
            (val.kong.adminToken === "test" || val.kong.adminToken.length < 32)
          ) {
            ctx.addIssue({
              code: "custom",
              message: "Production Kong admin token must be secure (32+ characters)",
              path: ["kong", "adminToken"],
            });
          }
        });

      const invalidConfigShortToken = {
        environment: "production",
        kong: {
          adminToken: "short",
        },
      };

      expect(() => ProductionKongTokenSchema.parse(invalidConfigShortToken)).toThrow();

      const invalidConfigTestToken = {
        environment: "production",
        kong: {
          adminToken: "test",
        },
      };

      expect(() => ProductionKongTokenSchema.parse(invalidConfigTestToken)).toThrow();
    });

    it("should accept valid production configurations", () => {
      const ProductionConfigSchema = z
        .object({
          environment: z.string(),
          telemetry: z.object({
            endpoints: z
              .array(
                z.object({
                  value: z.string().optional(),
                  path: z.array(z.string()).optional(),
                })
              )
              .optional(),
          }),
          kong: z.object({
            adminUrl: z.string().optional(),
            adminToken: z.string().optional(),
          }),
        })
        .superRefine((val, ctx) => {
          if (val.environment === "production") {
            if (val.telemetry.endpoints) {
              for (const endpoint of val.telemetry.endpoints) {
                if (endpoint.value && !endpoint.value.startsWith("https://")) {
                  ctx.addIssue({
                    code: "custom",
                    message: "Production telemetry endpoints must use HTTPS",
                    path: endpoint.path || [],
                  });
                }
              }
            }

            if (val.kong.adminUrl?.includes("localhost")) {
              ctx.addIssue({
                code: "custom",
                message: "Kong Admin URL cannot use localhost in production",
                path: ["kong", "adminUrl"],
              });
            }

            if (
              val.kong.adminToken &&
              (val.kong.adminToken === "test" || val.kong.adminToken.length < 32)
            ) {
              ctx.addIssue({
                code: "custom",
                message: "Production Kong admin token must be secure (32+ characters)",
                path: ["kong", "adminToken"],
              });
            }
          }
        });

      const validConfig = {
        environment: "production",
        telemetry: {
          endpoints: [{ value: "https://secure-telemetry.example.com" }],
        },
        kong: {
          adminUrl: "https://kong-admin.example.com",
          adminToken: "a".repeat(32),
        },
      };

      const result = ProductionConfigSchema.parse(validConfig);
      expect(result.environment).toBe("production");
    });
  });
});
