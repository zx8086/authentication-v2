import { describe, expect, it } from "bun:test";
import {
  addDeprecationHeaders,
  type DeprecationConfig,
  getDeprecationHeaders,
  getVersionDeprecation,
  isSunsetPassed,
  type VersionDeprecationMap,
} from "../../../src/utils/response";

describe("Deprecation Headers", () => {
  describe("addDeprecationHeaders", () => {
    it("should set Sunset header in RFC format", () => {
      const headers = new Headers();
      const sunsetDate = new Date("2025-12-31T23:59:59Z");
      const config: DeprecationConfig = { sunsetDate };

      addDeprecationHeaders(headers, config);

      expect(headers.get("Sunset")).toBe(sunsetDate.toUTCString());
    });

    it("should set Deprecation header to true", () => {
      const headers = new Headers();
      const config: DeprecationConfig = { sunsetDate: new Date("2025-12-31") };

      addDeprecationHeaders(headers, config);

      expect(headers.get("Deprecation")).toBe("true");
    });

    it("should add Link header with rel=sunset when migrationUrl provided", () => {
      const headers = new Headers();
      const config: DeprecationConfig = {
        sunsetDate: new Date("2025-12-31"),
        migrationUrl: "https://api.example.com/v2/docs",
      };

      addDeprecationHeaders(headers, config);

      expect(headers.get("Link")).toBe('<https://api.example.com/v2/docs>; rel="sunset"');
    });

    it("should append to existing Link header", () => {
      const headers = new Headers();
      headers.set("Link", '<https://example.com>; rel="self"');

      const config: DeprecationConfig = {
        sunsetDate: new Date("2025-12-31"),
        migrationUrl: "https://api.example.com/v2",
      };

      addDeprecationHeaders(headers, config);

      const linkHeader = headers.get("Link");
      expect(linkHeader).toContain('<https://example.com>; rel="self"');
      expect(linkHeader).toContain('<https://api.example.com/v2>; rel="sunset"');
    });

    it("should not add Link header when migrationUrl not provided", () => {
      const headers = new Headers();
      const config: DeprecationConfig = { sunsetDate: new Date("2025-12-31") };

      addDeprecationHeaders(headers, config);

      expect(headers.get("Link")).toBeNull();
    });
  });

  describe("getDeprecationHeaders", () => {
    it("should return Sunset header in RFC format", () => {
      const sunsetDate = new Date("2025-06-30T12:00:00Z");
      const config: DeprecationConfig = { sunsetDate };

      const headers = getDeprecationHeaders(config);

      expect(headers.Sunset).toBe(sunsetDate.toUTCString());
    });

    it("should return Deprecation header as true", () => {
      const config: DeprecationConfig = { sunsetDate: new Date("2025-12-31") };

      const headers = getDeprecationHeaders(config);

      expect(headers.Deprecation).toBe("true");
    });

    it("should include Link header when migrationUrl provided", () => {
      const config: DeprecationConfig = {
        sunsetDate: new Date("2025-12-31"),
        migrationUrl: "https://docs.example.com/migration",
      };

      const headers = getDeprecationHeaders(config);

      expect(headers.Link).toBe('<https://docs.example.com/migration>; rel="sunset"');
    });

    it("should not include Link header when migrationUrl not provided", () => {
      const config: DeprecationConfig = { sunsetDate: new Date("2025-12-31") };

      const headers = getDeprecationHeaders(config);

      expect(headers.Link).toBeUndefined();
    });
  });

  describe("getVersionDeprecation", () => {
    const deprecationMap: VersionDeprecationMap = {
      v1: {
        sunsetDate: new Date("2025-06-30"),
        migrationUrl: "https://api.example.com/v2/docs",
        message: "v1 is deprecated, please migrate to v2",
      },
    };

    it("should return deprecation config for v1", () => {
      const config = getVersionDeprecation("v1", deprecationMap);

      expect(config).toBeDefined();
      expect(config?.sunsetDate).toEqual(new Date("2025-06-30"));
      expect(config?.migrationUrl).toBe("https://api.example.com/v2/docs");
    });

    it("should return undefined for v2 when not in map", () => {
      const config = getVersionDeprecation("v2", deprecationMap);

      expect(config).toBeUndefined();
    });

    it("should return undefined for empty deprecation map", () => {
      const config = getVersionDeprecation("v1", {});

      expect(config).toBeUndefined();
    });

    it("should handle deprecation config with only sunsetDate", () => {
      const minimalMap: VersionDeprecationMap = {
        v1: { sunsetDate: new Date("2025-01-01") },
      };

      const config = getVersionDeprecation("v1", minimalMap);

      expect(config?.sunsetDate).toEqual(new Date("2025-01-01"));
      expect(config?.migrationUrl).toBeUndefined();
    });
  });

  describe("isSunsetPassed", () => {
    it("should return true when sunset date is in the past", () => {
      const config: DeprecationConfig = {
        sunsetDate: new Date("2020-01-01"),
      };

      expect(isSunsetPassed(config)).toBe(true);
    });

    it("should return false when sunset date is in the future", () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const config: DeprecationConfig = {
        sunsetDate: futureDate,
      };

      expect(isSunsetPassed(config)).toBe(false);
    });

    it("should handle sunset date exactly now", () => {
      const config: DeprecationConfig = {
        sunsetDate: new Date(),
      };

      const result = isSunsetPassed(config);
      expect(typeof result).toBe("boolean");
    });
  });
});
