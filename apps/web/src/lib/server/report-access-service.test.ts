import assert from "node:assert/strict";
import test from "node:test";

import { summarizeReportAccessActivity } from "./report-access-service";

test("report access summary counts exports, case-linked events, and unique viewers", () => {
  const summary = summarizeReportAccessActivity([
    {
      reportKey: "legal_package_export",
      exportFormat: "HTML",
      accessedByUserId: "user-1",
      caseId: "case-1",
    },
    {
      reportKey: "audit_chain_viewer",
      accessedByUserId: "user-1",
      caseId: "case-1",
    },
    {
      reportKey: "privacy_dashboard_view",
      accessedByUserId: "user-2",
      caseId: null,
    },
  ]);

  assert.equal(summary.totalEvents, 3);
  assert.equal(summary.exportEvents, 1);
  assert.equal(summary.caseLinkedEvents, 2);
  assert.equal(summary.uniqueUsers, 2);
  assert.equal(summary.byReportKey.legal_package_export, 1);
  assert.equal(summary.byReportKey.audit_chain_viewer, 1);
  assert.equal(summary.byReportKey.privacy_dashboard_view, 1);
});
