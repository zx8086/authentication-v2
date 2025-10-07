/* src/middleware/error-handler.ts */

import { loadConfig } from "../config/index";
import { log } from "../utils/logger";

const config = loadConfig();

export function handleNotFound(url: URL): Response {
  const requestId = crypto.randomUUID();

  log("HTTP request processed", {
    method: "GET",
    url: url.pathname,
    statusCode: 404,
    requestId,
  });

  return new Response(
    JSON.stringify({
      error: "Not Found",
      message: `Path ${url.pathname} not found`,
    }),
    {
      status: 404,
      headers: {
        "Content-Type": "application/json",
        "X-Request-Id": requestId,
        "Access-Control-Allow-Origin": config.apiInfo.cors,
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      },
    }
  );
}

export function handleServerError(_error: Error): Response {
  const requestId = crypto.randomUUID();

  return new Response(
    JSON.stringify({
      error: "Internal Server Error",
      message: "An unexpected error occurred",
      statusCode: 500,
      timestamp: new Date().toISOString(),
      requestId,
    }),
    {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "X-Request-Id": requestId,
        "Access-Control-Allow-Origin": config.apiInfo.cors,
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      },
    }
  );
}
