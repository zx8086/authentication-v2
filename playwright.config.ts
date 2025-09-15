/* playwright.config.ts */

import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./test/playwright",
  outputDir: "./test/results/playwright",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["html", { outputFolder: "./test/results/playwright/html-report" }]],
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
      name: "api-scenarios",
      testMatch: /.*\.e2e\.ts$/,
      use: {
        ...devices["Desktop Chrome"],
        ignoreHTTPSErrors: true,
        extraHTTPHeaders: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      },
    },
  ],

  // webServer disabled - using existing running service
});
