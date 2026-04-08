import assert from "node:assert/strict";
import test from "node:test";

import {
  summarizeRemediationTracker,
  upsertRemediationTracker,
} from "./remediation-tracker-service";

test("remediation tracker summary flags overdue and critical open actions", () => {
  const summary = summarizeRemediationTracker(
    [
      {
        id: "rem-1",
        actionTitle: "Close PDPL access logging gap",
        actionKey: "pdpl-access-logging",
        category: "privacy",
        severity: "critical",
        status: "OPEN",
        ownerName: "Privacy Office",
        dueAt: "2026-03-10T00:00:00.000Z",
      },
      {
        id: "rem-2",
        actionTitle: "Validate backup restore drill",
        actionKey: "backup-restore-drill",
        category: "resilience",
        severity: "standard",
        status: "COMPLETED",
        ownerName: "Infrastructure",
        dueAt: "2026-05-01T00:00:00.000Z",
        completedAt: "2026-04-01T00:00:00.000Z",
      },
    ],
    new Date("2026-04-09T00:00:00.000Z"),
  );

  assert.equal(summary.total, 2);
  assert.equal(summary.openCount, 1);
  assert.equal(summary.overdueCount, 1);
  assert.equal(summary.criticalOpenCount, 1);
  assert.ok(summary.attention.some((item) => item.code === "remediation_overdue"));
  assert.ok(summary.attention.some((item) => item.code === "remediation_critical_open"));
});

test("upserting remediation actions records closure evidence and actor", () => {
  const result = upsertRemediationTracker(
    [
      {
        id: "rem-existing",
        actionKey: "vendor-dpa-followup",
        actionTitle: "Collect missing vendor DPA",
        category: "third_party",
        severity: "high",
        status: "IN_PROGRESS",
        ownerName: "Procurement",
        dueAt: "2026-06-01T00:00:00.000Z",
        createdAt: "2026-02-01T00:00:00.000Z",
        updatedAt: "2026-02-01T00:00:00.000Z",
      },
    ],
    {
      actionKey: "training-gap-closure",
      actionTitle: "Close legal escalation training gap",
      category: "workforce",
      severity: "critical",
      status: "COMPLETED",
      ownerName: "HR Compliance",
      dueAt: "2026-05-15T00:00:00.000Z",
      evidenceLink: "evidence/training-gap-closure.pdf",
      rootCause: "Escalation drill was not scheduled during onboarding",
      notes: "Closure approved by governance committee",
    },
    { actorId: "user-12", actorRole: "ADMIN" },
    new Date("2026-04-09T10:00:00.000Z"),
  );

  assert.equal(result.items.length, 2);
  assert.equal(result.summary.openCount, 1);
  const created = result.items.find((item) => item.actionKey === "training-gap-closure");
  assert.ok(created);
  assert.equal(created?.completedBy, "user-12");
  assert.equal(created?.status, "COMPLETED");
  assert.equal(created?.severity, "critical");
});
