import { test, expect } from "@playwright/test";

const WORKSPACE_URL = "/prototype/clinical-workspace-2";

async function selectPatient(page, name: string) {
  await page.goto(WORKSPACE_URL);
  await page.waitForSelector("text=Patient & Encounter");
  await page.fill('input[placeholder*="Search patient"]', name);
  await page.getByRole("button", { name: new RegExp(name) }).click();
}

async function selectProcedure(page, name: string) {
  await page.getByRole("button", { name: new RegExp(name) }).click();
}

async function acknowledgeAllAlerts(page) {
  let buttons = page.getByRole("button", { name: /Acknowledge/ });
  while (await buttons.first().isVisible().catch(() => false)) {
    await buttons.first().click();
    await page.waitForTimeout(100);
    buttons = page.getByRole("button", { name: /Acknowledge/ });
  }
}

async function approveDraft(page) {
  await acknowledgeAllAlerts(page);
  await page.getByRole("button", { name: "Approve draft" }).click();
}

async function switchToEnglish(page) {
  const english = page.getByRole("button", { name: "English" });
  if (await english.isVisible().catch(() => false)) {
    await english.click();
  }
}

async function completeEducation(page) {
  await page.getByRole("button", { name: "Understanding" }).click();
  await page.getByRole("button", { name: /To confirm I understand/ }).click();
  await page.getByRole("button", { name: /My treating physician or care team/ }).click();
  await page.getByRole("button", { name: "Check answers" }).click();
}

async function completeQuestions(page) {
  await page.locator('textarea[placeholder*="Type your question"]').fill("What are the alternatives?");
  await page.getByRole("button", { name: "Send question" }).click();
  await page.getByRole("button", { name: "Continue to decision" }).click();
}

async function completeSignature(page) {
  await page.getByRole("button", { name: "Verify OTP" }).click();
  await page.getByRole("button", { name: "Sign consent" }).click();
}

async function completePatientJourney(page, { decision = "accepted" }: { decision?: "accepted" | "refused" } = {}) {
  await page.getByRole("button", { name: "Preview patient journey" }).click();
  await page.waitForSelector("text=Informed Consent");
  await switchToEnglish(page);

  await page.getByRole("button", { name: "Start reviewing" }).click();
  await completeEducation(page);
  await completeQuestions(page);

  if (decision === "accepted") {
    await page.getByRole("button", { name: "I Accept" }).click();
    await completeSignature(page);
    await expect(page.getByText("Consent completed")).toBeVisible();
  } else {
    await page.getByRole("button", { name: "I Refuse" }).click();
    await page.getByText(/I acknowledge the consequences/).click();
    await page.locator('input[type="text"]').fill("Patient Signature");
    await page.getByRole("button", { name: "Sign refusal" }).click();
    await expect(page.getByText("Refusal recorded")).toBeVisible();
  }
}

async function sendAndViewTimeline(page) {
  await page.getByRole("button", { name: "Back to physician workspace" }).first().click();
  await page.getByRole("button", { name: "Send to patient" }).click();
  await page.getByRole("button", { name: "Confirm send" }).click();
  await expect(page.getByText("Consent dispatched to patient.").first()).toBeVisible();
  await page.getByRole("button", { name: "View timeline" }).click();
  await expect(page.getByText("Clinical Timeline")).toBeVisible();
}

test("happy path: patient accepts and timeline is generated", async ({ page }) => {
  await selectPatient(page, "Ahmad Hassan");
  await selectProcedure(page, "Laparoscopic appendectomy");
  await approveDraft(page);
  await completePatientJourney(page, { decision: "accepted" });
  await sendAndViewTimeline(page);
  await expect(page.getByText("Signature captured")).toBeVisible();
  await expect(page.getByText("PDF finalized")).toBeVisible();
});

test("refusal path: patient refuses and decision is documented", async ({ page }) => {
  await selectPatient(page, "Robert Smith");
  await selectProcedure(page, "Coronary angiography");
  await approveDraft(page);
  await completePatientJourney(page, { decision: "refused" });
  await sendAndViewTimeline(page);
  await expect(page.getByText("Patient refused the procedure")).toBeVisible();
});

test("clinical alerts: unacknowledged alerts block approval", async ({ page }) => {
  await selectPatient(page, "Robert Smith");
  await selectProcedure(page, "Coronary angiography");
  await expect(page.getByText("Patient-specific clinical alerts")).toBeVisible();
  await expect(page.getByRole("button", { name: "Approve draft" })).toBeDisabled();
  await acknowledgeAllAlerts(page);
  await expect(page.getByRole("button", { name: "Approve draft" })).toBeEnabled();
});
