import { test, expect } from '@playwright/test';

const routes = [
  '/',
  '/login',
  '/dashboard',
  '/cases',
  '/cases/new',
  // Add more static and dynamic test cases as needed
  '/admin',
  '/platform',
  '/operations',
  '/demo',
];

test.describe('Smoke test all main routes', () => {
  for (const route of routes) {
    test(`should load ${route} without error`, async ({ page }) => {
      await page.goto(`http://localhost:3000${route}`);
      // Check for common error indicators
      const errorSelector = page.locator('text=/401|404|500|503/');
      await expect(errorSelector).toHaveCount(0);
      // Optionally, check for main content
      await expect(page).not.toHaveTitle(/Error|Not Found|Unauthorized|Unavailable/);
    });
  }
});
