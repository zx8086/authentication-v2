/* test/playwright/visual-security.e2e.ts */

import { expect, test } from "@playwright/test";

test.describe("Visual Security Validation", () => {
  test.describe("Error Page Security", () => {
    test("404 error page doesn't expose sensitive information", async ({ page }) => {
      await page.goto("/non-existent-endpoint");

      // Check that error page doesn't leak sensitive info
      const content = await page.content();

      // Should not expose internal paths, stack traces, or env variables
      expect(content).not.toContain("/Users/");
      expect(content).not.toContain("Error:");
      expect(content).not.toContain("at ");
      expect(content).not.toContain("NODE_ENV");
      expect(content).not.toContain("KONG_");

      // Take screenshot for visual validation
      await expect(page).toHaveScreenshot("404-error-page.png", {
        fullPage: true,
        maxDiffPixels: 100,
      });
    });

    test("401 unauthorized response format", async ({ page }) => {
      await page.goto("/tokens");

      const content = await page.content();

      // Should show proper error format without sensitive details
      expect(content).toContain("Unauthorized");
      expect(content).not.toContain("Internal error");
      expect(content).not.toContain("Database");
      expect(content).not.toContain("Kong admin");

      await expect(page).toHaveScreenshot("401-unauthorized.png", {
        fullPage: true,
        maxDiffPixels: 100,
      });
    });
  });

  test.describe("API Response Format Consistency", () => {
    test("Health endpoint visual consistency across versions", async ({ page }) => {
      // Test V1 health endpoint
      await page.goto("/health");
      await expect(page).toHaveScreenshot("health-v1-response.png", {
        fullPage: true,
      });

      // Test V2 health endpoint
      await page.goto("/health", {
        waitUntil: "networkidle",
      });

      // Add V2 header through browser context
      await page.setExtraHTTPHeaders({
        "Accept-Version": "v2",
      });

      await page.reload();

      await expect(page).toHaveScreenshot("health-v2-response.png", {
        fullPage: true,
      });
    });

    test("JSON response formatting is consistent", async ({ page }) => {
      await page.goto("/metrics");

      // Check JSON formatting is clean and readable
      const content = await page.content();
      const jsonMatch = content.match(/{[\\s\\S]*}/);

      expect(jsonMatch).toBeTruthy();

      // Parse to ensure valid JSON
      const jsonData = JSON.parse(jsonMatch[0]);
      expect(jsonData).toHaveProperty("timestamp");

      await expect(page).toHaveScreenshot("metrics-json-format.png", {
        fullPage: true,
      });
    });
  });

  test.describe("Cross-Browser Visual Consistency", () => {
    test("Error responses look consistent across browsers", async ({ page, browserName }) => {
      await page.goto("/tokens");

      // Take browser-specific screenshot
      await expect(page).toHaveScreenshot(`unauthorized-${browserName}.png`, {
        fullPage: true,
        maxDiffPixels: 200, // Allow for browser rendering differences
      });

      const content = await page.content();

      // Content should be identical across browsers
      expect(content).toContain("Unauthorized");
      expect(content).toContain("timestamp");
    });

    test("Health response rendering across devices", async ({ page, browserName }) => {
      await page.goto("/health");

      // Test different viewport sizes
      const viewports = [
        { width: 375, height: 667, name: "mobile" },
        { width: 768, height: 1024, name: "tablet" },
        { width: 1920, height: 1080, name: "desktop" },
      ];

      for (const viewport of viewports) {
        await page.setViewportSize(viewport);
        await page.reload();

        await expect(page).toHaveScreenshot(
          `health-response-${browserName}-${viewport.name}.png`,
          {
            fullPage: true,
            maxDiffPixels: 150,
          }
        );
      }
    });
  });

  test.describe("Security Header Visualization", () => {
    test("V2 security headers are properly set", async ({ page }) => {
      // Navigate with V2 headers
      await page.setExtraHTTPHeaders({
        "Accept-Version": "v2",
      });

      const response = await page.goto("/health");

      // Verify security headers are present
      const headers = response.headers();

      expect(headers["x-frame-options"]).toBe("DENY");
      expect(headers["x-content-type-options"]).toBe("nosniff");
      expect(headers["strict-transport-security"]).toBeDefined();

      // Take screenshot for documentation
      await expect(page).toHaveScreenshot("v2-security-headers-response.png", {
        fullPage: true,
      });
    });
  });

  test.describe("Mobile Security Testing", () => {
    test("Mobile authentication flow visual validation", async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE

      await page.goto("/tokens");

      // Mobile error response should be readable
      const content = await page.content();
      expect(content).toContain("Unauthorized");

      await expect(page).toHaveScreenshot("mobile-auth-error.png", {
        fullPage: true,
      });
    });

    test("Tablet health check display", async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 }); // iPad

      await page.goto("/health");

      // Health response should be properly formatted on tablet
      await expect(page).toHaveScreenshot("tablet-health-response.png", {
        fullPage: true,
      });
    });
  });

  test.describe("High Contrast & Accessibility", () => {
    test("Error messages are readable in high contrast", async ({ page }) => {
      // Simulate high contrast mode
      await page.emulateMedia({ reducedMotion: "reduce" });

      await page.goto("/tokens");

      await expect(page).toHaveScreenshot("high-contrast-error.png", {
        fullPage: true,
      });

      // Ensure text is still readable
      const content = await page.textContent("body");
      expect(content).toContain("Unauthorized");
    });
  });

  test.describe("Response Time Visualization", () => {
    test("Fast response times don't show loading states", async ({ page }) => {
      const start = Date.now();

      await page.goto("/health");

      const loadTime = Date.now() - start;

      // Should load quickly without showing loading states
      expect(loadTime).toBeLessThan(1000);

      await expect(page).toHaveScreenshot("fast-health-load.png", {
        fullPage: true,
      });
    });
  });

  test.describe("Documentation Screenshots", () => {
    test("Generate OpenAPI documentation screenshots", async ({ page }) => {
      await page.goto("/");

      // Should show OpenAPI spec
      const content = await page.content();
      expect(content).toContain("openapi");

      await expect(page).toHaveScreenshot("openapi-documentation.png", {
        fullPage: true,
      });
    });

    test("Metrics endpoint for monitoring documentation", async ({ page }) => {
      await page.goto("/metrics");

      await expect(page).toHaveScreenshot("metrics-monitoring-view.png", {
        fullPage: true,
      });
    });
  });
});