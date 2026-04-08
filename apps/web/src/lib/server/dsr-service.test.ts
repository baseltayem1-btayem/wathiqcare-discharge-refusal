import assert from "node:assert/strict";
import test from "node:test";

import { calculateDsrDueDates, deriveDsrSlaState, summarizeDsrRequests } from "./dsr-service";

test("DSR due dates default to 30 days with a 60 day extension ceiling", () => {
  const requestedAt = new Date("2026-04-08T00:00:00.000Z");
  const dueDates = calculateDsrDueDates(requestedAt);

  assert.equal(dueDates.defaultDueAt.toISOString(), "2026-05-08T00:00:00.000Z");
  assert.equal(dueDates.maxExtendedDueAt.toISOString(), "2026-06-07T00:00:00.000Z");
});

test("DSR SLA state warns near due date and breaches after expiry", () => {
  const warningState = deriveDsrSlaState({
    status: "REQUESTED",
    dueAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
  });
  const breachedState = deriveDsrSlaState({
    status: "LEGAL_REVIEW",
    dueAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  });

  assert.equal(warningState, "warning");
  assert.equal(breachedState, "breached");
});

test("DSR summary groups requests by status and SLA state", () => {
  const summary = summarizeDsrRequests([
    {
      status: "REQUESTED",
      dueAt: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      status: "LEGAL_REVIEW",
      dueAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      status: "CLOSED",
      dueAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    },
  ]);

  assert.equal(summary.total, 3);
  assert.equal(summary.openCount, 2);
  assert.equal(summary.byStatus.REQUESTED, 1);
  assert.equal(summary.byStatus.LEGAL_REVIEW, 1);
  assert.equal(summary.byStatus.CLOSED, 1);
  assert.equal(summary.bySlaState.on_track, 1);
  assert.equal(summary.bySlaState.warning, 1);
  assert.equal(summary.bySlaState.closed, 1);
});