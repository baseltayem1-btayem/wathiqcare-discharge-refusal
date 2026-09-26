import assert from "node:assert/strict";
import test from "node:test";

(process.env as Record<string, string>).NODE_ENV = "test";

import {
  PATIENT_DECLARATION_KEYS,
  buildClinicianAttestationRecord,
  buildPatientDeclarationRecord,
} from "@/lib/server/patient-declarations-service";
import {
  buildElectronicAuthenticationLabel,
  buildHumanWitnessLabel,
  buildWitnessAuthLabelPreviewFixture,
} from "@/lib/server/witness-auth-label";
import {
  assertWitnessEligibility,
  resolveAuthorizedWitnessRoles,
} from "@/lib/server/witness-requirement-service";
import {
  evaluateWitnessPolicy,
  evaluateWitnessSatisfaction,
  type WitnessPolicyInput,
} from "@/lib/server/witness-policy-service";
import {
  resolveTemplateWitnessPolicy,
  WITNESS_POLICY_PROFILES,
} from "@/lib/server/witness-policy-profiles";

const IMC_TEMPLATE_CODE = "imc-adenotonsillectomy";
const IMC_TEMPLATE_VERSION = "2018-02";
const DOCUMENT_HASH = "doc-hash-conditional-witness-acceptance-001";

const COMPLETE_IDENTITY_EVIDENCE = {
  patientCompetent: true,
  identityVerified: true,
  declarationsComplete: true,
  clinicianAttestationComplete: true,
  electronicSignatureBoundToHash: true,
};

function imcDecision(input: Partial<WitnessPolicyInput> = {}) {
  const resolved = resolveTemplateWitnessPolicy({
    metadata: null,
    templateCode: IMC_TEMPLATE_CODE,
    templateVersionLabel: IMC_TEMPLATE_VERSION,
  });
  return evaluateWitnessPolicy({
    templateRequiresWitness: false,
    templateRiskLevel: "MEDIUM",
    templatePolicy: resolved.policy,
    templatePolicySource: resolved.policySource ?? undefined,
    evidence: COMPLETE_IDENTITY_EVIDENCE,
    ...input,
  });
}

// ---------------------------------------------------------------------------
// Routine path
// ---------------------------------------------------------------------------

test("routine path: competent patient with complete evidence gets CONDITIONAL/0 witnesses", () => {
  const decision = imcDecision();
  assert.equal(decision.witnessMode, "CONDITIONAL");
  assert.equal(decision.requiredWitnessCount, 0);
  assert.deepEqual(decision.requiredWitnessRoles, []);
  assert.deepEqual(decision.triggerCodes, []);
  assert.equal(decision.policySource, "GOVERNED_CODE_PROFILE");
});

test("routine path: seven patient declarations are complete and bound to document hash", () => {
  const declarations = buildPatientDeclarationRecord({
    actorId: "patient-user-1",
    actorRole: "PATIENT",
    documentHash: DOCUMENT_HASH,
    acceptedKeys: [...PATIENT_DECLARATION_KEYS],
    locale: "bilingual",
  });
  assert.deepEqual(declarations.acceptedKeys, [...PATIENT_DECLARATION_KEYS]);
  assert.equal(declarations.documentHash, DOCUMENT_HASH);
  assert.equal(declarations.actorRole, "PATIENT");
});

test("routine path: clinician attestation is complete and bound to document hash", () => {
  const attestation = buildClinicianAttestationRecord({
    clinicianUserId: "clinician-user-1",
    documentHash: DOCUMENT_HASH,
    explainedProcedureRisksAlternatives: true,
    answeredQuestions: true,
  });
  assert.equal(attestation.explainedProcedureRisksAlternatives, true);
  assert.equal(attestation.answeredQuestions, true);
  assert.equal(attestation.documentHash, DOCUMENT_HASH);
});

