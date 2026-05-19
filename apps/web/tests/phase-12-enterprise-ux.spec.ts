import { test, expect } from "@playwright/test";
import path from "node:path";

const OUT_DIR = path.join("uat-results", "phase-12", "12.1-foundation");

test.describe("Phase 12.1 — Enterprise UX foundation", () => {
  test("LTR shell + evidence panel renders", async ({ page }) => {
    await page.goto("/internal/enterprise-ux");
    await expect(page.getByTestId("enterprise-shell")).toBeVisible();
    await expect(page.getByTestId("enterprise-shell-header")).toBeVisible();
    await expect(page.getByTestId("enterprise-shell-ribbon")).toBeVisible();
    await expect(page.getByTestId("enterprise-sidebar")).toBeVisible();
    await expect(page.getByTestId("evidence-panel")).toBeVisible();

    await expect(page.getByTestId("signer-evidence-card")).toBeVisible();
    await expect(page.getByTestId("otp-log-card")).toBeVisible();
    await expect(page.getByTestId("audit-trail-card")).toBeVisible();
    await expect(page.getByTestId("qr-verification-card")).toBeVisible();
    await expect(page.getByTestId("forensic-metadata-card")).toBeVisible();

    await page.screenshot({
      path: path.join(OUT_DIR, "ltr-full.png"),
      fullPage: true,
    });

    await page.getByTestId("evidence-panel").screenshot({
      path: path.join(OUT_DIR, "ltr-evidence-panel.png"),
    });
  });

  test("RTL flip via toggle renders correctly", async ({ page }) => {
    await page.goto("/internal/enterprise-ux");
    await page.getByTestId("enterprise-ux-toggle-direction").click();
    await expect(page.locator('[data-testid="enterprise-shell"][dir="rtl"]')).toBeVisible();

    await expect(page.getByTestId("evidence-panel")).toBeVisible();

    await page.screenshot({
      path: path.join(OUT_DIR, "rtl-full.png"),
      fullPage: true,
    });

    await page.getByTestId("evidence-panel").screenshot({
      path: path.join(OUT_DIR, "rtl-evidence-panel.png"),
    });
  });

  test("QR verification card renders the QR image", async ({ page }) => {
    await page.goto("/internal/enterprise-ux");
    const qrImage = page
      .getByTestId("qr-verification-card")
      .locator('img[alt="QR verification code"]');
    await expect(qrImage).toBeVisible({ timeout: 5000 });
  });
});
