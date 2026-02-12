/* test/bun/utils/deprecation-headers.test.ts
 * Tests for RFC 8594 Sunset header support
 * @see https://www.rfc-editor.org/rfc/rfc8594
 */

import { describe, expect, it } from "bun:test";
import {
  addDeprecationHeaders,
  type DeprecationConfig,
  getDeprecationHeaders,
  getVersionDeprecation,
  isSunsetPassed,
  type VersionDeprecationMap,
} from "../../../src/utils/response";

describe("RFC 8594 Sunset Header Support", () => {
  describe("addDeprecationHeaders", () => {
    it("should add Sunset header in RFC 7231 HTTP-date format", () => {
      const headers = new Headers();
      const sunsetDate = new Date("2025-06-01T00:00:00Z");

      addDeprecationHeaders(headers, { sunsetDate });

      expect(headers.get("Sunset")).toBe(sunsetDate.toUTCString());
      expect(headers.get("Sunset")).toBe("Sun, 01 Jun 2025 00:00:00 GMT");
    });

    it("should add Deprecation header with value 'true'", () => {
      const headers = new Headers();
      const sunsetDate = new Date("2025-06-01T00:00:00Z");

      addDeprecationHeaders(headers, { sunsetDate });

      expect(headers.get("Deprecation")).toBe("true");
    });

    it("should add Link header with rel='sunset' when migrationUrl provided", () => {
      const headers = new Headers();
      const deprecationConfig: DeprecationConfig = {
        sunsetDate: new Date("2025-06-01T00:00:00Z"),
        migrationUrl: "https://docs.example.com/api/v2-migration",
      };

      addDeprecationHeaders(headers, deprecationConfig);

      expect(headers.get("Link")).toBe('<https://docs.example.com/api/v2-migration>; rel="sunset"');
    });

    it("should not add Link header when migrationUrl is not provided", () => {
      const headers = new Headers();
      const sunsetDate = new Date("2025-06-01T00:00:00Z");

      addDeprecationHeaders(headers, { sunsetDate });

      expect(headers.get("Link")).toBeNull();
    });

    it("should append to existing Link header with comma separation", () => {
      const headers = new Headers();
      headers.set("Link", '<https://other.example.com>; rel="other"');

      const deprecationConfig: DeprecationConfig = {
        sunsetDate: new Date("2025-06-01T00:00:00Z"),
        migrationUrl: "https://docs.example.com/api/v2-migration",
      };

      addDeprecationHeaders(headers, deprecationConfig);

      expect(headers.get("Link")).toBe(
        '<https://other.example.com>; rel="other", <https://docs.example.com/api/v2-migration>; rel="sunset"'
      );
    });

    it("should handle different date formats correctly", () => {
      const headers = new Headers();
      // Use a date in a different timezone context
      const sunsetDate = new Date("2024-12-31T23:59:59Z");

      addDeprecationHeaders(headers, { sunsetDate });

      // Should always be formatted in UTC
      expect(headers.get("Sunset")).toBe("Tue, 31 Dec 2024 23:59:59 GMT");
    });
  });

  describe("getDeprecationHeaders", () => {
    it("should return deprecation headers as a record", () => {
      const deprecationConfig: DeprecationConfig = {
        sunsetDate: new Date("2025-06-01T00:00:00Z"),
        migrationUrl: "https://docs.example.com/migration",
      };

      const headers = getDeprecationHeaders(deprecationConfig);

      expect(headers).toEqual({
        Sunset: "Sun, 01 Jun 2025 00:00:00 GMT",
        Deprecation: "true",
        Link: '<https://docs.example.com/migration>; rel="sunset"',
      });
    });

    it("should not include Link header when migrationUrl is not provided", () => {
      const deprecationConfig: DeprecationConfig = {
        sunsetDate: new Date("2025-06-01T00:00:00Z"),
      };

      const headers = getDeprecationHeaders(deprecationConfig);

      expect(headers).toEqual({
        Sunset: "Sun, 01 Jun 2025 00:00:00 GMT",
        Deprecation: "true",
      });
      expect(headers).not.toHaveProperty("Link");
    });
  });

  describe("getVersionDeprecation", () => {
    it("should return deprecation config for deprecated version", () => {
      const deprecationMap: VersionDeprecationMap = {
        v1: {
          sunsetDate: new Date("2025-06-01T00:00:00Z"),
          migrationUrl: "https://docs.example.com/v2-migration",
          message: "v1 is deprecated",
        },
      };

      const deprecation = getVersionDeprecation("v1", deprecationMap);

      expect(deprecation).toBeDefined();
      expect(deprecation?.sunsetDate).toEqual(new Date("2025-06-01T00:00:00Z"));
      expect(deprecation?.migrationUrl).toBe("https://docs.example.com/v2-migration");
      expect(deprecation?.message).toBe("v1 is deprecated");
    });

    it("should return undefined for non-deprecated version", () => {
      const deprecationMap: VersionDeprecationMap = {
        v1: {
          sunsetDate: new Date("2025-06-01T00:00:00Z"),
        },
      };

      const deprecation = getVersionDeprecation("v2", deprecationMap);

      expect(deprecation).toBeUndefined();
    });

    it("should return undefined for empty deprecation map", () => {
      const deprecationMap: VersionDeprecationMap = {};

      const deprecation = getVersionDeprecation("v1", deprecationMap);

      expect(deprecation).toBeUndefined();
    });
  });

  describe("isSunsetPassed", () => {
    it("should return true when sunset date has passed", () => {
      const deprecationConfig: DeprecationConfig = {
        sunsetDate: new Date("2020-01-01T00:00:00Z"),
      };

      expect(isSunsetPassed(deprecationConfig)).toBe(true);
    });

    it("should return false when sunset date is in the future", () => {
      const deprecationConfig: DeprecationConfig = {
        sunsetDate: new Date("2099-12-31T23:59:59Z"),
      };

      expect(isSunsetPassed(deprecationConfig)).toBe(false);
    });

    it("should handle edge case where sunset is exactly now", () => {
      const now = new Date();
      const deprecationConfig: DeprecationConfig = {
        // Set sunset to 1ms in the past to ensure test reliability
        sunsetDate: new Date(now.getTime() - 1),
      };

      expect(isSunsetPassed(deprecationConfig)).toBe(true);
    });
  });

  describe("Header key mutations", () => {
    it('should use exact "Sunset" header key', () => {
      const headers = new Headers();
      const sunsetDate = new Date("2025-06-01T00:00:00Z");

      addDeprecationHeaders(headers, { sunsetDate });

      // Check exact case
      expect(headers.has("Sunset")).toBe(true);
      // Headers are case-insensitive in HTTP, but we verify exact output
      const headersRecord = getDeprecationHeaders({ sunsetDate });
      expect(Object.keys(headersRecord)).toContain("Sunset");
      expect(Object.keys(headersRecord)).not.toContain("sunset");
      expect(Object.keys(headersRecord)).not.toContain("SUNSET");
    });

    it('should use exact "Deprecation" header key', () => {
      const headers = getDeprecationHeaders({
        sunsetDate: new Date("2025-06-01T00:00:00Z"),
      });

      expect(Object.keys(headers)).toContain("Deprecation");
      expect(Object.keys(headers)).not.toContain("deprecation");
      expect(Object.keys(headers)).not.toContain("DEPRECATION");
    });

    it('should use exact "Link" header key', () => {
      const headers = getDeprecationHeaders({
        sunsetDate: new Date("2025-06-01T00:00:00Z"),
        migrationUrl: "https://example.com",
      });

      expect(Object.keys(headers)).toContain("Link");
      expect(Object.keys(headers)).not.toContain("link");
      expect(Object.keys(headers)).not.toContain("LINK");
    });
  });

  describe("Header value mutations", () => {
    it('should use exactly "true" for Deprecation value', () => {
      const headers = getDeprecationHeaders({
        sunsetDate: new Date("2025-06-01T00:00:00Z"),
      });

      expect(headers.Deprecation).toBe("true");
      expect(headers.Deprecation).not.toBe("True");
      expect(headers.Deprecation).not.toBe("TRUE");
      expect(headers.Deprecation).not.toBe("1");
    });

    it('should use correct rel="sunset" format', () => {
      const headers = getDeprecationHeaders({
        sunsetDate: new Date("2025-06-01T00:00:00Z"),
        migrationUrl: "https://example.com",
      });

      expect(headers.Link).toBe('<https://example.com>; rel="sunset"');
      expect(headers.Link).not.toBe("<https://example.com>; rel=sunset");
      expect(headers.Link).not.toBe('<https://example.com>;rel="sunset"');
    });
  });

  describe("Integration scenarios", () => {
    it("should work with typical v1 deprecation configuration", () => {
      const deprecationMap: VersionDeprecationMap = {
        v1: {
          sunsetDate: new Date("2025-12-31T23:59:59Z"),
          migrationUrl: "https://api.example.com/docs/migration/v1-to-v2",
          message: "API v1 is deprecated. Please migrate to v2.",
        },
      };

      const deprecation = getVersionDeprecation("v1", deprecationMap);
      expect(deprecation).toBeDefined();

      const headers = getDeprecationHeaders(deprecation!);
      expect(headers.Sunset).toBe("Wed, 31 Dec 2025 23:59:59 GMT");
      expect(headers.Deprecation).toBe("true");
      expect(headers.Link).toBe('<https://api.example.com/docs/migration/v1-to-v2>; rel="sunset"');
    });

    it("should return empty headers for non-deprecated v2 version", () => {
      const deprecationMap: VersionDeprecationMap = {
        v1: {
          sunsetDate: new Date("2025-12-31T23:59:59Z"),
        },
      };

      const deprecation = getVersionDeprecation("v2", deprecationMap);
      expect(deprecation).toBeUndefined();
    });
  });
});
