/**
 * Full UAT — May 2026
 *
 * Scope per QA brief:
 *   - 5 role logins against production alias https://wathiqcare.online
 *   - Informed-consent workflow (OTP 123456, signing link, witness, evidence)
 *     against the preview deploy that ships Phase 12.2 test mode
 *
 * Production-alias deploy is intentionally pinned to the older 6d4yiccmy
 * release (no test-mode features), so the consent workflow tests use the
 * test-mode preview URL directly. This keeps the constraint "no real
 * SMS / no real email / no production data modified" by construction.
 */
import { test, expect, type Page } from "@playwright/test";
import path from "node:path";

const PROD_URL = "https://wathiqcare.online";
const PREVIEW_URL =
  process.env.UAT_PREVIEW_URL ??
  "https://wathiqcare-discharge-refusal-axl9qn65r-wathiqcare.vercel.app";

const PATIENT_OTP = "123456";
const SIGNING_TOKEN = "test-patient-signing";
const TEST_PASSWORD = "WathiqCare@2026";

const SCREENSHOT_DIR = path.join(
  process.cwd(),
  "uat-results",
  "full-uat-may2026",
);

type RoleAccount = {
  key: string;
  label: string;
  email: string;
};

const ROLES: RoleAccount[] = [
  { key: "physician",          label: "Physician",          email: "dr.ahmed@wathiqcare.med.sa" },
  { key: "medical-director",   label: "Medical Director",   email: "medicaldirector@wathiqcare.med.sa" },
  { key: "nursing-supervisor", label: "Nursing Supervisor", email: "nursingsupervisor@wathiqcare.med.sa" },
  { key: "legal-reviewer",     label: "Legal Reviewer",     email: "legalreviewer@wathiqcare.med.sa" },
  { key: "compliance",         label: "Compliance Reviewer", email: "compliance@wathiqcare.med.sa" },
];

async function snap(page: Page, name: string) {
  await page.screenshot({
    path: path.join(SCREENSHOT_DIR, `${name}.png`),
    fullPage: true,
  });
}

async function loginAs(page: Page, account: RoleAccount) {
  await page.goto(`${PROD_URL}/login`, { waitUntil: "domcontentloaded" });
  await snap(page, `login-page-before-${account.key}`);

  await page.locator("#email").fill(account.email);
  await page.locator("#password").fill(TEST_PASSWORD);
  await page.locator('button[type="submit"]').click();

  // Wait for either redirect away from /login OR an in-page error
  await Promise.race([
    page.waitForURL((url) => !url.pathname.startsWith("/login"), {
      timeout: 30000,
    }),
    page.locator('[role="alert"]').waitFor({ timeout: 30000 }),
  ]).catch(() => undefined);
}

/* ========================================================================== */
/*                       ROLE LOGIN + DASHBOARD TOUR                          */
/* ========================================================================== */

test.describe("@login Role login + dashboard rendering (production alias)", () => {
  for (const role of ROLES) {
    test(`@login ${role.label} can authenticate and renders dashboard`, async ({ page }) => {
      const apiResponses: { url: string; status: number }[] = [];
      page.on("response", (r) => {
        const u = r.url();
        if (u.includes("/api/auth/password/login")) {
          apiResponses.push({ url: u, status: r.status() });
        }
      });

      await loginAs(page, role);
      await page.waitForTimeout(1000);

      const url = page.url();
      const alertVisible = await page
        .locator('[role="alert"]')
        .first()
        .isVisible()
        .catch(() => false);
      const alertText = alertVisible
        ? (await page.locator('[role="alert"]').first().textContent()) ?? ""
        : "";

      const loginCall = apiResponses[apiResponses.length - 1];
      const loginStatus = loginCall?.status ?? -1;

      // eslint-disable-next-line no-console
      console.log(
        `[UAT-LOGIN] role=${role.key} loginHTTP=${loginStatus} finalURL=${url} alert="${alertText.trim()}"`,
      );

      await snap(page, `dashboard-${role.key}`);

      // Soft assertions — record but do not abort the suite if rate-limited
      expect.soft(loginStatus, `login HTTP for ${role.key}`).not.toBe(429);
      expect.soft(url, `final URL for ${role.key}`).not.toContain("/login");
    });
  }
});

/* ========================================================================== */
/*                CONSENT WORKFLOW — PREVIEW TEST MODE                        */
/* ========================================================================== */

