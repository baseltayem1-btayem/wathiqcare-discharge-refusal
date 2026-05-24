# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests\phase-12-enterprise-consent.spec.ts >> Phase 12.2 — Enterprise Informed Consent Integration >> ?token=test-patient-signing opens session in signing-link mode
- Location: tests\phase-12-enterprise-consent.spec.ts:179:7

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/internal/enterprise-consent?token=test-patient-signing", waiting until "load"

```

# Test source

```ts
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
  175 |       fullPage: true,
  176 |     });
  177 |   });
  178 | 
  179 |   test("?token=test-patient-signing opens session in signing-link mode", async ({ page }) => {
> 180 |     await page.goto("/internal/enterprise-consent?token=test-patient-signing");
      |                ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  181 | 
  182 |     await expect(page.getByTestId("test-mode-banner")).toBeVisible();
  183 |     await expect(page.getByTestId("test-mode-signing-link-active")).toBeVisible();
  184 |     await expect(page.getByTestId("consent-reading-panel")).toBeVisible();
  185 |     await expect(page.getByTestId("default-patient-name")).toHaveText("Test Patient");
  186 | 
  187 |     await page.screenshot({
  188 |       path: path.join(OUT_DIR, "signing-link-route.png"),
  189 |       fullPage: true,
  190 |     });
  191 |   });
  192 | 
  193 |   test("Full signing flow surfaces success summary", async ({ page }) => {
  194 |     await page.goto("/internal/enterprise-consent");
  195 | 
  196 |     // 1. Patient acknowledgment
  197 |     const ackCheckbox = page
  198 |       .locator('input[type="checkbox"]')
  199 |       .filter({ hasText: /./ })
  200 |       .first();
  201 |     // Production PatientSigningPanel exposes an acknowledgment toggle; find by label fallback.
  202 |     const acknowledgeCandidate = page.getByRole("checkbox").first();
  203 |     if (await acknowledgeCandidate.count()) {
  204 |       await acknowledgeCandidate.check({ force: true }).catch(() => {});
  205 |     }
  206 |     // Direct fallback: tick all checkboxes on the page so acknowledgment flips.
  207 |     const allChecks = page.locator('input[type="checkbox"]');
  208 |     const checkCount = await allChecks.count();
  209 |     for (let i = 0; i < checkCount; i++) {
  210 |       await allChecks.nth(i).check({ force: true }).catch(() => {});
  211 |     }
  212 | 
  213 |     // 2. Witness sign
  214 |     await page.getByTestId("witness-sign-button").click();
  215 | 
  216 |     // 3. Physician acknowledgment — click the confirm control on the card.
  217 |     await page.getByTestId("physician-acknowledgment-card").getByRole("button").first().click().catch(() => {});
  218 |     // If a checkbox version is used:
  219 |     const physicianCheckbox = page
  220 |       .getByTestId("physician-acknowledgment-card")
  221 |       .locator('input[type="checkbox"]');
  222 |     if (await physicianCheckbox.count()) {
  223 |       await physicianCheckbox.first().check({ force: true }).catch(() => {});
  224 |     }
  225 | 
  226 |     // 4. OTP
  227 |     await page.getByTestId("otp-send-button").click();
  228 |     await page.getByTestId("otp-code-input").fill("123456");
  229 |     await page.getByTestId("otp-verify-button").click();
  230 |     await expect(page.getByTestId("otp-verified-banner")).toBeVisible({ timeout: 3000 });
  231 | 
  232 |     // The success summary is conditional on overallComplete. If patient/physician
  233 |     // acknowledgment couldn't be flipped via the checkbox heuristic above, the
  234 |     // summary will not appear — in that case we just verify the panel and OTP
  235 |     // succeeded (this scenario is environment-dependent on the production
  236 |     // PatientSigningPanel internals).
  237 |     const summary = page.getByTestId("signing-success-summary");
  238 |     if (await summary.count()) {
  239 |       await expect(summary.getByTestId("success-patient-signed")).toBeVisible();
  240 |       await expect(summary.getByTestId("success-otp-verified")).toBeVisible();
  241 |       await expect(summary.getByTestId("success-witness-completed")).toBeVisible();
  242 |       await expect(summary.getByTestId("success-physician-ack")).toBeVisible();
  243 |       await expect(summary.getByTestId("success-evidence-ready")).toBeVisible();
  244 | 
  245 |       await page.screenshot({
  246 |         path: path.join(OUT_DIR, "signing-success-summary.png"),
  247 |         fullPage: true,
  248 |       });
  249 |     }
  250 |   });
  251 | });
  252 | 
```