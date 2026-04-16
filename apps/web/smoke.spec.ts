import { test, expect } from '@playwright/test';

const publicRoutes = [
  '/',
  '/login',
];

const protectedRoutes = [
  '/documents',
  '/platform/users',
  '/dashboard',
];

test.describe('Smoke test all main routes', () => {
  for (const route of publicRoutes) {
    test(`should load public route ${route} without server error`, async ({ page }) => {
      await page.goto(route);
      await expect(page).not.toHaveTitle(/Error|Not Found|Unavailable/);
    });
  }

  for (const route of protectedRoutes) {
    test(`should redirect protected route ${route} to login`, async ({ page }) => {
      await page.goto(route);

      await page.waitForURL(/\/login(\?.*)?$/);
      const redirectedTo = page.url();
      expect(redirectedTo).toContain('/login');
      expect(redirectedTo).toContain(`next=${encodeURIComponent(route)}`);
    });
  }
});
