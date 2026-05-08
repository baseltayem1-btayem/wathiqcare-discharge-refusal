import { execSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import crypto from "node:crypto";
import { expect, test } from "@playwright/test";

const appRoot = process.cwd().endsWith(join("apps", "web"))
  ? process.cwd()
  : join(process.cwd(), "apps", "web");

const DEMO_ACCOUNTS = [
  {
    label: "Platform Admin",
    key: "platform-admin",
    email: "platform.admin@wathiqcare.online",
    expectedModules: ["/modules/informed-consents", "/modules/promissory-notes", "/modules/discharge-refusal"],
    blockedModules: [],
  },
  {
    label: "Legal Affairs",
    key: "legal-affairs",
    email: "legal.affairs@pilot.imc.wathiqcare.online",
    expectedModules: ["/modules/informed-consents", "/modules/promissory-notes", "/modules/discharge-refusal"],
    blockedModules: [],
  },
  {
    label: "Doctor",
    key: "doctor",
    email: "doctor@pilot.imc.wathiqcare.online",
    expectedModules: ["/modules/informed-consents", "/modules/discharge-refusal"],
    blockedModules: ["/modules/promissory-notes"],
  },
  {
    label: "Nurse",
    key: "nurse",
    email: "nurse@pilot.imc.wathiqcare.online",
    expectedModules: ["/modules/informed-consents", "/modules/discharge-refusal"],
    blockedModules: ["/modules/promissory-notes"],
  },
  {
    label: "Medical Director",
    key: "medical-director",
    email: "medical.director@pilot.imc.wathiqcare.online",
    expectedModules: ["/modules/informed-consents", "/modules/discharge-refusal"],
    blockedModules: ["/modules/promissory-notes"],
  },
  {
    label: "Quality / Compliance",
    key: "quality-compliance",
    email: "quality.compliance@pilot.imc.wathiqcare.online",
    expectedModules: ["/modules/informed-consents", "/modules/promissory-notes", "/modules/discharge-refusal"],
    blockedModules: [],
  },
  {
    label: "Finance / Authorized Admin",
    key: "finance-admin",
    email: "finance.admin@pilot.imc.wathiqcare.online",
    expectedModules: ["/modules/promissory-notes"],
    blockedModules: ["/modules/informed-consents", "/modules/discharge-refusal"],
  },
] as const;

function randomPassword() {
  return `Pilot-${crypto.randomBytes(12).toString("base64url")}!A1`;
}

const pilotPasswordFile = join(mkdtempSync(join(tmpdir(), "wathiqcare-pilot-")), "passwords.json");
const seedPasswords = Object.fromEntries(DEMO_ACCOUNTS.map((account) => [account.key, randomPassword()]));
const rotatedPasswords = Object.fromEntries(DEMO_ACCOUNTS.map((account) => [account.key, randomPassword()]));
writeFileSync(pilotPasswordFile, JSON.stringify(seedPasswords), { mode: 0o600 });

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
  execSync("npm run demo:seed", {
    cwd: appRoot,
    stdio: "pipe",
    env: {
      ...process.env,
      WATHIQCARE_PILOT_PASSWORD_FILE: pilotPasswordFile,
    },
  });
});

async function login(page: import("@playwright/test").Page, email: string, password: string) {
  await page.goto("/login");
  await expect(page.locator("#login-identifier")).toBeVisible();
  await expect(page.locator("#login-password")).toBeVisible();
  await page.fill("#login-identifier", email);
  await page.fill("#login-password", password);
  await Promise.all([
    page.waitForURL(/\/(first-login|modules)(\?.*)?$/, { timeout: 30000 }),
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

test.describe.serial("controlled pilot module access", () => {
  test.describe.configure({ timeout: 180000 });

  for (const account of DEMO_ACCOUNTS) {
    test(`${account.label} sees only allowed modules and blocked routes are denied`, async ({ page, context }) => {
      await login(page, account.email, seedPasswords[account.key]);
      await expect(page).toHaveURL(/\/first-login(\?.*)?$/);
      await rotatePasswordIfRequired(page, rotatedPasswords[account.key]);

      if (!page.url().includes("/modules")) {
        await page.goto("/modules");
      }

      await expect(page).toHaveURL(/\/modules(\?.*)?$/);

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

      await page.goto("/modules");
      await page.getByRole("button", { name: /logout|sign out|تسجيل الخروج/i }).click();
      await page.waitForURL(/\/login/);

      const cookies = await context.cookies();
      expect(cookies.some((cookie) => cookie.name.includes("token") || cookie.name.includes("session"))).toBe(false);
    });
  }
});
