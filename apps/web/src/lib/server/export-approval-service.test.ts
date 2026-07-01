process.env.WATHIQ_STEP_UP_SECRET ||= "test-step-up-secret-32chars-long!!";

import assert from "node:assert/strict";
import test from "node:test";

import {
  isExportApprovalSatisfied,
  summarizeExportApprovalRequests,
} from "./export-approval-service";

test("export approval summary resolves pending, approved, and rejected states", () => {
  const now = new Date("2026-04-08T12:00:00.000Z").toISOString();
  const later = new Date("2026-04-08T12:10:00.000Z").toISOString();

  const summary = summarizeExportApprovalRequests([
    {
      id: "log-2",
      reportKey: "export_approval_decision",
      accessedByUserId: "legal-1",
      accessedByRole: "legal_admin",
      accessedAt: later,
      metadataJson: {
        approvalRequestId: "approval-1",
        decision: "APPROVED",
        note: "Approved for board reporting",
      },
    },
    {
      id: "log-1",
      reportKey: "export_approval_request",
      accessedByUserId: "user-1",
      accessedByRole: "compliance",
      accessedAt: now,
      metadataJson: {
        approvalRequestId: "approval-1",
        targetKey: "compliance_dashboard",
        caseId: null,
        exportFormat: "CSV",
        reason: "Monthly governance review",
        status: "PENDING",
      },
    },
  ]);

  assert.equal(summary.length, 1);
  assert.equal(summary[0]?.status, "APPROVED");
  assert.equal(summary[0]?.targetKey, "compliance_dashboard");
  assert.equal(summary[0]?.approverRole, "legal_admin");
});

test("export approval validation requires a matching approved request", () => {
  const approvals = [
    {
      approvalRequestId: "approval-2",
      targetKey: "refusal_quality_report",
      caseId: "case-77",
      exportFormat: "CSV",
      requestedByUserId: "user-2",
      requestedByRole: "tenant_admin",
      requestedAt: "2026-04-08T08:00:00.000Z",
      reason: "Quarterly audit",
      status: "APPROVED" as const,
      approverUserId: "legal-2",
      approverRole: "legal_admin",
      decidedAt: "2026-04-08T08:05:00.000Z",
      note: "Approved",
    },
  ];

  assert.equal(
    isExportApprovalSatisfied({
      approvals,
      approvalRequestId: "approval-2",
      targetKey: "refusal_quality_report",
      caseId: "case-77",
      exportFormat: "CSV",
      now: new Date("2026-04-08T10:00:00.000Z"),
    }),
    true,
  );

  assert.equal(
    isExportApprovalSatisfied({
      approvals,
      approvalRequestId: "approval-2",
      targetKey: "compliance_dashboard",
      caseId: null,
      exportFormat: "CSV",
    }),
    false,
  );
});
