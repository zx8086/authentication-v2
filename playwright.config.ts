/* playwright.config.ts */

import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./test/playwright",
  outputDir: "./test/results/playwright/artifacts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
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
    trace: process.env.E2E_TRACE || "on-first-retry",
    video: process.env.E2E_VIDEO || "retain-on-failure",
    screenshot: process.env.E2E_SCREENSHOT || "only-on-failure",
    viewport: {
      width: Number.parseInt(process.env.E2E_VIEWPORT_WIDTH || "1280", 10),
      height: Number.parseInt(process.env.E2E_VIEWPORT_HEIGHT || "720", 10),
    },
  },

  projects: [
    // Cross-browser testing for authentication flows
    {
      name: "chromium",
      testMatch: /consolidated-business\.e2e\.ts$/,
      use: {
        ...devices["Desktop Chrome"],
        ignoreHTTPSErrors: true,
      },
    },
    {
      name: "firefox",
      testMatch: /consolidated-business\.e2e\.ts$/,
      use: {
        ...devices["Desktop Firefox"],
        ignoreHTTPSErrors: true,
      },
    },
    {
      name: "webkit",
      testMatch: /consolidated-business\.e2e\.ts$/,
      use: {
        ...devices["Desktop Safari"],
        ignoreHTTPSErrors: true,
      },
    },
    // Mobile testing for authentication
    {
      name: "mobile-chrome",
      testMatch: /consolidated-business\.e2e\.ts$/,
      use: {
        ...devices["Pixel 5"],
        ignoreHTTPSErrors: true,
      },
    },
    {
      name: "mobile-safari",
      testMatch: /consolidated-business\.e2e\.ts$/,
      use: {
        ...devices["iPhone 12"],
        ignoreHTTPSErrors: true,
      },
    },
    // Profiling tests (Chrome only for performance consistency)
    {
      name: "profiling",
      testMatch: /profiling\.e2e\.ts$/,
      use: {
        ...devices["Desktop Chrome"],
        ignoreHTTPSErrors: true,
        timeout: 60000,
      },
    },
    // Legacy project for backward compatibility
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