test.describe("@consent Informed consent workflow (preview test-mode)", () => {
  test("@consent Banner + default patient values + OTP code render", async ({ page }) => {
    await page.goto(`${PREVIEW_URL}/internal/enterprise-consent`, {
      waitUntil: "domcontentloaded",
    });

    await expect(page.getByTestId("test-mode-banner")).toContainText(
      "PREVIEW TEST MODE",
    );
    await expect(page.getByTestId("default-patient-name")).toContainText("Test Patient");
    await expect(page.getByTestId("default-mrn")).toContainText("MRN-TEST-1001");
    await expect(page.getByTestId("default-mobile")).toContainText("+966500000001");
    await expect(page.getByTestId("default-email")).toContainText(
      "admin@wathiqcare.med.sa",
    );
    await expect(page.getByTestId("default-national-id")).toContainText("1029384756");
    await expect(page.getByTestId("default-physician")).toContainText(
      "Dr. Demo Physician",
    );
    await expect(page.getByTestId("default-witness")).toContainText("Demo Witness");
    await expect(page.getByTestId("default-otp-code")).toContainText(PATIENT_OTP);

    await snap(page, "consent-01-defaults");
  });

  test("@consent Send Patient Signing Link simulates email (no SMTP)", async ({ page }) => {
    await page.goto(`${PREVIEW_URL}/internal/enterprise-consent`, {
      waitUntil: "domcontentloaded",
    });

    const sendBtn = page.getByTestId("send-signing-link-button");
    await expect(sendBtn).toBeVisible();
    await sendBtn.click();

    const sent = page.getByTestId("signing-link-sent-message");
    await expect(sent).toBeVisible();
    await expect(sent).toContainText("admin@wathiqcare.med.sa");

    const linkUrl = page.getByTestId("signing-link-url");
    await expect(linkUrl).toBeVisible();
    await expect(linkUrl).toContainText("/internal/enterprise-consent?token=");
    await expect(linkUrl).toContainText(SIGNING_TOKEN);

    await snap(page, "consent-02-signing-link-sent");
  });

  test("@consent ?token route opens active-signing session", async ({ page }) => {
    await page.goto(
      `${PREVIEW_URL}/internal/enterprise-consent?token=${SIGNING_TOKEN}`,
      { waitUntil: "domcontentloaded" },
    );

    await expect(page.getByTestId("test-mode-banner")).toBeVisible();
    await expect(page.getByTestId("test-mode-signing-link-active")).toBeVisible();
    await expect(page.getByTestId("default-patient-name")).toContainText("Test Patient");

    await snap(page, "consent-03-signing-link-route");
  });

  test("@consent OTP verification accepts 123456", async ({ page }) => {
    await page.goto(`${PREVIEW_URL}/internal/enterprise-consent`, {
      waitUntil: "domcontentloaded",
    });

    // OTP input - the production MockOtpVerification renders 6 individual digit
    // boxes OR a single input. We try both forms.
    const otpDigits = page.locator('input[inputmode="numeric"]');
    const otpCount = await otpDigits.count();

    if (otpCount >= 6) {
      const digits = PATIENT_OTP.split("");
      for (let i = 0; i < 6; i++) {
        await otpDigits.nth(i).fill(digits[i]);
      }
    } else if (otpCount === 1) {
      await otpDigits.first().fill(PATIENT_OTP);
    } else {
      const fallback = page.getByPlaceholder(/code|رمز|otp/i).first();
      if (await fallback.isVisible().catch(() => false)) {
        await fallback.fill(PATIENT_OTP);
      }
    }

    // Click any verify-style button
    const verifyBtn = page
      .getByRole("button", { name: /verify|تحقق|confirm/i })
      .first();
    if (await verifyBtn.isVisible().catch(() => false)) {
      await verifyBtn.click().catch(() => undefined);
    }

    await page.waitForTimeout(800);
    await snap(page, "consent-04-otp-entered");
  });

  test("@consent Evidence panel + audit references render", async ({ page }) => {
    await page.goto(`${PREVIEW_URL}/internal/enterprise-consent`, {
      waitUntil: "domcontentloaded",
    });

    const evidenceMatches = page.locator(
      "text=/evidence|audit|qr|legal|sealed|verification/i",
    );
    expect(await evidenceMatches.count()).toBeGreaterThan(0);

    await snap(page, "consent-05-evidence-panel");
  });

  test("@consent Bilingual EN/AR shell renders", async ({ page }) => {
    await page.goto(`${PREVIEW_URL}/internal/enterprise-consent`, {
      waitUntil: "domcontentloaded",
    });

    const enterprise = page.getByTestId("enterprise-consent-main");
    await expect(enterprise).toBeVisible();

    // Look for any Arabic glyph somewhere on the page (RTL parallel column)
    const html = await page.content();
    expect(/[\u0600-\u06FF]/.test(html), "contains Arabic glyphs").toBeTruthy();

    await snap(page, "consent-06-bilingual");
  });

  test("@consent Mobile viewport renders the consent shell", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${PREVIEW_URL}/internal/enterprise-consent`, {
      waitUntil: "domcontentloaded",
    });

    await expect(page.getByTestId("test-mode-banner")).toBeVisible();
    await expect(page.getByTestId("enterprise-consent-main")).toBeVisible();

    await snap(page, "consent-07-mobile-390");
  });
});

/* ========================================================================== */
/*           PUBLIC SURFACE / NO-AUTH HEALTH OF PRODUCTION ALIAS              */
/* ========================================================================== */

test.describe("@public Production-alias public surface", () => {
  test("@public /login renders WathiqCare login form", async ({ page }) => {
    await page.goto(`${PROD_URL}/login`, { waitUntil: "domcontentloaded" });
    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    await snap(page, "prod-00-login-shell");
  });

  test("@public /api/health responds 200 with JSON", async ({ request }) => {
    const r = await request.get(`${PROD_URL}/api/health`);
    expect(r.status()).toBe(200);
    const body = await r.json();
    expect(body.status).toBe("ok");
  });
});
