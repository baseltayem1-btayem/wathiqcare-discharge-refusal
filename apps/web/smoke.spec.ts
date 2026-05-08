import { test, expect } from '@playwright/test';

const publicRoutes = [
  '/',
  '/login',
];

const protectedRoutes = [
  '/documents',
  '/platform/users',
  '/dashboard',
  '/modules',
  '/modules/informed-consents',
  '/modules/informed-consents/list',
  '/modules/informed-consents/create',
  '/modules/informed-consents/archive',
  '/modules/informed-consents/templates',
  '/modules/promissory-notes',
  '/modules/promissory-notes/list',
  '/modules/promissory-notes/create',
  '/modules/promissory-notes/archive',
  '/modules/discharge-refusal',
  '/modules/discharge-refusal/dashboard',
  '/modules/discharge-refusal/cases',
  '/ar/modules',
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

  test('should render login page in mobile viewport without server error', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/login');

    await expect(page).not.toHaveTitle(/Error|Not Found|Unavailable/);
    await expect(page.locator('body')).toContainText(/WathiqCare|وثيق كير/i);
  });

  test('should keep localized protected route login redirect for Arabic path', async ({ page }) => {
    await page.goto('/ar/modules');

    await page.waitForURL(/\/ar\/login(\?.*)?$/);
    const redirectedTo = page.url();
    expect(redirectedTo).toContain('/ar/login');
    expect(redirectedTo).toContain(`next=${encodeURIComponent('/ar/modules')}`);
  });
});
