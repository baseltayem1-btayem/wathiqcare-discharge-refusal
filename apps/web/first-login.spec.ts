import { execSync } from "node:child_process";
import path from "node:path";
import { expect, test } from "@playwright/test";

const appRoot = path.resolve(__dirname);

const TEST_ACCOUNT = {
  email: "first-login.test@demo-imc.local",
  tempPassword: "TempPass123!@",
  newPassword: "NewPass456!@",
};

test.beforeEach(() => {
  execSync("node scripts/seed-first-login-test-user.mjs", {
    cwd: appRoot,
    stdio: "pipe",
    shell: true,
  });
});

test.describe("first-login flow", () => {
  test("/first-login route exists and unauthenticated users are sent to /login", async ({ page }) => {
    await page.goto("/first-login");
    await page.waitForURL(/\/login/, { timeout: 10000 });
    expect(page.url()).toContain("/login");
  });

  test("unauthenticated user cannot change password", async ({ request }) => {
    const response = await request.post("/api/auth/change-password", {
      data: { newPassword: "SomeNewPass123!" },
    });
    expect(response.status()).toBe(401);
  });

  test("authenticated user can change password and password_reset_required is cleared", async ({ request }) => {
    const loginResponse = await request.post("/api/auth/password/login", {
      data: {
        email: TEST_ACCOUNT.email,
        password: TEST_ACCOUNT.tempPassword,
        rememberMe: false,
      },
    });

    expect(loginResponse.ok()).toBe(true);
    const loginBody = (await loginResponse.json()) as { mustChangePassword?: boolean };
    expect(loginBody.mustChangePassword).toBe(true);

    const changeResponse = await request.post("/api/auth/change-password", {
      data: { newPassword: TEST_ACCOUNT.newPassword },
    });
    expect(changeResponse.ok()).toBe(true);
    const changeBody = (await changeResponse.json()) as { ok: boolean };
    expect(changeBody.ok).toBe(true);

    const secondLoginResponse = await request.post("/api/auth/password/login", {
      data: {
        email: TEST_ACCOUNT.email,
        password: TEST_ACCOUNT.newPassword,
        rememberMe: false,
      },
    });

    expect(secondLoginResponse.ok()).toBe(true);
    const secondLoginBody = (await secondLoginResponse.json()) as { mustChangePassword?: boolean };
    expect(secondLoginBody.mustChangePassword).toBeFalsy();
  });

  test("first login redirects to /modules after password change and informed consents open", async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await page.fill("#email", TEST_ACCOUNT.email);
    await page.fill("#password", TEST_ACCOUNT.tempPassword);

    await Promise.all([
      page.waitForURL(/\/first-login/, { timeout: 30000, waitUntil: "domcontentloaded" }),
      page.locator('form button[type="submit"]').click(),
    ]);

    await page.fill("#new-password", TEST_ACCOUNT.newPassword);
    await page.fill("#confirm-password", TEST_ACCOUNT.newPassword);

    await Promise.all([
      page.waitForURL(/\/modules$/, { timeout: 30000, waitUntil: "domcontentloaded" }),
      page.getByRole("button", { name: /set new password|update password|تحديث كلمة المرور/i }).click(),
    ]);

    await page.goto("/modules/informed-consents", { waitUntil: "domcontentloaded" });
    expect(new URL(page.url()).pathname).toBe("/modules/informed-consents");
  });
});
