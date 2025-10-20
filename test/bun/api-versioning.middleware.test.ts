/* test/bun/api-versioning.middleware.test.ts */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import {
  APIVersioningMiddleware,
  getVersioningMiddleware,
  resetVersioningMiddleware,
  createDefaultVersionConfig,
  type VersionConfig,
  type VersionInfo
} from '../../src/middleware/api-versioning';

describe('API Versioning Middleware', () => {
  let middleware: APIVersioningMiddleware;
  const mockConfig: VersionConfig = {
    supportedVersions: ['v1', 'v2'],
    defaultVersion: 'v1',
    latestVersion: 'v2'
  };

  beforeEach(() => {
    resetVersioningMiddleware();
    middleware = new APIVersioningMiddleware(mockConfig);
  });

  afterEach(() => {
    resetVersioningMiddleware();
  });

  describe('Configuration Validation', () => {
    test('should create middleware with valid configuration', () => {
      expect(middleware.getSupportedVersions()).toEqual(['v1', 'v2']);
      expect(middleware.getDefaultVersion()).toBe('v1');
      expect(middleware.getLatestVersion()).toBe('v2');
    });

    test('should throw error if default version not in supported versions', () => {
      const invalidConfig: VersionConfig = {
        supportedVersions: ['v1', 'v2'],
        defaultVersion: 'v3',
        latestVersion: 'v2'
      };

      expect(() => new APIVersioningMiddleware(invalidConfig)).toThrow(
        'Default version v3 is not in supported versions'
      );
    });

    test('should throw error if latest version not in supported versions', () => {
      const invalidConfig: VersionConfig = {
        supportedVersions: ['v1', 'v2'],
        defaultVersion: 'v1',
        latestVersion: 'v3'
      };

      expect(() => new APIVersioningMiddleware(invalidConfig)).toThrow(
        'Latest version v3 is not in supported versions'
      );
    });

    test('should create default configuration', () => {
      const defaultConfig = createDefaultVersionConfig();
      expect(defaultConfig).toEqual({
        supportedVersions: ['v1'],
        defaultVersion: 'v1',
        latestVersion: 'v1'
      });
    });
  });

  describe('Version Header Parsing', () => {
    test('should parse valid Accept-Version header', () => {
      const request = new Request('http://localhost/', {
        headers: { 'Accept-Version': 'v1' }
      });

      const versionInfo = middleware.parseVersion(request);
      expect(versionInfo.version).toBe('v1');
      expect(versionInfo.isSupported).toBe(true);
      expect(versionInfo.isLatest).toBe(false);
    });

    test('should parse latest version correctly', () => {
      const request = new Request('http://localhost/', {
        headers: { 'Accept-Version': 'v2' }
      });

      const versionInfo = middleware.parseVersion(request);
      expect(versionInfo.version).toBe('v2');
      expect(versionInfo.isSupported).toBe(true);
      expect(versionInfo.isLatest).toBe(true);
    });

    test('should normalize version without v prefix', () => {
      const request = new Request('http://localhost/', {
        headers: { 'Accept-Version': '1' }
      });

      const versionInfo = middleware.parseVersion(request);
      expect(versionInfo.version).toBe('v1');
      expect(versionInfo.isSupported).toBe(true);
    });

    test('should handle whitespace in version header', () => {
      const request = new Request('http://localhost/', {
        headers: { 'Accept-Version': '  v1  ' }
      });

      const versionInfo = middleware.parseVersion(request);
      expect(versionInfo.version).toBe('v1');
      expect(versionInfo.isSupported).toBe(true);
    });

    test('should return unsupported for invalid version', () => {
      const request = new Request('http://localhost/', {
        headers: { 'Accept-Version': 'v99' }
      });

      const versionInfo = middleware.parseVersion(request);
      expect(versionInfo.version).toBe('v99');
      expect(versionInfo.isSupported).toBe(false);
      expect(versionInfo.error).toContain('Unsupported version');
    });

    test('should handle empty version header', () => {
      const request = new Request('http://localhost/', {
        headers: { 'Accept-Version': '' }
      });

      const versionInfo = middleware.parseVersion(request);
      expect(versionInfo.version).toBe('v1'); // Default
      expect(versionInfo.isSupported).toBe(true);
      expect(versionInfo.error).toBeUndefined(); // Falls back to default behavior
    });
  });

  describe('Media Type Version Parsing', () => {
    test('should parse media type versioning application/vnd.auth.v1+json', () => {
      const request = new Request('http://localhost/', {
        headers: { 'Accept': 'application/vnd.auth.v1+json' }
      });

      const versionInfo = middleware.parseVersion(request);
      expect(versionInfo.version).toBe('v1');
      expect(versionInfo.isSupported).toBe(true);
    });

    test('should parse media type versioning application/vnd.auth.v2+json', () => {
      const request = new Request('http://localhost/', {
        headers: { 'Accept': 'application/vnd.auth.v2+json' }
      });

      const versionInfo = middleware.parseVersion(request);
      expect(versionInfo.version).toBe('v2');
      expect(versionInfo.isSupported).toBe(true);
      expect(versionInfo.isLatest).toBe(true);
    });

    test('should parse parameter-based versioning version=1', () => {
      const request = new Request('http://localhost/', {
        headers: { 'Accept': 'application/json;version=1' }
      });

      const versionInfo = middleware.parseVersion(request);
      expect(versionInfo.version).toBe('v1');
      expect(versionInfo.isSupported).toBe(true);
    });

    test('should parse parameter-based versioning version=2', () => {
      const request = new Request('http://localhost/', {
        headers: { 'Accept': 'application/json;version=2' }
      });

      const versionInfo = middleware.parseVersion(request);
      expect(versionInfo.version).toBe('v2');
      expect(versionInfo.isSupported).toBe(true);
      expect(versionInfo.isLatest).toBe(true);
    });

    test('should handle unsupported media type version', () => {
      const request = new Request('http://localhost/', {
        headers: { 'Accept': 'application/vnd.auth.v99+json' }
      });

      const versionInfo = middleware.parseVersion(request);
      expect(versionInfo.version).toBe('v99');
      expect(versionInfo.isSupported).toBe(false);
    });

    test('should prioritize Accept-Version over Accept header', () => {
      const request = new Request('http://localhost/', {
        headers: {
          'Accept-Version': 'v2',
          'Accept': 'application/vnd.auth.v1+json'
        }
      });

      const versionInfo = middleware.parseVersion(request);
      expect(versionInfo.version).toBe('v2');
      expect(versionInfo.isSupported).toBe(true);
      expect(versionInfo.isLatest).toBe(true);
    });
  });

  describe('Backward Compatibility', () => {
    test('should default to v1 when no version headers present', () => {
      const request = new Request('http://localhost/');

      const versionInfo = middleware.parseVersion(request);
      expect(versionInfo.version).toBe('v1');
      expect(versionInfo.isSupported).toBe(true);
      expect(versionInfo.isLatest).toBe(false);
    });

    test('should handle requests with no Accept header', () => {
      const request = new Request('http://localhost/', {
        headers: {}
      });

      const versionInfo = middleware.parseVersion(request);
      expect(versionInfo.version).toBe('v1');
      expect(versionInfo.isSupported).toBe(true);
    });

    test('should handle Accept header without versioning', () => {
      const request = new Request('http://localhost/', {
        headers: { 'Accept': 'application/json' }
      });

      const versionInfo = middleware.parseVersion(request);
      expect(versionInfo.version).toBe('v1');
      expect(versionInfo.isSupported).toBe(true);
    });
  });

  describe('Version Request Creation', () => {
    test('should create version request with valid version', () => {
      const request = new Request('http://localhost/', {
        headers: { 'Accept-Version': 'v2' }
      });

      const versionRequest = middleware.createVersionRequest(request);
      expect(versionRequest.apiVersion).toBe('v2');
      expect(versionRequest.isLatestVersion).toBe(true);
      expect(versionRequest.versionInfo.version).toBe('v2');
      expect(versionRequest.versionInfo.isSupported).toBe(true);
    });

    test('should create version request with default version', () => {
      const request = new Request('http://localhost/');

      const versionRequest = middleware.createVersionRequest(request);
      expect(versionRequest.apiVersion).toBe('v1');
      expect(versionRequest.isLatestVersion).toBe(false);
      expect(versionRequest.versionInfo.version).toBe('v1');
      expect(versionRequest.versionInfo.isSupported).toBe(true);
    });

    test('should create version request with unsupported version', () => {
      const request = new Request('http://localhost/', {
        headers: { 'Accept-Version': 'v99' }
      });

      const versionRequest = middleware.createVersionRequest(request);
      expect(versionRequest.apiVersion).toBe('v99');
      expect(versionRequest.isLatestVersion).toBe(false);
      expect(versionRequest.versionInfo.version).toBe('v99');
      expect(versionRequest.versionInfo.isSupported).toBe(false);
    });
  });

  describe('Response Header Management', () => {
    test('should add version headers to response', () => {
      const originalResponse = new Response('{"test": true}', {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

      const versionedResponse = middleware.addVersionHeaders(originalResponse, 'v1');

      expect(versionedResponse.headers.get('API-Version')).toBe('v1');
      expect(versionedResponse.headers.get('Supported-Versions')).toBe('v1, v2');
      expect(versionedResponse.headers.get('Content-Type')).toBe('application/json');
      expect(versionedResponse.status).toBe(200);
    });

    test('should preserve original response properties', async () => {
      const originalResponse = new Response('{"test": true}', {
        status: 201,
        statusText: 'Created',
        headers: { 'Custom-Header': 'value' }
      });

      const versionedResponse = middleware.addVersionHeaders(originalResponse, 'v2');

      expect(versionedResponse.status).toBe(201);
      expect(versionedResponse.statusText).toBe('Created');
      expect(versionedResponse.headers.get('Custom-Header')).toBe('value');
      expect(versionedResponse.headers.get('API-Version')).toBe('v2');
      expect(await versionedResponse.text()).toBe('{"test": true}');
    });
  });

  describe('Error Response Creation', () => {
    test('should create unsupported version error response', async () => {
      const errorResponse = middleware.createUnsupportedVersionResponse('v99', 'Accept-Version');

      expect(errorResponse.status).toBe(400);
      expect(errorResponse.headers.get('Content-Type')).toBe('application/json');
      expect(errorResponse.headers.get('API-Version')).toBe('v1');
      expect(errorResponse.headers.get('Supported-Versions')).toBe('v1, v2');

      const errorBody = await errorResponse.json();
      expect(errorBody.error).toBe('Unsupported API Version');
      expect(errorBody.message).toBe("API version 'v99' is not supported");
      expect(errorBody.requestedVersion).toBe('v99');
      expect(errorBody.supportedVersions).toEqual(['v1', 'v2']);
      expect(errorBody.defaultVersion).toBe('v1');
      expect(errorBody.latestVersion).toBe('v2');
      expect(errorBody.source).toBe('Accept-Version');
    });

    test('should create error response with media type source', async () => {
      const errorResponse = middleware.createUnsupportedVersionResponse('v99', 'Accept');

      const errorBody = await errorResponse.json();
      expect(errorBody.source).toBe('Accept');
    });
  });

  describe('Error Handling', () => {
    test('should handle malformed Accept header gracefully', () => {
      const request = new Request('http://localhost/', {
        headers: { 'Accept': 'invalid[malformed}header' }
      });

      const versionInfo = middleware.parseVersion(request);
      expect(versionInfo.version).toBe('v1'); // Should fallback to default
      expect(versionInfo.isSupported).toBe(true);
    });

    test('should handle very long version strings', () => {
      const longVersion = 'v' + '1'.repeat(1000);
      const request = new Request('http://localhost/', {
        headers: { 'Accept-Version': longVersion }
      });

      const versionInfo = middleware.parseVersion(request);
      expect(versionInfo.version).toBe(longVersion);
      expect(versionInfo.isSupported).toBe(false);
    });

    test('should handle special characters in version', () => {
      const request = new Request('http://localhost/', {
        headers: { 'Accept-Version': 'v1.0-beta+special' }
      });

      const versionInfo = middleware.parseVersion(request);
      expect(versionInfo.version).toBe('v1.0-beta+special');
      expect(versionInfo.isSupported).toBe(false);
    });
  });

  describe('Singleton Instance Management', () => {
    test('should return same instance on multiple calls', () => {
      const instance1 = getVersioningMiddleware();
      const instance2 = getVersioningMiddleware();
      expect(instance1).toBe(instance2);
    });

    test('should create new instance after reset', () => {
      const instance1 = getVersioningMiddleware();
      resetVersioningMiddleware();
      const instance2 = getVersioningMiddleware();
      expect(instance1).not.toBe(instance2);
    });

    test('should use provided config for new instance', () => {
      resetVersioningMiddleware();
      const customConfig: VersionConfig = {
        supportedVersions: ['v1', 'v2', 'v3'],
        defaultVersion: 'v2',
        latestVersion: 'v3'
      };

      const instance = getVersioningMiddleware(customConfig);
      expect(instance.getSupportedVersions()).toEqual(['v1', 'v2', 'v3']);
      expect(instance.getDefaultVersion()).toBe('v2');
      expect(instance.getLatestVersion()).toBe('v3');
    });
  });

  describe('Case Sensitivity', () => {
    test('should handle case-insensitive version parsing', () => {
      const request = new Request('http://localhost/', {
        headers: { 'Accept-Version': 'V1' }
      });

      const versionInfo = middleware.parseVersion(request);
      expect(versionInfo.version).toBe('v1'); // Should normalize to lowercase
      expect(versionInfo.isSupported).toBe(true);
    });

    test('should handle mixed case in media type versioning', () => {
      const request = new Request('http://localhost/', {
        headers: { 'Accept': 'Application/Vnd.Auth.V1+JSON' }
      });

      const versionInfo = middleware.parseVersion(request);
      expect(versionInfo.version).toBe('v1');
      expect(versionInfo.isSupported).toBe(true);
    });
  });

  describe('Configuration Integration', () => {
    test('should use global config when available', () => {
      // This test verifies that the middleware integrates with the configuration system
      // but uses the provided config since we can't easily mock the config module
      resetVersioningMiddleware();
      const instance = getVersioningMiddleware();

      // Should use default configuration
      expect(instance.getSupportedVersions()).toContain('v1');
      expect(instance.getDefaultVersion()).toBe('v1');
    });
  });

  describe('Performance', () => {
    test('should handle rapid version parsing', () => {
      const requests = Array.from({ length: 100 }, (_, i) =>
        new Request('http://localhost/', {
          headers: { 'Accept-Version': i % 2 === 0 ? 'v1' : 'v2' }
        })
      );

      const start = performance.now();
      requests.forEach(request => {
        middleware.parseVersion(request);
      });
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(100); // Should complete in less than 100ms
    });

    test('should handle large number of version requests', () => {
      const requests = Array.from({ length: 1000 }, (_, i) =>
        new Request(`http://localhost/endpoint${i}`, {
          headers: { 'Accept-Version': 'v1' }
        })
      );

      const start = performance.now();
      requests.forEach(request => {
        middleware.createVersionRequest(request);
      });
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(500); // Should complete in less than 500ms
    });
  });
});