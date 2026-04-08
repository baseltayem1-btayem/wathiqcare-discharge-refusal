import assert from "node:assert/strict";
import test from "node:test";

import {
  summarizePolicyAttestations,
  upsertPolicyAttestationRegister,
} from "./policy-attestation-service";

test("policy attestation summary flags overdue reviews and open exceptions", () => {
  const summary = summarizePolicyAttestations(
    [
      {
        id: "policy-1",
        policyKey: "pdpl-governance",
        policyName: "PDPL Governance Charter",
        framework: "PDPL",
        ownerName: "Privacy Office",
        criticality: "critical",
        status: "EXCEPTION",
        nextReviewDueAt: "2026-03-01T00:00:00.000Z",
        exceptionReason: "Board review deferred",
        exceptionExpiresAt: "2026-05-01T00:00:00.000Z",
      },
      {
        id: "policy-2",
        policyKey: "cbahi-discharge-policy",
        policyName: "CBAHI Discharge Documentation Policy",
        framework: "CBAHI",
        ownerName: "Quality Department",
        criticality: "standard",
        status: "ATTESTED",
        nextReviewDueAt: "2026-12-01T00:00:00.000Z",
      },
    ],
    new Date("2026-04-08T00:00:00.000Z"),
  );

  assert.equal(summary.total, 2);
  assert.equal(summary.overdueAttestations, 1);
  assert.equal(summary.openExceptions, 1);
  assert.equal(summary.criticalFindings, 1);
  assert.ok(summary.attention.some((item) => item.code === "policy_attestations_overdue"));
  assert.ok(summary.attention.some((item) => item.code === "policy_exceptions_open"));
});

test("upserting the policy register records attestation evidence and actor", () => {
  const result = upsertPolicyAttestationRegister(
    [
      {
        id: "policy-existing",
        policyKey: "security-baseline",
        policyName: "Security Baseline Standard",
        framework: "ISO27001",
        ownerName: "Security Team",
        criticality: "high",
        status: "ATTESTED",
        reviewFrequencyDays: 365,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ],
    {
      policyKey: "legal-case-escalation",
      policyName: "Legal Case Escalation Procedure",
      framework: "Medico-Legal",
      ownerName: "Legal Affairs",
      criticality: "critical",
      status: "ATTESTED",
      reviewFrequencyDays: 180,
      evidenceLink: "minutes/2026-q2-review.pdf",
      notes: "Approved by compliance committee",
    },
    { actorId: "user-9", actorRole: "ADMIN" },
    new Date("2026-04-08T09:30:00.000Z"),
  );

  assert.equal(result.items.length, 2);
  assert.equal(result.summary.attestedCount, 2);
  const created = result.items.find((item) => item.policyKey === "legal-case-escalation");
  assert.ok(created);
  assert.equal(created?.attestedBy, "user-9");
  assert.equal(created?.status, "ATTESTED");
  assert.equal(created?.criticality, "critical");
});
