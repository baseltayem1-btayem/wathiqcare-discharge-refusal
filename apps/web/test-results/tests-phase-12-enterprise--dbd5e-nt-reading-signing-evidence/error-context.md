# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests\phase-12-enterprise-consent.spec.ts >> Phase 12.2 — Enterprise Informed Consent Integration >> LTR shell renders consent reading + signing + evidence
- Location: tests\phase-12-enterprise-consent.spec.ts:7:7

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/internal/enterprise-consent", waiting until "load"

```

# Test source

```ts
  1   | import { test, expect } from "@playwright/test";
  2   | import path from "node:path";
  3   | 
  4   | const OUT_DIR = path.join("uat-results", "phase-12", "12.2-consent-integration");
  5   | 
  6   | test.describe("Phase 12.2 — Enterprise Informed Consent Integration", () => {
  7   |   test("LTR shell renders consent reading + signing + evidence", async ({ page }) => {
> 8   |     await page.goto("/internal/enterprise-consent");
      |                ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  9   | 
  10  |     // Shell
  11  |     await expect(page.getByTestId("enterprise-shell")).toBeVisible();
  12  |     await expect(page.getByTestId("enterprise-shell-header")).toBeVisible();
  13  |     await expect(page.getByTestId("enterprise-shell-ribbon")).toBeVisible();
  14  |     await expect(page.getByTestId("enterprise-sidebar")).toBeVisible();
  15  | 
  16  |     // Consent reading
  17  |     await expect(page.getByTestId("consent-reading-panel")).toBeVisible();
  18  |     await expect(
  19  |       page.getByTestId("consent-reading-panel").locator('[data-section-id="risks"]'),
  20  |     ).toBeVisible();
  21  |     await expect(
  22  |       page.getByTestId("consent-reading-panel").locator('[data-section-id="refusal-consequences"]'),
  23  |     ).toBeVisible();
  24  |     await expect(
  25  |       page.getByTestId("consent-reading-panel").locator('[data-section-id="pdpl-privacy"]'),
  26  |     ).toBeVisible();
  27  | 
  28  |     // Signer progress bar
  29  |     await expect(page.getByTestId("consent-signers-bar")).toBeVisible();
  30  | 
  31  |     // Witness + Physician
  32  |     await expect(page.getByTestId("witness-signature-panel")).toBeVisible();
  33  |     await expect(page.getByTestId("physician-acknowledgment-card")).toBeVisible();
  34  | 
  35  |     // OTP
  36  |     await expect(page.getByTestId("mock-otp-verification")).toBeVisible();
  37  | 
  38  |     // Evidence
  39  |     await expect(page.getByTestId("evidence-panel")).toBeVisible();
  40  | 
  41  |     await page.screenshot({
  42  |       path: path.join(OUT_DIR, "ltr-full.png"),
  43  |       fullPage: true,
  44  |     });
  45  | 
  46  |     await page.getByTestId("consent-reading-panel").screenshot({
  47  |       path: path.join(OUT_DIR, "ltr-reading-panel.png"),
  48  |     });
  49  |   });
  50  | 
  51  |   test("RTL flip renders bilingual content with proper direction", async ({ page }) => {
  52  |     await page.goto("/internal/enterprise-consent");
  53  |     await page.getByTestId("enterprise-consent-toggle-direction").click();
  54  |     await expect(
  55  |       page.locator('[data-testid="enterprise-shell"][dir="rtl"]'),
  56  |     ).toBeVisible();
  57  | 
  58  |     await expect(page.getByTestId("consent-reading-panel")).toBeVisible();
  59  |     await expect(page.getByTestId("witness-signature-panel")).toBeVisible();
  60  |     await expect(page.getByTestId("physician-acknowledgment-card")).toBeVisible();
  61  |     await expect(page.getByTestId("mock-otp-verification")).toBeVisible();
  62  | 
  63  |     await page.screenshot({
  64  |       path: path.join(OUT_DIR, "rtl-full.png"),
  65  |       fullPage: true,
  66  |     });
  67  | 
  68  |     await page.getByTestId("consent-reading-panel").screenshot({
  69  |       path: path.join(OUT_DIR, "rtl-reading-panel.png"),
  70  |     });
  71  |   });
  72  | 
  73  |   test("Bilingual toggle switches reading layout", async ({ page }) => {
  74  |     await page.goto("/internal/enterprise-consent");
  75  | 
  76  |     // Default is bilingual=true.
  77  |     await expect(
  78  |       page.locator('[data-testid="consent-reading-panel"][data-bilingual="true"]'),
  79  |     ).toBeVisible();
  80  | 
  81  |     await page.getByTestId("enterprise-consent-toggle-bilingual").click();
  82  |     await expect(
  83  |       page.locator('[data-testid="consent-reading-panel"][data-bilingual="false"]'),
  84  |     ).toBeVisible();
  85  | 
  86  |     await page.screenshot({
  87  |       path: path.join(OUT_DIR, "single-language-en.png"),
  88  |       fullPage: true,
  89  |     });
  90  |   });
  91  | 
  92  |   test("Witness signature flow flips signer status", async ({ page }) => {
  93  |     await page.goto("/internal/enterprise-consent");
  94  | 
  95  |     const witnessSignButton = page.getByTestId("witness-sign-button");
  96  |     await expect(witnessSignButton).toBeEnabled();
  97  |     await witnessSignButton.click();
  98  | 
  99  |     await expect(page.getByTestId("witness-signed-pill")).toBeVisible();
  100 |     await expect(
  101 |       page.locator('[data-testid="witness-signature-panel"][data-signed="true"]'),
  102 |     ).toBeVisible();
  103 |   });
  104 | 
  105 |   test("OTP mock flow accepts the expected code", async ({ page }) => {
  106 |     await page.goto("/internal/enterprise-consent");
  107 | 
  108 |     await page.getByTestId("otp-send-button").click();
```