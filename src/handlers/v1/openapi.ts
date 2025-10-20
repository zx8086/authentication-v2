/* src/handlers/v1/openapi.ts */

import { getApiVersioningConfig, loadConfig } from "../../config/index";
import { getApiDocGenerator } from "../../openapi-generator";
import { log } from "../../utils/logger";

const config = loadConfig();
const versioningConfig = getApiVersioningConfig();

function convertToYaml(obj: any, indent = 0): string {
  const spaces = " ".repeat(indent);
  let yaml = "";

  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) {
      yaml += `${spaces}${key}: null\n`;
    } else if (typeof value === "object" && !Array.isArray(value)) {
      yaml += `${spaces}${key}:\n`;
      yaml += convertToYaml(value, indent + 2);
    } else if (Array.isArray(value)) {
      yaml += `${spaces}${key}:\n`;
      for (const item of value) {
        if (typeof item === "object") {
          yaml += `${spaces}- \n`;
          yaml += convertToYaml(item, indent + 4);
        } else {
          yaml += `${spaces}- ${item}\n`;
        }
      }
    } else if (typeof value === "string") {
      yaml += `${spaces}${key}: "${value}"\n`;
    } else {
      yaml += `${spaces}${key}: ${value}\n`;
    }
  }

  return yaml;
}

export function handleOpenAPISpec(acceptHeader?: string): Response {
  log("Processing OpenAPI spec request", {
    component: "openapi",
    operation: "handle_openapi_spec",
    endpoint: "/",
    accept_header: acceptHeader,
    version: "v1",
  });

  try {
    const spec = getApiDocGenerator().generateSpec();

    // Add version information to the spec using config
    const versionedSpec = {
      ...spec,
      info: {
        ...spec.info,
        version: spec.info.version || config.apiInfo.version,
        "x-api-version": versioningConfig.defaultVersion,
      },
      "x-api-versioning": {
        strategy: versioningConfig.strategy,
        currentVersion: versioningConfig.defaultVersion,
        supportedVersions: versioningConfig.supportedVersions,
        latestVersion: versioningConfig.latestVersion,
        defaultVersion: versioningConfig.defaultVersion,
        headers: {
          versionHeader: versioningConfig.headers.versionHeader,
          responseHeader: versioningConfig.headers.responseHeader,
          supportedHeader: versioningConfig.headers.supportedHeader,
        },
        deprecationPolicy: {
          enabled: versioningConfig.deprecationPolicy.enabled,
          warningHeader: versioningConfig.deprecationPolicy.warningHeader,
          gracePeriodDays: versioningConfig.deprecationPolicy.gracePeriodDays,
        },
        documentation: {
          versioning: `This API uses ${versioningConfig.strategy}-based versioning. Specify the desired version using the ${versioningConfig.headers.versionHeader} header.`,
          backwardCompatibility: `Requests without version headers default to ${versioningConfig.defaultVersion} for backward compatibility.`,
          supportedVersions: `Supported versions: ${versioningConfig.supportedVersions.join(", ")}`,
          latestVersion: `Latest version: ${versioningConfig.latestVersion}`,
        },
      },
    };

    const preferYaml =
      acceptHeader?.includes("application/yaml") ||
      acceptHeader?.includes("text/yaml") ||
      acceptHeader?.includes("application/x-yaml");

    if (preferYaml) {
      const yamlContent = convertToYaml(versionedSpec);
      return new Response(yamlContent, {
        status: 200,
        headers: {
          "Content-Type": "application/yaml",
          [versioningConfig.headers.responseHeader]: versioningConfig.defaultVersion,
          [versioningConfig.headers.supportedHeader]: versioningConfig.supportedVersions.join(", "),
          "Cache-Control": "public, max-age=300",
          "Access-Control-Allow-Origin": config.apiInfo.cors,
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        },
      });
    }

    return new Response(JSON.stringify(versionedSpec, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        [versioningConfig.headers.responseHeader]: versioningConfig.defaultVersion,
        [versioningConfig.headers.supportedHeader]: versioningConfig.supportedVersions.join(", "),
        "Cache-Control": "public, max-age=300",
        "Access-Control-Allow-Origin": config.apiInfo.cors,
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Failed to generate OpenAPI specification",
        message: error instanceof Error ? error.message : "Unknown error",
        apiVersion: versioningConfig.defaultVersion,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          [versioningConfig.headers.responseHeader]: versioningConfig.defaultVersion,
          "Access-Control-Allow-Origin": config.apiInfo.cors,
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        },
      }
    );
  }
}
