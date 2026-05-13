import { expect, test } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

const TENANT_ADMIN_CREDENTIALS = {
  email: process.env.PLAYWRIGHT_TENANT_EMAIL || "demo.legal.affairs@demo-imc.local",
  password: process.env.PLAYWRIGHT_TENANT_PASSWORD || "DemoLegalAffairs@2026!",
};

const ENTERPRISE_MODULES = [
  "informed-consents",
  "discharge-refusal",
  "promissory-notes",
  "legal-cases",
  "legal-documents",
  "incident-reports",
  "risk-management",
  "approvals",
] as const;

const WORKSPACE_SECTIONS = [
  "workflow",
  "documents",
  "audit-trail",
  "signatures",
  "timeline",
  "risk-analysis",
] as const;

async function loginAsTenantAdmin(page: import("@playwright/test").Page) {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[type="email"]', TENANT_ADMIN_CREDENTIALS.email);
  await page.fill('input[type="password"]', TENANT_ADMIN_CREDENTIALS.password);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) =>
    url.pathname.includes("/modules") || url.pathname.includes("/dashboard"),
  );
}

test.describe("Enterprise Module Portal Smoke Tests", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsTenantAdmin(page);
  });

  test("module portal renders with enterprise module cards", async ({ page }) => {
    await page.goto(`${BASE_URL}/modules`);
    await expect(page).toHaveURL(/\/modules$/);
    await expect(page.getByTestId("module-shell")).toBeVisible();

    for (const moduleKey of ENTERPRISE_MODULES) {
      await expect(page.getByTestId(`module-card-${moduleKey}`)).toBeVisible();
    }
  });

  test("enterprise module routes render without unauthorized or not-found states", async ({ page }) => {
    for (const moduleKey of ENTERPRISE_MODULES) {
      await page.goto(`${BASE_URL}/modules/${moduleKey}`);
      await page.waitForLoadState("networkidle");

      const body = page.locator("body");
      await expect(body).not.toContainText(/not found|unauthorized|permission denied/i);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    }
  });

  test("enterprise workspace subroutes render for governed modules", async ({ page }) => {
    for (const moduleKey of ["informed-consents", "promissory-notes", "legal-cases", "legal-documents"] as const) {
      for (const section of WORKSPACE_SECTIONS) {
        await page.goto(`${BASE_URL}/modules/${moduleKey}/${section}`);
        await page.waitForLoadState("networkidle");

        await expect(page.locator("body")).not.toContainText(/not found|unauthorized|permission denied/i);
        await expect(page.getByTestId("module-shell")).toBeVisible();
      }
    }
  });

  test("legacy discharge refusal routes still resolve", async ({ page }) => {
    for (const route of [
      "/modules/discharge-refusal",
      "/modules/discharge-refusal/dashboard",
      "/modules/discharge-refusal/cases",
      "/dashboard",
      "/cases",
      "/documents",
      "/reports",
      "/alerts",
    ]) {
      await page.goto(`${BASE_URL}${route}`);
      await page.waitForLoadState("networkidle");
      await expect(page.locator("body")).not.toContainText(/not found|unauthorized|permission denied/i);
    }
  });

  test("arabic localization applies rtl layout on module portal", async ({ page, context }) => {
    await context.addCookies([{ name: "wathiqcare_lang", value: "ar", url: BASE_URL }]);
    await page.goto(`${BASE_URL}/modules`);
    await page.waitForLoadState("networkidle");

    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.locator("html")).toHaveAttribute("lang", "ar");
  });

  test("module portal remains accessible in mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${BASE_URL}/modules`);
    await page.waitForLoadState("networkidle");

    await expect(page.getByTestId("module-shell")).toBeVisible();
    await expect(page.locator("main")).toBeVisible();
  });

  test("restricted module routes redirect to login when session is cleared", async ({ page, context }) => {
    await context.clearCookies();
    await page.goto(`${BASE_URL}/modules/informed-consents/workflow`);
    await page.waitForURL((url) => url.pathname.includes("/login"));
    await expect(page).toHaveURL(/\/login/);
  });

  test("module pages do not emit module API failures in console or network", async ({ page }) => {
    const consoleErrors: string[] = [];
    const failedModuleResponses: string[] = [];

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    page.on("response", (response) => {
      if (response.url().includes("/api/modules/") && response.status() >= 400) {
        failedModuleResponses.push(`${response.status()} ${response.url()}`);
      }
    });

    await page.goto(`${BASE_URL}/modules/informed-consents`);
    await page.waitForLoadState("networkidle");

    const criticalConsoleErrors = consoleErrors.filter(
      (message) =>
        !message.includes("Non-Error promise rejection detected")
        && !message.includes("ResizeObserver loop limit exceeded"),
    );

    expect(criticalConsoleErrors).toEqual([]);
    expect(failedModuleResponses).toEqual([]);
  });
});
