import assert from "node:assert/strict";
import test from "node:test";

import { buildIncidentSla, summarizeSecurityIncidents } from "./incident-response-service";

test("incident SLA deadlines follow the expected severity windows", () => {
  const detectedAt = new Date("2026-04-08T00:00:00.000Z");
  const critical = buildIncidentSla("CRITICAL" as never, detectedAt);
  const low = buildIncidentSla("LOW" as never, detectedAt);

  assert.equal(critical.internalEscalationDueAt.toISOString(), "2026-04-08T01:00:00.000Z");
  assert.equal(critical.clientNotificationDueAt.toISOString(), "2026-04-10T00:00:00.000Z");
  assert.equal(critical.regulatorNotificationDueAt?.toISOString(), "2026-04-11T00:00:00.000Z");
  assert.equal(low.regulatorNotificationDueAt, null);
});

test("incident summary counts open incidents and overdue notifications", () => {
  const summary = summarizeSecurityIncidents([
    {
      severity: "CRITICAL",
      status: "DETECTED",
      clientNotificationDueAt: new Date(Date.now() - 60_000).toISOString(),
      regulatorNotificationDueAt: new Date(Date.now() + 60_000).toISOString(),
    },
    {
      severity: "MEDIUM",
      status: "CONTAINED",
      clientNotificationDueAt: new Date(Date.now() + 60_000).toISOString(),
      regulatorNotificationDueAt: null,
    },
    {
      severity: "LOW",
      status: "RESOLVED",
      clientNotificationDueAt: new Date(Date.now() - 60_000).toISOString(),
      regulatorNotificationDueAt: null,
    },
  ]);

  assert.equal(summary.total, 3);
  assert.equal(summary.openCount, 2);
  assert.equal(summary.overdueNotificationCount, 1);
  assert.equal(summary.bySeverity.CRITICAL, 1);
  assert.equal(summary.byStatus.RESOLVED, 1);
});
