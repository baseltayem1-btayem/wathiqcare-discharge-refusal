import { test, expect } from "@playwright/test";

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

test.describe("Production Informed Consents Workspace", () => {
  test.beforeEach(async ({ context }) => {
    await authenticateContext(context);
    // Ensure LTR/English baseline for each test; the RTL test will override.
    await context.addCookies([
      { name: "wathiqcare_lang", value: "en", url: BASE_URL },
    ]);
  });

  test("renders the clinical workspace with real auth context", async ({ page }) => {
    await page.goto(`${BASE_URL}/modules/informed-consents`);
    await page.waitForLoadState("networkidle");

    await expect(page).toHaveURL(/\/modules\/informed-consents$/);
    await expect(page.getByRole("heading", { name: "Clinical Knowledge Package" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Readiness Checklist" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Decision Support & Alerts" })).toBeVisible();

    const body = page.locator("body");
    await expect(body).not.toContainText(/not authorized|permission denied/i);
  });

  test("physician can search and select a real patient encounter", async ({ page }) => {
    await page.goto(`${BASE_URL}/modules/informed-consents`);
    await page.waitForLoadState("networkidle");

    // Search for the demo patient
    const searchInput = page.locator('input[placeholder*="Search patient"]').first();
    await searchInput.fill("DEMO PATIENT CONSENT");
    await page.waitForTimeout(500);

    const patientButton = page.locator('button:has-text("DEMO PATIENT CONSENT")').first();
    await expect(patientButton).toBeVisible();
    await patientButton.click();
    await page.waitForResponse(
      (resp) => resp.url().includes("/encounters") && resp.status() === 200,
      { timeout: 10000 },
    );

    // The selector collapses after selection; expand it to choose an encounter
    const expandButton = page.locator('#section-patient button').first();
    await expect(expandButton).toBeVisible();
    await expandButton.click();

    // Encounters should load for the selected patient
    await expect(page.locator("text=Encounters").first()).toBeVisible();
    const encounterButton = page.locator('button:has-text("DEMO-IC-001")').first();
    await expect(encounterButton).toBeVisible({ timeout: 10000 });
    await encounterButton.click();

    // Procedure section should become active
    const procedureSelect = page.locator('#section-procedure select').first();
    await expect(procedureSelect).toBeEnabled();

    // Context bar should reflect selection
    await expect(page.locator("text=DEMO PATIENT CONSENT").first()).toBeVisible();
    await expect(page.locator("text=DEMO-IC-001").first()).toBeVisible();
  });

  test("workspace renders on mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE_URL}/modules/informed-consents`);
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("heading", { name: "Clinical Knowledge Package" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Readiness Checklist" })).toBeVisible();
  });

  test("workspace renders in Arabic RTL mode", async ({ page, context }) => {
    await context.addCookies([
      { name: "wathiqcare_lang", value: "ar", url: BASE_URL },
    ]);
    await page.goto(`${BASE_URL}/modules/informed-consents`);
    await page.waitForLoadState("networkidle");

    const htmlDir = await page.locator("html").getAttribute("dir");
    expect(htmlDir).toBe("rtl");

    await expect(page.locator(':text-is("Patient:")')).toBeVisible();
  });
});
