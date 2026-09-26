import { chromium } from "@playwright/test";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const BASE_URL = "http://localhost:3000/prototype/clinical-workspace-2";

async function screenshot(page, name) {
  const outPath = path.join(__dirname, `${name}.png`);
  await page.screenshot({ path: outPath, fullPage: true });
  console.log(`  📸 ${outPath}`);
  return outPath;
}

async function selectPatient(page, name) {
  await page.goto(BASE_URL);
  await page.waitForSelector("text=Patient & Encounter");
  await page.fill('input[placeholder*="Search patient"]', name);
  await page.getByRole("button", { name: new RegExp(name) }).click();
}

async function selectProcedure(page, name) {
  await page.getByRole("button", { name: new RegExp(name) }).click();
}

async function acknowledgeAllAlerts(page) {
  const buttons = page.getByRole("button", { name: /Acknowledge/ });
  while (await buttons.first().isVisible().catch(() => false)) {
    await buttons.first().click();
    await page.waitForTimeout(100);
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

async function completePatientJourney(page, { decision = "accepted" } = {}) {
  await page.getByRole("button", { name: "Preview patient journey" }).click();
  await page.waitForSelector("text=Informed Consent");
  await switchToEnglish(page);

  // Landing
  await page.getByRole("button", { name: "Start reviewing" }).click();

  // Education
  await completeEducation(page);

  // Questions
  await completeQuestions(page);

  // Decision
  if (decision === "accepted") {
    await page.getByRole("button", { name: "I Accept" }).click();
  } else {
    await page.getByRole("button", { name: "I Refuse" }).click();
    // Checking the acknowledgment box advances directly to the refusal signature panel.
    await page.getByText(/I acknowledge the consequences/).click();
    await page.locator('input[type="text"]').fill("Patient Signature");
    await page.getByRole("button", { name: "Sign refusal" }).click();
    await page.waitForSelector("text=Refusal recorded");
    return;
  }

  // Signature
  await completeSignature(page);
  await page.waitForSelector("text=Consent completed");
}

async function sendAndViewTimeline(page) {
  await page.getByRole("button", { name: "Back to physician workspace" }).first().click();
  await page.getByRole("button", { name: "Send to patient" }).click();
  await page.getByRole("button", { name: "Confirm send" }).click();
  await page.waitForSelector("text=Consent dispatched to patient");
  await page.getByRole("button", { name: "View timeline" }).click();
  await page.waitForSelector("text=Clinical timeline");
}

async function runScenario(name, steps) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  console.log(`\n▶ ${name}`);
  try {
    await steps(page);
    await screenshot(page, `clinical-workspace-2-${name.replace(/\s+/g, "-").toLowerCase()}`);
    console.log(`  ✅ ${name} passed`);
  } catch (err) {
    await screenshot(page, `clinical-workspace-2-${name.replace(/\s+/g, "-").toLowerCase()}-error`);
    console.error(`  ❌ ${name} failed: ${err.message}`);
    throw err;
  } finally {
    await browser.close();
  }
}

async function main() {
  // Happy path: Ahmad Hassan + laparoscopic appendectomy → accept
  await runScenario("happy accept", async (page) => {
    await selectPatient(page, "Ahmad Hassan");
    await selectProcedure(page, "Laparoscopic appendectomy");
    await approveDraft(page);
    await screenshot(page, "clinical-workspace-2-happy-physician");
    await completePatientJourney(page, { decision: "accepted" });
    await screenshot(page, "clinical-workspace-2-happy-patient");
    await sendAndViewTimeline(page);
  });

  // Refusal path: Robert Smith + angiography → refuse
  await runScenario("refusal", async (page) => {
    await selectPatient(page, "Robert Smith");
    await selectProcedure(page, "Coronary angiography");
    await approveDraft(page);
    await screenshot(page, "clinical-workspace-2-refusal-physician");
    await completePatientJourney(page, { decision: "refused" });
    await sendAndViewTimeline(page);
  });

  // Alert path: Robert Smith + angiography → show alerts before acknowledgment
  await runScenario("clinical alerts", async (page) => {
    await selectPatient(page, "Robert Smith");
    await selectProcedure(page, "Coronary angiography");
    await page.waitForSelector("text=Patient-specific clinical alerts");
    await screenshot(page, "clinical-workspace-2-alerts-unacknowledged");
    await acknowledgeAllAlerts(page);
    await screenshot(page, "clinical-workspace-2-alerts-acknowledged");
  });

  console.log("\n🎉 All workspace-2 smoke scenarios completed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