test("routine path: finalization is allowed and electronic-authentication label is selected", () => {
  const decision = imcDecision();
  const satisfaction = evaluateWitnessSatisfaction(decision, []);
  assert.equal(satisfaction.satisfied, true);

  const label = buildElectronicAuthenticationLabel({
    verificationReference: "VREF-ACCEPTANCE-0001",
    maskedMobile: "+966 5****5678",
    signatureId: "sig-patient-0001",
    signedAtKsa: "2026-07-14T10:30:00+03:00",
    authenticationReference: "authref-patient-0001",
  });
  assert.equal(label.titleEn, "Electronic Signature Authentication");
  assert.ok(label.fields.some((f) => f.labelAr === "مرجع رمز التحقق"));
});

test("routine path: exact document hash is preserved through declaration evidence", () => {
  const declarations = buildPatientDeclarationRecord({
    documentHash: DOCUMENT_HASH,
    acceptedKeys: [...PATIENT_DECLARATION_KEYS],
  });
  assert.equal(declarations.documentHash, DOCUMENT_HASH);
});

// ---------------------------------------------------------------------------
// Conditional path
// ---------------------------------------------------------------------------

test("conditional path: trigger escalates IMC profile to REQUIRED with one witness", () => {
  const decision = imcDecision({ triggers: { cannotReadOrUseJourney: true } });
  assert.equal(decision.witnessMode, "REQUIRED");
  assert.equal(decision.requiredWitnessCount, 1);
  assert.deepEqual(decision.triggerCodes, ["CANNOT_READ_OR_USE_JOURNEY"]);
  assert.ok(decision.requiredWitnessRoles.length > 0);
});

test("conditional path: valid nursing witness satisfies the requirement", () => {
  const decision = imcDecision({ triggers: { cannotReadOrUseJourney: true } });
  const satisfaction = evaluateWitnessSatisfaction(
    decision,
    [{ userId: "nurse-1", role: "NURSING_REPRESENTATIVE", documentHash: DOCUMENT_HASH }],
    { expectedDocumentHash: DOCUMENT_HASH },
  );
  assert.equal(satisfaction.satisfied, true);
  assert.equal(satisfaction.signedCount, 1);
  assert.equal(satisfaction.missingCount, 0);
});

test("conditional path: valid patient-experience witness satisfies the requirement", () => {
  const decision = imcDecision({ triggers: { communicationBarrier: true } });
  const satisfaction = evaluateWitnessSatisfaction(
    decision,
    [{ userId: "px-1", role: "PATIENT_EXPERIENCE_REPRESENTATIVE", documentHash: DOCUMENT_HASH }],
    { expectedDocumentHash: DOCUMENT_HASH },
  );
  assert.equal(satisfaction.satisfied, true);
});

test("conditional path: human-witness label is selected after valid witness evidence", () => {
  const label = buildHumanWitnessLabel({
    witnessRole: "NURSING_REPRESENTATIVE",
    witnessDisplayName: "Nurse One",
    employeeId: "EMP-001",
    department: "Nursing",
    signatureId: "sig-witness-0001",
    signedAtKsa: "2026-07-14T10:35:00+03:00",
    authenticationReference: "authref-witness-0001",
    documentHash: DOCUMENT_HASH,
  });
  assert.equal(label.titleEn, "Human Witness Authentication");
  assert.ok(label.fields.some((f) => f.labelEn === "Witness Role"));
});

// ---------------------------------------------------------------------------
// Blockers
// ---------------------------------------------------------------------------

test("conditional path: stale document hash is rejected", () => {
  const decision = imcDecision({ triggers: { cannotReadOrUseJourney: true } });
  const satisfaction = evaluateWitnessSatisfaction(
    decision,
    [{ userId: "nurse-1", role: "NURSING_REPRESENTATIVE", documentHash: "old-hash" }],
    { expectedDocumentHash: DOCUMENT_HASH },
  );
  assert.equal(satisfaction.satisfied, false);
  assert.ok(satisfaction.blockers.includes("WITNESS_STALE_DOCUMENT_HASH"));
});

test("conditional path: duplicate witness signature is rejected", () => {
  const decision = imcDecision({ triggers: { cannotReadOrUseJourney: true } });
  const satisfaction = evaluateWitnessSatisfaction(decision, [
    { userId: "nurse-1", role: "NURSING_REPRESENTATIVE" },
    { userId: "nurse-1", role: "NURSING_REPRESENTATIVE" },
  ]);
  assert.equal(satisfaction.satisfied, false);
  assert.ok(satisfaction.blockers.includes("WITNESS_DUPLICATE_ROLE_SAME_PERSON"));
});

