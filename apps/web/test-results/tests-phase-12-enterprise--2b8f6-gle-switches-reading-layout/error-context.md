# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests\phase-12-enterprise-consent.spec.ts >> Phase 12.2 — Enterprise Informed Consent Integration >> Bilingual toggle switches reading layout
- Location: tests\phase-12-enterprise-consent.spec.ts:73:7

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
  8   |     await page.goto("/internal/enterprise-consent");
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
> 74  |     await page.goto("/internal/enterprise-consent");
      |                ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
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
  109 |     const otpInput = page.getByTestId("otp-code-input");
  110 |     await expect(otpInput).toBeVisible({ timeout: 3000 });
  111 | 
  112 |     await otpInput.fill("123456");
  113 |     await page.getByTestId("otp-verify-button").click();
  114 | 
  115 |     await expect(page.getByTestId("otp-verified-banner")).toBeVisible({
  116 |       timeout: 3000,
  117 |     });
  118 |     await expect(
  119 |       page.locator('[data-testid="mock-otp-verification"][data-status="verified"]'),
  120 |     ).toBeVisible();
  121 |   });
  122 | 
  123 |   test("Risk blocks render with severity tone", async ({ page }) => {
  124 |     await page.goto("/internal/enterprise-consent");
  125 | 
  126 |     const riskGrid = page.getByTestId("risk-blocks-risks");
  127 |     await expect(riskGrid).toBeVisible();
  128 | 
  129 |     // Production template includes a critical-severity death-clause risk.
  130 |     await expect(
  131 |       riskGrid.locator('[data-risk-severity="critical"]'),
  132 |     ).toBeVisible();
  133 |     await expect(
  134 |       riskGrid.locator('[data-risk-severity="high"]').first(),
  135 |     ).toBeVisible();
  136 |   });
  137 | 
  138 |   test("TEST MODE banner + default patient values + test OTP code render", async ({ page }) => {
  139 |     await page.goto("/internal/enterprise-consent");
  140 | 
  141 |     await expect(page.getByTestId("test-mode-banner")).toContainText(
  142 |       "PREVIEW TEST MODE",
  143 |     );
  144 | 
  145 |     await expect(page.getByTestId("default-patient-name")).toHaveText("Test Patient");
  146 |     await expect(page.getByTestId("default-mrn")).toHaveText("MRN-TEST-1001");
  147 |     await expect(page.getByTestId("default-mobile")).toContainText("+966500000001");
  148 |     await expect(page.getByTestId("default-email")).toHaveText("admin@wathiqcare.med.sa");
  149 |     await expect(page.getByTestId("default-national-id")).toHaveText("1029384756");
  150 |     await expect(page.getByTestId("default-physician")).toHaveText("Dr. Demo Physician");
  151 |     await expect(page.getByTestId("default-witness")).toHaveText("Demo Witness");
  152 |     await expect(page.getByTestId("default-otp-code")).toHaveText("123456");
  153 | 
  154 |     await page.screenshot({
  155 |       path: path.join(OUT_DIR, "test-mode-defaults.png"),
  156 |       fullPage: true,
  157 |     });
  158 |   });
  159 | 
  160 |   test("Send Patient Signing Link simulates email + shows preview URL", async ({ page }) => {
  161 |     await page.goto("/internal/enterprise-consent");
  162 | 
  163 |     await expect(page.getByTestId("signing-link-panel")).toBeVisible();
  164 |     await page.getByTestId("send-signing-link-button").click();
  165 | 
  166 |     await expect(page.getByTestId("signing-link-sent-message")).toContainText(
  167 |       "admin@wathiqcare.med.sa",
  168 |     );
  169 |     await expect(page.getByTestId("signing-link-url")).toContainText(
  170 |       "/internal/enterprise-consent?token=test-patient-signing",
  171 |     );
  172 | 
  173 |     await page.screenshot({
  174 |       path: path.join(OUT_DIR, "signing-link-sent.png"),
```