import { execSync } from "node:child_process";
import { expect, test } from "@playwright/test";

const appRoot = process.cwd().endsWith("apps\\web")
  ? process.cwd()
  : `${process.cwd()}\\apps\\web`;

const DEMO_DEFAULT_PASSWORD = process.env.DEMO_DEFAULT_PASSWORD || "";
const DEMO_ROTATED_PASSWORD = process.env.DEMO_ROTATED_PASSWORD || "";

if (!DEMO_DEFAULT_PASSWORD || !DEMO_ROTATED_PASSWORD) {
  throw new Error(
    "FATAL: DEMO_DEFAULT_PASSWORD and DEMO_ROTATED_PASSWORD environment variables are required for module-access tests."
  );
}

const DEMO_ACCOUNTS = [
  {
    label: "Platform Admin",
    email: "demo.platform.admin@wathiqcare.local",
    password: DEMO_DEFAULT_PASSWORD,
    nextPassword: DEMO_ROTATED_PASSWORD,
    expectedModules: ["/modules/informed-consents", "/modules/promissory-notes", "/modules/discharge-refusal"],
    blockedModules: [],
  },
  {
    label: "Legal Affairs User",
    email: "demo.legal.affairs@demo-imc.local",
    password: DEMO_DEFAULT_PASSWORD,
    nextPassword: DEMO_ROTATED_PASSWORD,
    expectedModules: ["/modules/informed-consents", "/modules/promissory-notes", "/modules/discharge-refusal"],
    blockedModules: [],
  },
  {
    label: "Doctor User",
    email: "demo.doctor@demo-imc.local",
    password: DEMO_DEFAULT_PASSWORD,
    nextPassword: DEMO_ROTATED_PASSWORD,
    expectedModules: ["/modules/informed-consents", "/modules/discharge-refusal"],
    blockedModules: ["/modules/promissory-notes"],
  },
  {
    label: "Nurse User",
    email: "demo.nurse@demo-imc.local",
    password: DEMO_DEFAULT_PASSWORD,
    nextPassword: DEMO_ROTATED_PASSWORD,
    expectedModules: ["/modules/informed-consents", "/modules/discharge-refusal"],
    blockedModules: ["/modules/promissory-notes"],
  },
  {
    label: "Medical Director User",
    email: "demo.medical.director@demo-imc.local",
    password: DEMO_DEFAULT_PASSWORD,
    nextPassword: DEMO_ROTATED_PASSWORD,
    expectedModules: ["/modules/informed-consents", "/modules/discharge-refusal"],
    blockedModules: ["/modules/promissory-notes"],
  },
  {
    label: "Quality Compliance User",
    email: "demo.compliance@demo-imc.local",
    password: DEMO_DEFAULT_PASSWORD,
    nextPassword: DEMO_ROTATED_PASSWORD,
    expectedModules: ["/modules/informed-consents", "/modules/promissory-notes", "/modules/discharge-refusal"],
    blockedModules: [],
  },
  {
    label: "Finance Authorized Admin User",
    email: "demo.finance@demo-imc.local",
    password: DEMO_DEFAULT_PASSWORD,
    nextPassword: DEMO_ROTATED_PASSWORD,
    expectedModules: ["/modules/promissory-notes"],
    blockedModules: ["/modules/informed-consents", "/modules/discharge-refusal"],
  },
] as const;

const ALLOWED_SUBROUTES: Record<string, string[]> = {
  "/modules/informed-consents": [
    "/modules/informed-consents",
    "/modules/informed-consents/list",
    "/modules/informed-consents/create",
    "/modules/informed-consents/archive",
    "/modules/informed-consents/templates",
  ],
  "/modules/promissory-notes": [
    "/modules/promissory-notes",
    "/modules/promissory-notes/list",
    "/modules/promissory-notes/create",
    "/modules/promissory-notes/archive",
  ],
  "/modules/discharge-refusal": [
    "/modules/discharge-refusal",
    "/modules/discharge-refusal/dashboard",
    "/modules/discharge-refusal/cases",
  ],
};

const ROUTE_REDIRECT_TARGETS: Record<string, string[]> = {
  "/modules/discharge-refusal/dashboard": ["/dashboard", "/dashboards"],
  "/modules/discharge-refusal/cases": ["/cases"],
};

test.beforeAll(() => {
  execSync("npm run demo:seed", { cwd: appRoot, stdio: "pipe" });
});

async function login(page: import("@playwright/test").Page, email: string, password: string) {
  await page.goto("/login");
  await expect(page.locator("#login-identifier")).toBeVisible();
  await expect(page.locator("#login-password")).toBeVisible();
  await page.fill("#login-identifier", email);
  await page.fill("#login-password", password);
  await Promise.all([
    page.waitForURL(/\/(first-login|modules|platform)(\?.*)?$/, { timeout: 30000 }),
    page.locator("form").filter({ has: page.locator("#login-password") }).locator('button[type="submit"]').click(),
  ]);
}

async function rotatePasswordIfRequired(page: import("@playwright/test").Page, nextPassword: string) {
  if (!page.url().includes("/first-login")) {
    return;
  }

  await page.fill("#new-password", nextPassword);
  await page.fill("#confirm-password", nextPassword);
  await page.getByRole("button", { name: /set new password|update password|تحديث كلمة المرور/i }).click();
  await page.waitForURL(/\/modules$/);
}

test.describe.serial("controlled demo module access", () => {
  test.describe.configure({ timeout: 180000 });

  for (const account of DEMO_ACCOUNTS) {
    test(`${account.label} sees only allowed modules and blocked routes are denied`, async ({ page, context }) => {
      await login(page, account.email, account.password);
      await rotatePasswordIfRequired(page, account.nextPassword);

      const landingRoute = account.label === "Platform Admin" ? "/platform" : "/modules";

      if (!page.url().includes(landingRoute)) {
        await page.goto(landingRoute);
      }

      await expect(page).toHaveURL(landingRoute === "/platform" ? /\/platform(\?.*)?$/ : /\/modules(\?.*)?$/);

      if (landingRoute === "/modules") {
        for (const moduleHref of account.expectedModules) {
          await expect(page.locator(`a[href="${moduleHref}"]`).first()).toBeVisible();
        }

        for (const moduleHref of account.expectedModules) {
          for (const route of ALLOWED_SUBROUTES[moduleHref]) {
            await page.goto(route);
            const currentPath = new URL(page.url()).pathname;
            const acceptedTargets = [route, ...(ROUTE_REDIRECT_TARGETS[route] ?? [])];
            expect(acceptedTargets).toContain(currentPath);
          }
        }

        for (const moduleHref of account.blockedModules) {
          await page.goto("/modules");
          await expect(page.locator(`a[href="${moduleHref}"]`)).toHaveCount(0);
          await page.goto(moduleHref);
          await page.waitForLoadState("networkidle");
          await expect(page.url().includes(moduleHref)).toBe(false);
        }
      }

      await page.goto("/modules");
      await page.getByRole("button", { name: /logout|sign out|تسجيل الخروج/i }).click();
      await page.waitForURL(/\/login/);

      const cookies = await context.cookies();
      expect(cookies.some((cookie) => cookie.name.includes("token") || cookie.name.includes("session"))).toBe(false);
    });
  }
});
