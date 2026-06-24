import assert from "node:assert/strict";
import test from "node:test";

import { evaluateLegalReadinessFromSnapshot } from "./legal-readiness-service";

test("legal readiness becomes compliant when all medico-legal checks are satisfied", () => {
  const report = evaluateLegalReadinessFromSnapshot({
    caseId: "case-1",
    medicalDecisionDocumented: true,
    risksExplained: true,
    refusalFormCompleted: true,
    signerCaptured: true,
    capacityVerified: true,
    witnessRequired: false,
    witnessAdded: false,
    witnessIntegrity: {
      witnessCount: 2,
      minimumWitnessesMet: true,
      identityVerified: true,
      roleCompositionValid: true,
      attestationComplete: true,
    },
    consentRecorded: true,
    auditTrailCaptured: true,
    signerIdentityVerified: true,
    supportingDocumentsAttached: true,
    financialAcknowledgmentRequired: false,
    financialAcknowledgmentCompleted: false,
    openValidationErrors: 0,
    auditChainVerified: true,
    consentCount: 1,
    documentCount: 3,
  });

  assert.equal(report.readyForLegal, true);
  assert.equal(report.status, "COMPLIANT");
  assert.equal(report.blockers.length, 0);
});

test("legal readiness blocks export when required legal evidence is missing", () => {
  const report = evaluateLegalReadinessFromSnapshot({
    caseId: "case-2",
    medicalDecisionDocumented: true,
    risksExplained: false,
    refusalFormCompleted: true,
    signerCaptured: false,
    capacityVerified: true,
    witnessRequired: true,
    witnessAdded: false,
    witnessIntegrity: {
      witnessCount: 1,
      minimumWitnessesMet: false,
      identityVerified: false,
      roleCompositionValid: false,
      attestationComplete: false,
    },
    consentRecorded: false,
    auditTrailCaptured: true,
    signerIdentityVerified: false,
    supportingDocumentsAttached: false,
    financialAcknowledgmentRequired: true,
    financialAcknowledgmentCompleted: false,
    openValidationErrors: 2,
    auditChainVerified: false,
    consentCount: 0,
    documentCount: 0,
  });

  assert.equal(report.readyForLegal, false);
  assert.ok(report.blockers.some((item) => item.includes("Minimum witnesses requirement not met")));
  assert.ok(report.blockers.some((item) => item.includes("شرح المخاطر")));
  assert.ok(report.blockers.some((item) => item.includes("consent")));
  assert.ok(report.blockers.some((item) => item.includes("validation error(s) remain open")));
});