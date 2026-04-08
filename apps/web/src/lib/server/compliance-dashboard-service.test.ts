import assert from "node:assert/strict";
import test from "node:test";

import { summarizeComplianceDashboard } from "./compliance-dashboard-service";

test("compliance dashboard summary tracks legal readiness and consent gaps", () => {
  const summary = summarizeComplianceDashboard({
    cases: [
      {
        id: "case-1",
        caseNumber: "DR-001",
        patientName: "Patient One",
        signer: "Patient One",
        legalReady: true,
        consentRecorded: true,
        auditChainVerified: true,
        pdplEventCount: 3,
        openValidationErrors: 0,
      },
      {
        id: "case-2",
        caseNumber: "DR-002",
        patientName: "Patient Two",
        signer: null,
        legalReady: false,
        consentRecorded: false,
        auditChainVerified: false,
        pdplEventCount: 1,
        openValidationErrors: 2,
      },
    ],
    operational: {
      overdueIncidents: 1,
      failedBackups: 0,
      overdueDsrs: 2,
      deniedPrivilegedAccess: 1,
      reportExportEvents: 4,
    },
  });

  assert.equal(summary.totals.cases, 2);
  assert.equal(summary.totals.cbahiCompliant, 1);
  assert.equal(summary.totals.jciCompliant, 1);
  assert.equal(summary.totals.missingConsents, 1);
  assert.equal(summary.rates.cbahi, 50);
  assert.equal(summary.rates.jci, 50);
  assert.equal(summary.tables.blockedCases.length, 1);
  assert.ok(summary.attention.some((item) => item.code === "overdue_incidents"));
});

test("compliance dashboard control posture becomes critical when resilience and privacy signals degrade", () => {
  const summary = summarizeComplianceDashboard({
    cases: [
      {
        id: "case-9",
        caseNumber: "DR-009",
        patientName: "Patient Nine",
        signer: null,
        legalReady: false,
        consentRecorded: false,
        auditChainVerified: false,
        pdplEventCount: 0,
        openValidationErrors: 4,
      },
    ],
    operational: {
      overdueIncidents: 3,
      failedBackups: 2,
      overdueDsrs: 3,
      deniedPrivilegedAccess: 5,
      reportExportEvents: 1,
      thirdPartyOverdueReviews: 2,
      thirdPartyCrossBorderFlags: 1,
      overduePolicyAttestations: 2,
      openPolicyExceptions: 1,
      overdueTraining: 2,
      criticalTrainingGaps: 1,
      overdueRemediations: 2,
      criticalOpenRemediations: 1,
    },
  });

  assert.equal(summary.controls.securityResponse.status, "critical");
  assert.equal(summary.controls.resilience.status, "critical");
  assert.equal(summary.controls.privacyGovernance.status, "critical");
  assert.equal(summary.controls.thirdPartyRisk.status, "critical");
  assert.equal(summary.controls.policyGovernance.status, "critical");
  assert.equal(summary.controls.workforceReadiness.status, "critical");
  assert.equal(summary.controls.remediationActions.status, "critical");
  assert.ok(summary.attention.some((item) => item.code === "failed_backups"));
  assert.ok(summary.attention.some((item) => item.code === "overdue_dsrs"));
  assert.ok(summary.attention.some((item) => item.code === "third_party_overdue_reviews"));
  assert.ok(summary.attention.some((item) => item.code === "policy_attestations_overdue"));
  assert.ok(summary.attention.some((item) => item.code === "training_overdue"));
  assert.ok(summary.attention.some((item) => item.code === "remediation_overdue"));
});
