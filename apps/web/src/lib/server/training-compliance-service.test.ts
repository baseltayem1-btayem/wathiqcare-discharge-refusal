import assert from "node:assert/strict";
import test from "node:test";

import {
  summarizeTrainingCompliance,
  upsertTrainingComplianceRegister,
} from "./training-compliance-service";

test("training compliance summary flags overdue and critical readiness gaps", () => {
  const summary = summarizeTrainingCompliance(
    [
      {
        id: "training-1",
        moduleKey: "pdpl-awareness",
        moduleName: "PDPL Awareness",
        targetRole: "all_staff",
        ownerName: "Privacy Office",
        criticality: "critical",
        status: "NOT_STARTED",
        mandatory: true,
        dueAt: "2026-03-01T00:00:00.000Z",
      },
      {
        id: "training-2",
        moduleKey: "legal-escalation-drills",
        moduleName: "Legal Escalation Drill",
        targetRole: "legal_admin",
        ownerName: "Legal Affairs",
        criticality: "high",
        status: "COMPLETED",
        mandatory: true,
        dueAt: "2026-12-01T00:00:00.000Z",
        completedAt: "2026-04-01T00:00:00.000Z",
      },
    ],
    new Date("2026-04-09T00:00:00.000Z"),
  );

  assert.equal(summary.total, 2);
  assert.equal(summary.completedCount, 1);
  assert.equal(summary.overdueCount, 1);
  assert.equal(summary.criticalGapCount, 1);
  assert.ok(summary.attention.some((item) => item.code === "training_overdue"));
  assert.ok(summary.attention.some((item) => item.code === "training_critical_gap"));
});

test("upserting the training register records completion evidence", () => {
  const result = upsertTrainingComplianceRegister(
    [
      {
        id: "training-existing",
        moduleKey: "cbahi-documentation",
        moduleName: "CBAHI Documentation Standard",
        targetRole: "nursing",
        ownerName: "Quality Department",
        criticality: "standard",
        status: "IN_PROGRESS",
        mandatory: true,
        dueAt: "2026-07-01T00:00:00.000Z",
        createdAt: "2026-02-01T00:00:00.000Z",
        updatedAt: "2026-02-01T00:00:00.000Z",
      },
    ],
    {
      moduleKey: "pdpl-incident-response",
      moduleName: "PDPL Incident Response",
      targetRole: "security_team",
      ownerName: "Security Team",
      criticality: "critical",
      status: "COMPLETED",
      mandatory: true,
      dueAt: "2026-06-01T00:00:00.000Z",
      evidenceLink: "certificates/pdpl-incident-response.pdf",
      notes: "Quarterly tabletop drill completed",
    },
    { actorId: "user-11", actorRole: "ADMIN" },
    new Date("2026-04-09T10:00:00.000Z"),
  );

  assert.equal(result.items.length, 2);
  assert.equal(result.summary.completedCount, 1);
  const created = result.items.find((item) => item.moduleKey === "pdpl-incident-response");
  assert.ok(created);
  assert.equal(created?.completedBy, "user-11");
  assert.equal(created?.status, "COMPLETED");
  assert.equal(created?.mandatory, true);
});
