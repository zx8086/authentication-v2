/* src/utils/bun-fetch-fallback.ts */

/**
 * Fetch with curl fallback for Bun networking issues
 *
 * Bun v1.3.6 has known networking bugs with local IP addresses that cause
 * fetch() to fail with ConnectionRefused even when the service is reachable:
 * - https://github.com/oven-sh/bun/issues/1425
 * - https://github.com/oven-sh/bun/issues/6885
 * - https://github.com/oven-sh/bun/issues/10731
 *
 * This utility provides a fallback to curl when fetch() fails, ensuring
 * reliable connectivity in all network configurations.
 */

export interface FetchOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  signal?: AbortSignal;
}

/**
 * Fetch with automatic curl fallback for Bun networking issues
 */
export async function fetchWithFallback(url: string, options?: FetchOptions): Promise<Response> {
  // Try native fetch first
  try {
    return await fetch(url, options);
  } catch (fetchError) {
    // Fallback to curl for Bun networking bug workaround
    try {
      return await fetchViaCurl(url, options);
    } catch (_curlError) {
      // Both fetch and curl failed - throw original fetch error
      throw fetchError;
    }
  }
}

/**
 * Execute HTTP request via curl subprocess
 */
async function fetchViaCurl(url: string, options?: FetchOptions): Promise<Response> {
  const method = options?.method || "GET";
  const headers = options?.headers || {};
  const body = options?.body;

  // Build curl command
  const args = [
    "curl",
    "-s", // Silent
    "-i", // Include headers in output
    "-X", // Method
    method,
    "-m", // Max time
    "10",
  ];

  // Add headers
  for (const [key, value] of Object.entries(headers)) {
    args.push("-H", `${key}: ${value}`);
  }

  // Add body for POST/PUT/PATCH
  if (body && ["POST", "PUT", "PATCH"].includes(method)) {
    args.push("-d", body);
  }

  // Add URL
  args.push(url);

  // Execute curl
  const proc = Bun.spawn(args, {
    stdout: "pipe",
    stderr: "pipe",
  });

  const exitCode = await proc.exited;

  if (exitCode !== 0) {
    const stderr = await new Response(proc.stderr).text();
    throw new Error(`curl failed: ${stderr || "Unknown error"}`);
  }

  const output = await new Response(proc.stdout).text();

  // Parse HTTP response from curl output
  return parseCurlResponse(output);
}

/**
 * Parse curl output with headers into a Response object
 */
function parseCurlResponse(curlOutput: string): Response {
  // Handle empty output
  if (!curlOutput || curlOutput.trim().length === 0) {
    return new Response("", {
      status: 200,
      statusText: "OK",
      headers: new Headers(),
    });
  }

  // Split headers and body - handle both \r\n\r\n and \n\n separators
  const doubleCRLF = curlOutput.indexOf("\r\n\r\n");
  const doubleLF = curlOutput.indexOf("\n\n");
  let separatorIndex = -1;
  let separator = "";

  if (doubleCRLF !== -1 && (doubleLF === -1 || doubleCRLF < doubleLF)) {
    separatorIndex = doubleCRLF;
    separator = "\r\n\r\n";
  } else if (doubleLF !== -1) {
    separatorIndex = doubleLF;
    separator = "\n\n";
  }

  let headerText = "";
  let body = "";

  if (separatorIndex === -1) {
    // No separator found - treat entire output as headers (no body)
    headerText = curlOutput;
    body = "";
  } else {
    headerText = curlOutput.slice(0, separatorIndex);
    body = curlOutput.slice(separatorIndex + separator.length);
  }

  // Parse headers - handle both \r\n and \n line endings
  const headerLines = headerText.split(/\r?\n/);

  // Parse status line
  const statusLine = headerLines[0];
  const statusMatch = statusLine.match(/HTTP\/[\d.]+\s+(\d+)/);
  const status = statusMatch ? Number.parseInt(statusMatch[1], 10) : 200;

  // Parse headers
  const headers = new Headers();
  for (let i = 1; i < headerLines.length; i++) {
    const line = headerLines[i].trim();
    if (!line) continue;

    const colonIndex = line.indexOf(":");
    if (colonIndex > 0) {
      const key = line.slice(0, colonIndex).trim();
      const value = line.slice(colonIndex + 1).trim();
      headers.append(key, value);
    }
  }

  // Create Response object with trimmed body
  return new Response(body.trim(), {
    status,
    statusText: getStatusText(status),
    headers,
  });
}

/**
 * Get HTTP status text for status code
 */
function getStatusText(status: number): string {
  const statusTexts: Record<number, string> = {
    200: "OK",
    201: "Created",
    204: "No Content",
    400: "Bad Request",
    401: "Unauthorized",
    403: "Forbidden",
    404: "Not Found",
    409: "Conflict",
    429: "Too Many Requests",
    500: "Internal Server Error",
    502: "Bad Gateway",
    503: "Service Unavailable",
    504: "Gateway Timeout",
  };

  return statusTexts[status] || "Unknown";
}
