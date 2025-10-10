/* playwright.config.ts */

import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./test/playwright",
  outputDir: "./test/results/playwright/artifacts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  timeout: 30000, // 30 seconds for each test
  expect: {
    timeout: 5000, // 5 seconds for assertions
  },
  reporter: [
    ["html", { outputFolder: "./test/results/playwright/html-report" }],
    ["json", { outputFile: "./test/results/playwright/results.json" }],
    ["junit", { outputFile: "./test/results/playwright/junit.xml" }],
    ["line"], // Console output
  ],
  globalSetup: "./test/playwright/global-setup.ts",
  use: {
    baseURL: process.env.API_BASE_URL || "http://localhost:3000",
    extraHTTPHeaders: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": "Playwright-AuthService-E2E/1.0",
    },
    trace: "on-first-retry",
  },

  projects: [
    {
      name: "core-api",
      testMatch: /core-functionality\.e2e\.ts$/,
      use: {
        ...devices["Desktop Chrome"],
        ignoreHTTPSErrors: true,
      },
    },
    {
      name: "telemetry",
      testMatch: /telemetry-monitoring\.e2e\.ts$/,
      use: {
        ...devices["Desktop Chrome"],
        ignoreHTTPSErrors: true,
      },
    },
    {
      name: "security",
      testMatch: /security-compliance\.e2e\.ts$/,
      use: {
        ...devices["Desktop Chrome"],
        ignoreHTTPSErrors: true,
      },
    },
    {
      name: "performance",
      testMatch: /performance-resilience\.e2e\.ts$/,
      use: {
        ...devices["Desktop Chrome"],
        ignoreHTTPSErrors: true,
        timeout: 60000, // Performance tests may need more time
      },
    },
    {
      name: "errors",
      testMatch: /error-scenarios\.e2e\.ts$/,
      use: {
        ...devices["Desktop Chrome"],
        ignoreHTTPSErrors: true,
      },
    },
    {
      name: "all-tests",
      testMatch: /.*\.e2e\.ts$/,
      use: {
        ...devices["Desktop Chrome"],
        ignoreHTTPSErrors: true,
      },
    },
  ],
});
