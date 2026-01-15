/* test/k6/utils/environment.ts */

// K6 test environment detection and configuration utility

export interface EnvironmentConfig {
  hasKongGateway: boolean;
  ciMode: boolean;
  baseUrl: string;
  skipGatewayTests: boolean;
}

/**
 * Detects the current environment and determines test capabilities
 */
export function detectEnvironment(): EnvironmentConfig {
  const ciMode = Boolean(__ENV.CI || __ENV.GITHUB_ACTIONS);
  const kongAvailable = Boolean(__ENV.KONG_ADMIN_URL && __ENV.KONG_ADMIN_TOKEN);
  const forceSkipGateway = Boolean(__ENV.SKIP_KONG_TESTS);

  // In CI without Kong setup, skip gateway-dependent tests
  const skipGatewayTests = ciMode && (!kongAvailable || forceSkipGateway);

  const host = __ENV.TARGET_HOST || "localhost";
  const port = Number.parseInt(__ENV.TARGET_PORT || "3000", 10);
  const protocol = __ENV.TARGET_PROTOCOL || "http";
  const baseUrl = `${protocol}://${host}:${port}`;

  return {
    hasKongGateway: kongAvailable && !forceSkipGateway,
    ciMode,
    baseUrl,
    skipGatewayTests,
  };
}

/**
 * Determines if the current test should run based on its Kong Gateway dependency
 */
export function shouldRunTest(requiresKong: boolean): boolean {
  const env = detectEnvironment();

  // Always run gateway-independent tests
  if (!requiresKong) {
    return true;
  }

  // For gateway-dependent tests, check if Kong is available
  if (requiresKong && env.skipGatewayTests) {
    console.log(
      "[SKIP] Kong Gateway not available in current environment - skipping gateway-dependent test"
    );
    return false;
  }

  return true;
}

/**
 * Logs the current environment configuration for debugging
 */
export function logEnvironmentInfo(): void {
  const env = detectEnvironment();

  console.log("=== K6 Test Environment ===");
  console.log(`CI Mode: ${env.ciMode}`);
  console.log(`Base URL: ${env.baseUrl}`);
  console.log(`Kong Gateway Available: ${env.hasKongGateway}`);
  console.log(`Skip Gateway Tests: ${env.skipGatewayTests}`);
  console.log("===========================");
}
