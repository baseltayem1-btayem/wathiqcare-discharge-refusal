import assert from "node:assert/strict";
import test from "node:test";

import { buildAiGenerationAuditRecord } from "@/lib/clinical-ai/audit/ai-generation-audit";
import { protectImmutableLegalBlocks } from "@/lib/clinical-ai/safety/immutable-legal-protection";
import { markAiDraftPendingReview, approveAiDraftByPhysician, rejectAiDraftByPhysician, comparePhysicianEdits } from "@/lib/clinical-ai/safety/physician-approval";
import { minimizeConsentPhi } from "@/lib/clinical-ai/safety/phi-minimization";
import { validateStructuredAiOutput } from "@/lib/clinical-ai/safety/ai-guardrails";
import { CLINICAL_AI_DISCLAIMER, type ClinicalAiStructuredDraft } from "@/lib/clinical-ai/types/clinical-ai-types";

function buildDraft(overrides: Partial<ClinicalAiStructuredDraft> = {}): ClinicalAiStructuredDraft {
  return {
    procedureExplanation: "The procedure is explained in neutral clinical language.",
    majorRisks: ["Major risk one."],
    minorRisks: ["Minor risk one."],
    complications: ["Complication one."],
    sideEffects: ["Side effect one."],
    alternatives: ["Alternative one."],
    risksOfRefusal: ["Risk of refusal one."],
    postProcedureInstructions: ["Instruction one."],
    patientEducationSummary: "Education summary.",
    medicalDisclaimer: CLINICAL_AI_DISCLAIMER,
    ...overrides,
  };
}

test("PHI minimization removes direct patient identifiers", () => {
  const minimized = minimizeConsentPhi({
    clinicalContext: ["laparoscopic", "adult"],
    consentType: "surgical",
    diagnosisLabel: "gallstones",
    procedure: "Laparoscopic cholecystectomy",
    specialty: "Surgery",
  });

  assert.equal("mrn" in minimized, false);
  assert.equal("nationalId" in minimized, false);
  assert.equal("phoneNumber" in minimized, false);
});

test("guardrails reject blocked diagnostic and certainty language", () => {
  assert.throws(
    () => validateStructuredAiOutput(buildDraft({ procedureExplanation: "This will definitely diagnose the patient." })),
    /safety guardrails/,
  );
});

test("structured output validation accepts required schema", () => {
  const validated = validateStructuredAiOutput(buildDraft());
  assert.equal(validated.medicalDisclaimer, CLINICAL_AI_DISCLAIMER);
  assert.equal(validated.majorRisks.length, 1);
});

test("physician approval state transitions remain review-bound", () => {
  assert.equal(markAiDraftPendingReview().status, "pending-physician-review");
  assert.equal(approveAiDraftByPhysician("physician-1").status, "approved");
  assert.equal(rejectAiDraftByPhysician("physician-1").status, "rejected");
});

test("immutable legal protection blocks legal clause mutation attempts", () => {
  const result = protectImmutableLegalBlocks({ legalClauses: "do not touch" });
  assert.equal(result.allowed, false);
  assert.deepEqual(result.blockedFields, ["legalClauses"]);
});

test("AI audit payload generation records hash and pending review status", () => {
  const draft = buildDraft();
  const audit = buildAiGenerationAuditRecord({
    accepted: null,
    request: {
      actorId: "physician-1",
      physicianUserId: "physician-1",
      promptVersion: "clinical-ai-consent-drafting-v1",
      tenantId: "tenant-1",
      context: {
        procedure: "Laparoscopic cholecystectomy",
        specialty: "Surgery",
      },
    },
    response: {
      draft,
      model: "mock-clinical-ai-v1",
      provider: "azure-openai-provider",
      providerMode: "mock-local",
    },
  });

  assert.equal(audit.status, "pending-review");
  assert.equal(audit.outputHash.length > 10, true);
});

test("comparePhysicianEdits reports changed structured fields", () => {
  const original = buildDraft();
  const revised = buildDraft({ patientEducationSummary: "Updated education summary." });
  const changes = comparePhysicianEdits(original, revised);
  assert.equal(changes.length, 1);
  assert.equal(changes[0]?.field, "patientEducationSummary");
});