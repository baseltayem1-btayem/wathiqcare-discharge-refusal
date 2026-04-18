import assert from "node:assert/strict";
import test from "node:test";
import { buildWorkspaceGuidance, normalizeWorkspaceRole } from "@/components/cases/workspaceGuidance";

test("IMC role normalization maps doctor and legal aliases", () => {
  assert.equal(normalizeWorkspaceRole("ER_Doctor"), "doctor");
  assert.equal(normalizeWorkspaceRole("legal_officer"), "legal");
  assert.equal(normalizeWorkspaceRole("authorized_signatory"), "signatory");
});

test("IMC guidance enforces doctor ownership and patient acknowledgment", () => {
  const sections = buildWorkspaceGuidance({
    role: "doctor",
    canMedicalActions: true,
    canLegalApprove: false,
    canGeneratePdf: false,
    canGenerateBundle: false,
    readinessReadyForLegal: false,
    readinessReason: "Missing medical summary",
    presentationRecorded: false,
    patientDecision: null,
    patientAcknowledged: false,
    refusalScenario: true,
    financialNoticeAvailable: false,
    latestPdfStatus: null,
    legalPackageGenerated: false,
  });

  const medical = sections.find((section) => section.id === "medical_decision");
  const closure = sections.find((section) => section.id === "final_closure");

  assert.ok(medical);
  assert.ok(closure);
  assert.equal(medical?.ownerRole, "Doctor");
  assert.equal(medical?.status, "in_progress");
  assert.ok(medical?.missingItems.some((item) => item.includes("Patient acknowledgment")));
  assert.equal(closure?.status, "blocked");
  assert.equal(closure?.blockedReason, "Case closure is restricted to authorized signatory.");
});

test("IMC guidance requires finance awareness during refusal scenarios", () => {
  const sections = buildWorkspaceGuidance({
    role: "legal_admin",
    canMedicalActions: false,
    canLegalApprove: true,
    canGeneratePdf: true,
    canGenerateBundle: true,
    readinessReadyForLegal: true,
    presentationRecorded: true,
    patientDecision: "refused",
    patientAcknowledged: true,
    refusalScenario: true,
    financialNoticeAvailable: false,
    latestPdfStatus: "draft",
    legalPackageGenerated: true,
  });

  const legal = sections.find((section) => section.id === "legal_escalation");

  assert.ok(legal);
  assert.equal(legal?.status, "in_progress");
  assert.ok(legal?.missingItems.some((item) => item.includes("Finance notification")));
});

test("IMC guidance follows accepted decision path without refusal blockers", () => {
  const sections = buildWorkspaceGuidance({
    role: "legal_admin",
    canMedicalActions: false,
    canLegalApprove: true,
    canGeneratePdf: true,
    canGenerateBundle: true,
    readinessReadyForLegal: true,
    presentationRecorded: true,
    patientDecision: "accepted",
    patientAcknowledged: true,
    refusalScenario: false,
    financialNoticeAvailable: false,
    latestPdfStatus: "draft",
    legalPackageGenerated: true,
  });

  const legal = sections.find((section) => section.id === "legal_escalation");

  assert.ok(legal);
  assert.equal(legal?.status, "completed");
  assert.ok(legal?.nextAction.includes("final legal documentation"));
});