test("conditional path: wrong witness role is rejected", () => {
  const decision = imcDecision({ triggers: { cannotReadOrUseJourney: true } });
  const satisfaction = evaluateWitnessSatisfaction(decision, [
    { userId: "physician-1", role: "NURSING_REPRESENTATIVE" as const },
  ]);
  // The satisfaction evaluator checks the role against the required roles,
  // so a NURSING representative does satisfy a single-witness requirement.
  // The wrong-role blocker is enforced by assertWitnessEligibility in the
  // service layer; this test exercises that guard directly.
  assert.equal(satisfaction.satisfied, true);

  assert.throws(
    () =>
      assertWitnessEligibility({
        candidateUserId: "staff-1",
        candidateRole: "PATIENT_EXPERIENCE_REPRESENTATIVE",
        requiredRole: "NURSING_REPRESENTATIVE",
        existingWitnesses: [],
        allowSamePersonMultipleRoles: false,
      }),
    (error: unknown) => (error as { code?: string }).code === "WITNESS_ROLE_MISMATCH",
  );
});

test("conditional path: self-witnessing by patient or clinician is rejected", () => {
  assert.throws(
    () =>
      assertWitnessEligibility({
        candidateUserId: "patient-1",
        candidateRole: "NURSING_REPRESENTATIVE",
        requiredRole: "NURSING_REPRESENTATIVE",
        patientUserId: "patient-1",
        existingWitnesses: [],
        allowSamePersonMultipleRoles: false,
      }),
    (error: unknown) => (error as { code?: string }).code === "WITNESS_SELF_WITNESSING",
  );

  assert.throws(
    () =>
      assertWitnessEligibility({
        candidateUserId: "clinician-1",
        candidateRole: "NURSING_REPRESENTATIVE",
        requiredRole: "NURSING_REPRESENTATIVE",
        clinicianUserId: "clinician-1",
        existingWitnesses: [],
        allowSamePersonMultipleRoles: false,
      }),
    (error: unknown) => (error as { code?: string }).code === "WITNESS_SELF_WITNESSING",
  );
});

test("conditional path: requirement is blocked before any witness evidence", () => {
  const decision = imcDecision({ triggers: { cannotReadOrUseJourney: true } });
  const satisfaction = evaluateWitnessSatisfaction(decision, []);
  assert.equal(satisfaction.satisfied, false);
  assert.ok(satisfaction.blockers.includes("WITNESS_REQUIRED_NOT_SATISFIED"));
  assert.equal(satisfaction.missingCount, 1);
});

// ---------------------------------------------------------------------------
// Governance / activation
// ---------------------------------------------------------------------------

test("IMC MR 1168 profile is PREVIEW_ACTIVE and requires explicit production activation", () => {
  const profile = WITNESS_POLICY_PROFILES.find((p) => p.templateCode === IMC_TEMPLATE_CODE);
  assert.ok(profile);
  assert.equal(profile.effectiveState, "PREVIEW_ACTIVE");
  assert.match(profile.governanceNote, /PREVIEW_ACTIVE/i);
  assert.match(profile.governanceNote, /clinical-governance/i);
});

test("only nursing and patient-experience operational roles are authorized witness roles", () => {
  assert.deepEqual(resolveAuthorizedWitnessRoles("nursing"), ["NURSING_REPRESENTATIVE"]);
  assert.deepEqual(resolveAuthorizedWitnessRoles("patient_experience"), [
    "PATIENT_EXPERIENCE_REPRESENTATIVE",
  ]);
  assert.deepEqual(resolveAuthorizedWitnessRoles("physician"), []);
  assert.deepEqual(resolveAuthorizedWitnessRoles("admin"), []);
});

test("preview fixture is synthetic and non-clinical", () => {
  const fixture = buildWitnessAuthLabelPreviewFixture();
  assert.equal(fixture.fixtureMarker, "TEST ONLY - PREVIEW / NON-CLINICAL EVIDENCE");
  assert.ok(fixture.routineLabel.fields.some((f) => f.value.includes("PREVIEW")));
});
