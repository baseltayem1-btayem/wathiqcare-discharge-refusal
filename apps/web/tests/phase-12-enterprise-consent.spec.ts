import { test, expect } from "@playwright/test";
import path from "node:path";

const OUT_DIR = path.join("uat-results", "phase-12", "12.2-consent-integration");

test.describe("Phase 12.2 — Enterprise Informed Consent Integration", () => {
  test("LTR shell renders consent reading + signing + evidence", async ({ page }) => {
    await page.goto("/internal/enterprise-consent");

    // Shell
    await expect(page.getByTestId("enterprise-shell")).toBeVisible();
    await expect(page.getByTestId("enterprise-shell-header")).toBeVisible();
    await expect(page.getByTestId("enterprise-shell-ribbon")).toBeVisible();
    await expect(page.getByTestId("enterprise-sidebar")).toBeVisible();

    // Consent reading
    await expect(page.getByTestId("consent-reading-panel")).toBeVisible();
    await expect(
      page.getByTestId("consent-reading-panel").locator('[data-section-id="risks"]'),
    ).toBeVisible();
    await expect(
      page.getByTestId("consent-reading-panel").locator('[data-section-id="refusal-consequences"]'),
    ).toBeVisible();
    await expect(
      page.getByTestId("consent-reading-panel").locator('[data-section-id="pdpl-privacy"]'),
    ).toBeVisible();

    // Signer progress bar
    await expect(page.getByTestId("consent-signers-bar")).toBeVisible();

    // Witness + Physician
    await expect(page.getByTestId("witness-signature-panel")).toBeVisible();
    await expect(page.getByTestId("physician-acknowledgment-card")).toBeVisible();

    // OTP
    await expect(page.getByTestId("mock-otp-verification")).toBeVisible();

    // Evidence
    await expect(page.getByTestId("evidence-panel")).toBeVisible();

    await page.screenshot({
      path: path.join(OUT_DIR, "ltr-full.png"),
      fullPage: true,
    });

    await page.getByTestId("consent-reading-panel").screenshot({
      path: path.join(OUT_DIR, "ltr-reading-panel.png"),
    });
  });

  test("RTL flip renders bilingual content with proper direction", async ({ page }) => {
    await page.goto("/internal/enterprise-consent");
    await page.getByTestId("enterprise-consent-toggle-direction").click();
    await expect(
      page.locator('[data-testid="enterprise-shell"][dir="rtl"]'),
    ).toBeVisible();

    await expect(page.getByTestId("consent-reading-panel")).toBeVisible();
    await expect(page.getByTestId("witness-signature-panel")).toBeVisible();
    await expect(page.getByTestId("physician-acknowledgment-card")).toBeVisible();
    await expect(page.getByTestId("mock-otp-verification")).toBeVisible();

    await page.screenshot({
      path: path.join(OUT_DIR, "rtl-full.png"),
      fullPage: true,
    });

    await page.getByTestId("consent-reading-panel").screenshot({
      path: path.join(OUT_DIR, "rtl-reading-panel.png"),
    });
  });

  test("Bilingual toggle switches reading layout", async ({ page }) => {
    await page.goto("/internal/enterprise-consent");

    // Default is bilingual=true.
    await expect(
      page.locator('[data-testid="consent-reading-panel"][data-bilingual="true"]'),
    ).toBeVisible();

    await page.getByTestId("enterprise-consent-toggle-bilingual").click();
    await expect(
      page.locator('[data-testid="consent-reading-panel"][data-bilingual="false"]'),
    ).toBeVisible();

    await page.screenshot({
      path: path.join(OUT_DIR, "single-language-en.png"),
      fullPage: true,
    });
  });

  test("Witness signature flow flips signer status", async ({ page }) => {
    await page.goto("/internal/enterprise-consent");

    const witnessSignButton = page.getByTestId("witness-sign-button");
    await expect(witnessSignButton).toBeEnabled();
    await witnessSignButton.click();

    await expect(page.getByTestId("witness-signed-pill")).toBeVisible();
    await expect(
      page.locator('[data-testid="witness-signature-panel"][data-signed="true"]'),
    ).toBeVisible();
  });

  test("OTP mock flow accepts the expected code", async ({ page }) => {
    await page.goto("/internal/enterprise-consent");

    await page.getByTestId("otp-send-button").click();
    const otpInput = page.getByTestId("otp-code-input");
    await expect(otpInput).toBeVisible({ timeout: 3000 });

    await otpInput.fill("482917");
    await page.getByTestId("otp-verify-button").click();

    await expect(page.getByTestId("otp-verified-banner")).toBeVisible({
      timeout: 3000,
    });
    await expect(
      page.locator('[data-testid="mock-otp-verification"][data-status="verified"]'),
    ).toBeVisible();
  });

  test("Risk blocks render with severity tone", async ({ page }) => {
    await page.goto("/internal/enterprise-consent");

    const riskGrid = page.getByTestId("risk-blocks-risks");
    await expect(riskGrid).toBeVisible();

    // Production template includes a critical-severity death-clause risk.
    await expect(
      riskGrid.locator('[data-risk-severity="critical"]'),
    ).toBeVisible();
    await expect(
      riskGrid.locator('[data-risk-severity="high"]').first(),
    ).toBeVisible();
  });
});
