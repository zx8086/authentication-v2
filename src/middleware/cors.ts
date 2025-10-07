/* src/middleware/cors.ts */

import { loadConfig } from "../config/index";

const config = loadConfig();

export function handleOptionsRequest(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": config.apiInfo.cors,
      "Access-Control-Allow-Headers":
        "Content-Type, Authorization, X-Consumer-Id, X-Consumer-Username, X-Anonymous-Consumer",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Max-Age": "86400",
    },
  });
}

export function addCorsHeaders(response: Response): Response {
  response.headers.set("Access-Control-Allow-Origin", config.apiInfo.cors);
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  return response;
}
