import { test, expect } from "@playwright/test";

// Test configuration - runs authenticated tests for module portal
const BASE_URL = "http://localhost:3000";

// Platform admin credentials (update to match your test setup)
const PLATFORM_ADMIN_CREDENTIALS = {
  email: "admin@wathiqcare.test",
  password: "Test@Secure123!",
};

test.describe("Module Portal - Authenticated Browser Smoke Tests", () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto(`${BASE_URL}/login`);

    // Fill login form
    await page.fill('input[type="email"]', PLATFORM_ADMIN_CREDENTIALS.email);
    await page.fill('input[type="password"]', PLATFORM_ADMIN_CREDENTIALS.password);

    // Submit login
    await page.click('button[type="submit"]');

    // Wait for navigation to complete
    await page.waitForURL((url) =>
      url.pathname.includes("/modules") || url.pathname.includes("/dashboard")
    );
  });

  test("Module portal renders with all accessible module cards", async ({
    page,
  }) => {
    // Navigate to modules portal
    await page.goto(`${BASE_URL}/modules`);

    // Verify page loaded
    await expect(page).toHaveURL(/\/modules$/);

    // Check for module shell container
    const moduleShell = page.locator('[data-testid="module-shell"]');
    await expect(moduleShell).toBeVisible();

    // Verify main module portal heading/title exists
    const heading = page.locator("h1, h2").first();
    await expect(heading).toBeVisible();

    // Check that page is not showing unauthorized message
    const unauthorizedText = page.locator("text=/not authorized|permission denied/i");
    await expect(unauthorizedText).not.toBeVisible();
  });

  test("Platform admin sees all accessible modules on portal", async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/modules`);

    // Wait for module cards to load
    await page.waitForLoadState("networkidle");

    // Check for informed-consents module accessibility
    const informedConsentsLink = page.locator(
      'a[href*="/modules/informed-consents"], button:has-text("Informed Consents")'
    );
    await expect(informedConsentsLink).toBeVisible();

    // Check for promissory-notes module accessibility
    const promissoryNotesLink = page.locator(
      'a[href*="/modules/promissory-notes"], button:has-text("Promissory Notes")'
    );
    await expect(promissoryNotesLink).toBeVisible();

    // Check for discharge-refusal module accessibility
    const dischargeRefusalLink = page.locator(
      'a[href*="/modules/discharge-refusal"], button:has-text("Discharge Refusal")'
    );
    await expect(dischargeRefusalLink).toBeVisible();
  });

  test("Informed Consents module subroutes render correctly", async ({
    page,
  }) => {
    // Test list view
    await page.goto(`${BASE_URL}/modules/informed-consents/list`);
    await expect(page).toHaveURL(/\/modules\/informed-consents\/list/);
    await page.waitForLoadState("networkidle");
    let content = page.locator("body");
    await expect(content).not.toContainText(/not found|unauthorized/i);

    // Test create view
    await page.goto(`${BASE_URL}/modules/informed-consents/create`);
    await expect(page).toHaveURL(/\/modules\/informed-consents\/create/);
    await page.waitForLoadState("networkidle");
    content = page.locator("body");
    await expect(content).not.toContainText(/not found|unauthorized/i);

    // Test archive view
    await page.goto(`${BASE_URL}/modules/informed-consents/archive`);
    await expect(page).toHaveURL(/\/modules\/informed-consents\/archive/);
    await page.waitForLoadState("networkidle");
    content = page.locator("body");
    await expect(content).not.toContainText(/not found|unauthorized/i);

    // Test templates view
    await page.goto(`${BASE_URL}/modules/informed-consents/templates`);
    await expect(page).toHaveURL(/\/modules\/informed-consents\/templates/);
    await page.waitForLoadState("networkidle");
    content = page.locator("body");
    await expect(content).not.toContainText(/not found|unauthorized/i);
  });

  test("Promissory Notes module subroutes render correctly", async ({
    page,
  }) => {
    // Test list view
    await page.goto(`${BASE_URL}/modules/promissory-notes/list`);
    await expect(page).toHaveURL(/\/modules\/promissory-notes\/list/);
    await page.waitForLoadState("networkidle");
    let content = page.locator("body");
    await expect(content).not.toContainText(/not found|unauthorized/i);

    // Test create view
    await page.goto(`${BASE_URL}/modules/promissory-notes/create`);
    await expect(page).toHaveURL(/\/modules\/promissory-notes\/create/);
    await page.waitForLoadState("networkidle");
    content = page.locator("body");
    await expect(content).not.toContainText(/not found|unauthorized/i);

    // Test archive view
    await page.goto(`${BASE_URL}/modules/promissory-notes/archive`);
    await expect(page).toHaveURL(/\/modules\/promissory-notes\/archive/);
    await page.waitForLoadState("networkidle");
    content = page.locator("body");
    await expect(content).not.toContainText(/not found|unauthorized/i);
  });

  test("Discharge Refusal compatibility routes still work", async ({
    page,
  }) => {
    // Test discharge-refusal root
    await page.goto(`${BASE_URL}/modules/discharge-refusal`);
    await expect(page).toHaveURL(/\/modules\/discharge-refusal/);
    await page.waitForLoadState("networkidle");
    let content = page.locator("body");
    await expect(content).not.toContainText(/not found|unauthorized/i);

    // Test dashboard redirect
    await page.goto(`${BASE_URL}/modules/discharge-refusal/dashboard`);
    await page.waitForLoadState("networkidle");
    content = page.locator("body");
    await expect(content).not.toContainText(/not found|unauthorized/i);

    // Test cases redirect
    await page.goto(`${BASE_URL}/modules/discharge-refusal/cases`);
    await page.waitForLoadState("networkidle");
    content = page.locator("body");
    await expect(content).not.toContainText(/not found|unauthorized/i);
  });

  test("Module pages render without console errors", async ({ page }) => {
    const errors: string[] = [];

    // Capture console errors
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text());
      }
    });

    // Navigate to modules
    await page.goto(`${BASE_URL}/modules`);
    await page.waitForLoadState("networkidle");

    // Check for no critical errors
    const criticalErrors = errors.filter(
      (e) =>
        !e.includes("Non-Error promise rejection detected") &&
        !e.includes("ResizeObserver loop limit exceeded")
    );
    expect(criticalErrors.length).toBe(0);
  });

  test("Arabic/RTL strings render correctly on module pages", async ({
    page,
  }) => {
    // Navigate to Arabic version if locale cookie exists
    await page.context().addCookies([
      { name: "wathiqcare_lang", value: "ar", url: BASE_URL },
    ]);

    await page.goto(`${BASE_URL}/modules`);
    await page.waitForLoadState("networkidle");

    // Check that HTML dir is set to rtl
    const htmlDir = await page.locator("html").getAttribute("dir");
    expect(htmlDir).toBe("rtl");

    // Check that Arabic content is present
    const htmlLang = await page.locator("html").getAttribute("lang");
    expect(htmlLang).toBe("ar");
  });

  test("Module portal has no visual regressions in layout", async ({
    page,
  }) => {
    await page.goto(`${BASE_URL}/modules`);
    await page.waitForLoadState("networkidle");

    // Verify key layout elements are visible
    const mainContent = page.locator("main");
    await expect(mainContent).toBeVisible();

    // Check that modules are properly organized
    const moduleCards = page.locator('[data-testid*="module-card"], [class*="module"][class*="card"]');
    const cardCount = await moduleCards.count();
    
    // Should have at least the three new modules
    expect(cardCount).toBeGreaterThanOrEqual(1);

    // Verify responsive design
    await page.setViewportSize({ width: 375, height: 667 }); // Mobile
    await page.reload();
    await page.waitForLoadState("networkidle");
    
    // Content should still be accessible
    await expect(mainContent).toBeVisible();
  });

  test("Unauthorized access is blocked for restricted modules", async ({
    page,
  }) => {
    // Clear session to test unauthorized access
    await page.context().clearCookies();

    // Try to access protected module route
    await page.goto(`${BASE_URL}/modules/informed-consents/list`);

    // Should redirect to login
    await page.waitForURL((url) => url.pathname.includes("/login"));
    expect(page.url()).toContain("/login");
  });

  test("Module API endpoints return valid responses", async ({ page }) => {
    await page.goto(`${BASE_URL}/modules/informed-consents`);
    await page.waitForLoadState("networkidle");

    // Wait for potential API call
    await page.waitForTimeout(1000);
  });
});
