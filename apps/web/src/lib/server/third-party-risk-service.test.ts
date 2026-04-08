import assert from "node:assert/strict";
import test from "node:test";

import {
  summarizeThirdPartyRisk,
  upsertThirdPartyRiskRegister,
} from "./third-party-risk-service";

test("third-party risk summary flags overdue and cross-border processors", () => {
  const summary = summarizeThirdPartyRisk(
    [
      {
        id: "processor-1",
        processorName: "Overseas Analytics",
        serviceType: "analytics",
        hostingRegion: "eu-west-1",
        residencyScope: "CONTROLLED_EXPORT",
        crossBorderTransfer: true,
        transferMechanism: "Controller approval pending",
        contractInPlace: false,
        securityReviewCompleted: false,
        containsPatientData: true,
        riskTier: "critical",
        status: "PENDING_REVIEW",
        lastReviewAt: "2026-01-01T00:00:00.000Z",
        nextReviewDueAt: "2026-03-01T00:00:00.000Z",
      },
      {
        id: "processor-2",
        processorName: "Riyadh Archive",
        serviceType: "backup",
        hostingRegion: "saudi-arabia-riyadh",
        residencyScope: "KSA_ONLY",
        crossBorderTransfer: false,
        transferMechanism: "Not required",
        contractInPlace: true,
        securityReviewCompleted: true,
        containsPatientData: true,
        riskTier: "low",
        status: "APPROVED",
        lastReviewAt: "2026-03-15T00:00:00.000Z",
        nextReviewDueAt: "2026-12-15T00:00:00.000Z",
      },
    ],
    new Date("2026-04-08T00:00:00.000Z"),
  );

  assert.equal(summary.total, 2);
  assert.equal(summary.overdueReviews, 1);
  assert.equal(summary.crossBorderFlags, 1);
  assert.equal(summary.highRiskCount, 1);
  assert.ok(summary.attention.some((item) => item.code === "third_party_overdue_reviews"));
  assert.ok(summary.attention.some((item) => item.code === "third_party_cross_border"));
});

test("upserting the third-party register normalizes approval evidence", () => {
  const result = upsertThirdPartyRiskRegister(
    [
      {
        id: "processor-legacy",
        processorName: "Existing Processor",
        serviceType: "storage",
        hostingRegion: "saudi-arabia-riyadh",
        residencyScope: "KSA_ONLY",
        crossBorderTransfer: false,
        contractInPlace: true,
        securityReviewCompleted: true,
        containsPatientData: false,
        riskTier: "medium",
        status: "APPROVED",
        createdAt: "2026-02-01T00:00:00.000Z",
        updatedAt: "2026-02-01T00:00:00.000Z",
      },
    ],
    {
      processorName: "GCC eSignature Gateway",
      serviceType: "signature",
      hostingRegion: "gcc-hub",
      residencyScope: "CONTROLLED_EXPORT",
      crossBorderTransfer: true,
      transferMechanism: "Contractual clauses + DPO approval",
      contractInPlace: true,
      securityReviewCompleted: true,
      containsPatientData: true,
      riskTier: "high",
      status: "APPROVED",
      ownerName: "Legal Affairs",
      notes: "Approved after privacy and security review",
    },
    { actorId: "user-7", actorRole: "ADMIN" },
    new Date("2026-04-08T10:00:00.000Z"),
  );

  assert.equal(result.items.length, 2);
  assert.equal(result.summary.approvedCount, 2);
  const created = result.items.find((item) => item.processorName === "GCC eSignature Gateway");
  assert.ok(created);
  assert.equal(created?.approvedBy, "user-7");
  assert.equal(created?.status, "APPROVED");
  assert.equal(created?.crossBorderTransfer, true);
});
