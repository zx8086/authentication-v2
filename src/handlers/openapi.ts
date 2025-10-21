/* src/handlers/openapi.ts */

import { loadConfig } from "../config/index";
import { getApiDocGenerator } from "../openapi-generator";
import { log } from "../utils/logger";

const config = loadConfig();

function convertToYaml(obj: Record<string, unknown> | object, indent = 0): string {
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
  });

  try {
    const spec = getApiDocGenerator().generateSpec();

    const preferYaml =
      acceptHeader?.includes("application/yaml") ||
      acceptHeader?.includes("text/yaml") ||
      acceptHeader?.includes("application/x-yaml");

    if (preferYaml) {
      const yamlContent = convertToYaml(spec);
      return new Response(yamlContent, {
        status: 200,
        headers: {
          "Content-Type": "application/yaml",
          "Cache-Control": "public, max-age=300",
          "Access-Control-Allow-Origin": config.apiInfo.cors,
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        },
      });
    }

    return new Response(JSON.stringify(spec, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
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
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": config.apiInfo.cors,
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        },
      }
    );
  }
}
