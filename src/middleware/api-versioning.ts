/* src/middleware/api-versioning.ts */

import { getApiVersioningConfig } from "../config/index";
import {
  recordApiVersionFallback,
  recordApiVersionHeaderSource,
  recordApiVersionParsingDuration,
  recordApiVersionRequest,
  recordApiVersionUnsupported,
} from "../telemetry/metrics";
import { telemetryTracer } from "../telemetry/tracer";
import { error, log } from "../utils/logger";

export interface VersionRequest extends Request {
  apiVersion: string;
  isLatestVersion: boolean;
}

export interface VersionInfo {
  version: string;
  isLatest: boolean;
  isSupported: boolean;
  error?: string;
}

export interface VersionConfig {
  supportedVersions: string[];
  defaultVersion: string;
  latestVersion: string;
}

export class APIVersioningMiddleware {
  private readonly supportedVersions: Set<string>;
  private readonly defaultVersion: string;
  private readonly latestVersion: string;

  constructor(config: VersionConfig) {
    this.supportedVersions = new Set(config.supportedVersions);
    this.defaultVersion = config.defaultVersion;
    this.latestVersion = config.latestVersion;

    // Validate configuration
    if (!this.supportedVersions.has(this.defaultVersion)) {
      throw new Error(`Default version ${this.defaultVersion} is not in supported versions`);
    }
    if (!this.supportedVersions.has(this.latestVersion)) {
      throw new Error(`Latest version ${this.latestVersion} is not in supported versions`);
    }
  }

  /**
   * Parse version from request headers
   * Priority order:
   * 1. Configured version header (primary)
   * 2. Accept header with media type versioning (fallback)
   * 3. Default version (backward compatibility)
   */
  parseVersion(request: Request): VersionInfo {
    const startTime = Bun.nanoseconds();
    let versionSource = "default";
    let detectedVersion = this.defaultVersion;
    let _parseSuccess = true;
    const url = new URL(request.url);
    const endpoint = url.pathname;

    try {
      const versioningConfig = getApiVersioningConfig();

      // Primary: Configured version header
      const versionHeader = request.headers.get(versioningConfig.headers.versionHeader);
      if (versionHeader) {
        versionSource = versioningConfig.headers.versionHeader;
        detectedVersion = this.normalizeVersion(versionHeader);
        const result = this.validateVersion(
          detectedVersion,
          versioningConfig.headers.versionHeader
        );

        // Record header source metrics
        recordApiVersionHeaderSource(detectedVersion, endpoint, request.method, versionSource);

        // Record parsing duration
        const durationMs = (Bun.nanoseconds() - startTime) / 1_000_000;
        recordApiVersionParsingDuration(detectedVersion, endpoint, request.method, durationMs);

        return result;
      }

      // Fallback: Accept header with media type versioning
      const acceptHeader = request.headers.get("Accept");
      if (acceptHeader) {
        const mediaTypeVersion = this.parseMediaTypeVersion(acceptHeader);
        if (mediaTypeVersion) {
          versionSource = "Accept";
          detectedVersion = mediaTypeVersion;
          const result = this.validateVersion(mediaTypeVersion, "Accept");

          // Record header source metrics
          recordApiVersionHeaderSource(detectedVersion, endpoint, request.method, versionSource);

          // Record parsing duration
          const durationMs = (Bun.nanoseconds() - startTime) / 1_000_000;
          recordApiVersionParsingDuration(detectedVersion, endpoint, request.method, durationMs);

          return result;
        }
      }

      // Default: Backward compatibility
      versionSource = "default";
      recordApiVersionHeaderSource(this.defaultVersion, endpoint, request.method, versionSource);

      log(
        "No version header provided, defaulting to configured default for backward compatibility",
        {
          component: "api-versioning",
          event: "version_defaulted",
          version: this.defaultVersion,
          versionHeader: versioningConfig.headers.versionHeader,
          url: request.url,
          endpoint,
          source: versionSource,
        }
      );

      const result = {
        version: this.defaultVersion,
        isLatest: this.defaultVersion === this.latestVersion,
        isSupported: true,
      };

      // Record parsing duration for default fallback
      const durationMs = (Bun.nanoseconds() - startTime) / 1_000_000;
      recordApiVersionParsingDuration(this.defaultVersion, endpoint, request.method, durationMs);

      return result;
    } catch (err) {
      _parseSuccess = false;
      const durationMs = (Bun.nanoseconds() - startTime) / 1_000_000;

      error("Error parsing API version", {
        component: "api-versioning",
        event: "version_parse_error",
        error: err instanceof Error ? err.message : "Unknown error",
        url: request.url,
        endpoint,
        source: versionSource,
        detectedVersion,
        parseTimeMs: durationMs,
      });

      // Record failed parsing metrics
      recordApiVersionParsingDuration(detectedVersion, endpoint, request.method, durationMs);
      recordApiVersionFallback(detectedVersion, endpoint, request.method);

      return {
        version: this.defaultVersion,
        isLatest: this.defaultVersion === this.latestVersion,
        isSupported: true,
        error: "Version parsing failed, using default",
      };
    }
  }

