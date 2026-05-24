import { defineConfig } from "@playwright/test";

/**
 * Dedicated remote-UAT Playwright config.
 *
 * - No webServer: targets remote URLs (no local Next.js boot)
 * - testMatch *.uat.ts so default `playwright.config.ts` (matches *.spec.ts)
 *   never picks these up automatically
 * - Long timeout because we cross multiple deployments + real network
 */
export default defineConfig({
  testDir: "./apps/web/tests",
  testMatch: /.*\.uat\.ts$/,
  timeout: 120000,
  expect: { timeout: 15000 },
  retries: 0,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    headless: true,
    viewport: { width: 1440, height: 900 },
    ignoreHTTPSErrors: false,
    actionTimeout: 20000,
    navigationTimeout: 45000,
  },
});
