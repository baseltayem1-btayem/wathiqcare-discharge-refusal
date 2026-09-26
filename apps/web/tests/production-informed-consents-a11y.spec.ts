import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";

const TEST_PHYSICIAN = {
  email: "smoke-physician@wathiqcare.test",
  password: process.env.TEST_PHYSICIAN_PASSWORD ?? "",
};

if (!TEST_PHYSICIAN.password) {
  throw new Error("TEST_PHYSICIAN_PASSWORD environment variable is required");
}

async function authenticateContext(context: import("@playwright/test").BrowserContext) {
  const response = await context.request.post(`${BASE_URL}/api/auth/password/login`, {
    data: {
      email: TEST_PHYSICIAN.email,
      password: TEST_PHYSICIAN.password,
      rememberMe: false,
    },
  });
  expect(response.ok()).toBeTruthy();
  const { accessToken } = await response.json();
  await context.addCookies([
    { name: "wathiqcare_access_token", value: accessToken, url: BASE_URL },
  ]);
}

test.describe("Production Informed Consents Workspace — Accessibility", () => {
  test.beforeEach(async ({ context }) => {
    await authenticateContext(context);
  });

  test("desktop workspace has no critical or serious axe violations", async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.goto(`${BASE_URL}/modules/informed-consents`);
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("heading", { name: "Clinical Knowledge Package" })).toBeVisible();

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();

    const criticalOrSerious = accessibilityScanResults.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious",
    );
    expect(criticalOrSerious).toEqual([]);
  });

  test("mobile workspace has no critical or serious axe violations", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE_URL}/modules/informed-consents`);
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("heading", { name: "Clinical Knowledge Package" })).toBeVisible();

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();

    const criticalOrSerious = accessibilityScanResults.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious",
    );
    expect(criticalOrSerious).toEqual([]);
  });
});