  /**
   * Create version-aware request object
   */
  createVersionRequest(request: Request): VersionRequest & { versionInfo: VersionInfo } {
    const versionInfo = this.parseVersion(request);
    const url = new URL(request.url);
    const endpoint = url.pathname;
    const versionSource = this.determineVersionSource(request);

    // Create extended request object
    const versionRequest = request as VersionRequest & { versionInfo: VersionInfo };
    versionRequest.apiVersion = versionInfo.version;
    versionRequest.isLatestVersion = versionInfo.isLatest;
    versionRequest.versionInfo = versionInfo;

    // Record API version request metrics with telemetry span
    telemetryTracer.createApiVersionSpan(
      "create_version_request",
      () => {
        recordApiVersionRequest(versionInfo.version, endpoint, request.method, versionSource);

        log("API version detected", {
          component: "api-versioning",
          event: "version_detected",
          version: versionInfo.version,
          isLatest: versionInfo.isLatest,
          isSupported: versionInfo.isSupported,
          method: request.method,
          url: request.url,
          endpoint,
          source: versionSource,
        });
      },
      {
        version: versionInfo.version,
        source: versionSource,
      }
    );

    return versionRequest;
  }

  /**
   * Create response with version headers
   */
  addVersionHeaders(response: Response, version: string): Response {
    const versioningConfig = getApiVersioningConfig();
    const headers = new Headers(response.headers);
    headers.set(versioningConfig.headers.responseHeader, version);
    headers.set(
      versioningConfig.headers.supportedHeader,
      Array.from(this.supportedVersions).join(", ")
    );

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }

  /**
   * Create error response for unsupported version
   */
  createUnsupportedVersionResponse(
    requestedVersion: string,
    source: string,
    endpoint?: string,
    method?: string
  ): Response {
    const versioningConfig = getApiVersioningConfig();
    const errorBody = {
      error: "Unsupported API Version",
      message: `API version '${requestedVersion}' is not supported`,
      requestedVersion,
      supportedVersions: Array.from(this.supportedVersions),
      defaultVersion: this.defaultVersion,
      latestVersion: this.latestVersion,
      source,
    };

    // Record unsupported version metrics
    if (endpoint && method) {
      recordApiVersionUnsupported(requestedVersion, endpoint, method);
    }

    error("Unsupported API version requested", {
      component: "api-versioning",
      event: "unsupported_version",
      requestedVersion,
      supportedVersions: Array.from(this.supportedVersions),
      source,
      endpoint,
      method,
    });

    return new Response(JSON.stringify(errorBody), {
      status: 400,
      headers: {
        "Content-Type": "application/json",
        [versioningConfig.headers.responseHeader]: this.defaultVersion,
        [versioningConfig.headers.supportedHeader]: Array.from(this.supportedVersions).join(", "),
      },
    });
  }

  /**
   * Get supported versions for documentation
   */
  getSupportedVersions(): string[] {
    return Array.from(this.supportedVersions);
  }

  /**
   * Get default version
   */
  getDefaultVersion(): string {
    return this.defaultVersion;
  }

