import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";

const TEST_PHYSICIAN = {
  email: "smoke-physician@wathiqcare.test",
  password: process.env.TEST_PHYSICIAN_PASSWORD ?? "",
};

if (!TEST_PHYSICIAN.password) {
  throw new Error("TEST_PHYSICIAN_PASSWORD environment variable is required");
}

const OUT_DIR = path.resolve(process.cwd(), "pilot-evidence", "ve-03b-production-workspace-screenshots");

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

test("capture production workspace screenshots", async ({ page, context }) => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  await authenticateContext(context);

  // Desktop default
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto(`${BASE_URL}/modules/informed-consents`);
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("heading", { name: "Clinical Knowledge Package" })).toBeVisible();
  await page.screenshot({ path: path.join(OUT_DIR, "desktop-default.png"), fullPage: true });

  // Mobile default
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("heading", { name: "Clinical Knowledge Package" })).toBeVisible();
  await page.screenshot({ path: path.join(OUT_DIR, "mobile-default.png"), fullPage: true });

  // Desktop RTL
  await page.setViewportSize({ width: 1400, height: 900 });
  await context.addCookies([
    { name: "wathiqcare_lang", value: "ar", url: BASE_URL },
  ]);
  await page.reload();
  await page.waitForLoadState("networkidle");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await page.screenshot({ path: path.join(OUT_DIR, "desktop-rtl.png"), fullPage: true });
});
