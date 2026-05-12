import assert from "node:assert/strict";
import test from "node:test";

import { buildCaseExecutionWorkspaceFlow } from "@/components/cases/caseExecutionWorkspaceFlow";

test("case workspace flow recommends the first incomplete step", () => {
  const flow = buildCaseExecutionWorkspaceFlow({
    role: "doctor",
    mrn: "MRN-100",
    patientName: "Test Patient",
    physician: "Dr Test",
    diagnosis: "Stable diagnosis",
    caseStatus: "OPEN",
    presentationRecorded: true,
    patientDecision: null,
    patientAcknowledged: false,
    witnessRecorded: false,
    consentRecorded: false,
    readinessReadyForLegal: false,
    readinessReason: "Missing patient acknowledgment",
    readinessBlockers: ["Missing patient acknowledgment"],
    refusalScenario: true,
    financialNoticeAvailable: false,
    pdfLatestStatus: null,
    pdfCanFinalize: false,
    pdfVersionCount: 0,
    legalPackageGenerated: false,
    documentCount: 0,
  });

  assert.equal(flow.recommendedStepKey, "patient_decision");
  assert.equal(flow.currentStep.key, "patient_decision");
  assert.equal(flow.steps.length, 3);
  assert.equal(flow.steps[0]?.key, "medical_decision");
  assert.equal(flow.steps[1]?.key, "patient_decision");
  assert.equal(flow.steps[2]?.key, "closure");
  assert.equal(flow.steps.find((step) => step.key === "medical_decision")?.status, "completed");
  assert.equal(flow.steps.find((step) => step.key === "patient_decision")?.status, "current");
});

test("case workspace flow marks closure current when prior steps are complete", () => {
  const flow = buildCaseExecutionWorkspaceFlow({
    role: "legal_admin",
    mrn: "MRN-100",
    patientName: "Test Patient",
    physician: "Dr Test",
    diagnosis: "Stable diagnosis",
    caseStatus: "OPEN",
    presentationRecorded: true,
    patientDecision: "accepted",
    patientAcknowledged: true,
    witnessRecorded: true,
    consentRecorded: true,
    readinessReadyForLegal: true,
    readinessReason: undefined,
    readinessBlockers: [],
    refusalScenario: false,
    financialNoticeAvailable: true,
    pdfLatestStatus: "final",
    pdfCanFinalize: true,
    pdfVersionCount: 2,
    legalPackageGenerated: true,
    documentCount: 3,
  });

  assert.equal(flow.recommendedStepKey, "closure");
  assert.equal(flow.currentStep.key, "closure");
  assert.equal(flow.steps.length, 3);
  assert.equal(flow.steps.find((step) => step.key === "patient_decision")?.status, "completed");
  assert.ok(
    flow.steps
      .find((step) => step.key === "closure")
      ?.missingItems.some((item) => item.includes("Case status is still open")),
  );
});