  /**
   * Get latest version
   */
  getLatestVersion(): string {
    return this.latestVersion;
  }

  private normalizeVersion(version: string): string {
    // Remove whitespace and convert to lowercase
    const normalized = version.trim().toLowerCase();

    // Ensure version starts with 'v' prefix
    if (normalized && !normalized.startsWith("v")) {
      return `v${normalized}`;
    }

    return normalized;
  }

  private parseMediaTypeVersion(acceptHeader: string): string | null {
    try {
      // Parse media type versioning patterns:
      // application/vnd.auth.v1+json
      // application/vnd.auth+json;version=1

      const mediaTypeMatch = acceptHeader.match(/application\/vnd\.auth\.v(\d+)\+json/i);
      if (mediaTypeMatch) {
        return `v${mediaTypeMatch[1]}`;
      }

      const parameterMatch = acceptHeader.match(/version=(\d+)/i);
      if (parameterMatch) {
        return `v${parameterMatch[1]}`;
      }

      return null;
    } catch (err) {
      log("Error parsing media type version", {
        component: "api-versioning",
        event: "media_type_parse_error",
        acceptHeader,
        error: err instanceof Error ? err.message : "Unknown error",
      });
      return null;
    }
  }

  private validateVersion(version: string, source: string): VersionInfo {
    if (!version) {
      return {
        version: this.defaultVersion,
        isLatest: this.defaultVersion === this.latestVersion,
        isSupported: true,
        error: "Empty version provided",
      };
    }

    const isSupported = this.supportedVersions.has(version);
    const isLatest = version === this.latestVersion;

    if (!isSupported) {
      return {
        version,
        isLatest: false,
        isSupported: false,
        error: `Unsupported version from ${source}`,
      };
    }

    return {
      version,
      isLatest,
      isSupported: true,
    };
  }

  /**
   * Determine version source for telemetry
   */
  public determineVersionSource(request: Request): string {
    const versioningConfig = getApiVersioningConfig();

    // Check for primary version header
    if (request.headers.get(versioningConfig.headers.versionHeader)) {
      return versioningConfig.headers.versionHeader;
    }

    // Check for Accept header with media type versioning
    const acceptHeader = request.headers.get("Accept");
    if (acceptHeader && this.parseMediaTypeVersion(acceptHeader)) {
      return "Accept";
    }

    return "default";
  }
}

// Default configuration for authentication service
export const createDefaultVersionConfig = (): VersionConfig => ({
  supportedVersions: ["v1"], // Start with v1 only
  defaultVersion: "v1", // Backward compatibility
  latestVersion: "v1", // Current latest
});

// Export singleton instance
let versioningMiddleware: APIVersioningMiddleware | null = null;

export const getVersioningMiddleware = (config?: VersionConfig): APIVersioningMiddleware => {
  if (!versioningMiddleware) {
    // Use configuration from config system if available, otherwise use defaults
    const versioningConfig = getApiVersioningConfig();
    const middlewareConfig: VersionConfig = config || {
      supportedVersions: versioningConfig.supportedVersions,
      defaultVersion: versioningConfig.defaultVersion,
      latestVersion: versioningConfig.latestVersion,
    };
    versioningMiddleware = new APIVersioningMiddleware(middlewareConfig);
  }
  return versioningMiddleware;
};

// Reset for testing
export const resetVersioningMiddleware = (): void => {
  versioningMiddleware = null;
};

/**
 * Get version context for telemetry integration
 */
export function getVersionContextForTelemetry(request: Request):
  | {
      version: string;
      source: string;
      isLatest: boolean;
      isSupported: boolean;
    }
  | undefined {
  try {
    const middleware = getVersioningMiddleware();
    const versionRequest = middleware.createVersionRequest(request);

    return {
      version: versionRequest.versionInfo.version,
      source: (middleware as any).determineVersionSource(request),
      isLatest: versionRequest.versionInfo.isLatest,
      isSupported: versionRequest.versionInfo.isSupported,
    };
  } catch {
    return undefined;
  }
}
