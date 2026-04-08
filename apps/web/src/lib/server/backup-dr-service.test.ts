import assert from "node:assert/strict";
import test from "node:test";

import { summarizeBackupReadiness } from "./backup-dr-service";

test("backup readiness summary tracks successful, encrypted, and restore-verified jobs", () => {
  const summary = summarizeBackupReadiness(
    [
      {
        status: "SUCCEEDED",
        encrypted: true,
        restoreVerifiedAt: new Date("2026-04-08T10:00:00.000Z").toISOString(),
        region: "saudi-arabia-riyadh",
        completedAt: new Date("2026-04-08T10:00:00.000Z").toISOString(),
      },
      {
        status: "FAILED",
        encrypted: true,
        restoreVerifiedAt: null,
        region: "saudi-arabia-riyadh",
        completedAt: null,
      },
      {
        status: "RUNNING",
        encrypted: false,
        restoreVerifiedAt: null,
        region: "saudi-arabia-riyadh",
        completedAt: null,
      },
    ],
    [{ resultStatus: "PASSED" }, { resultStatus: "FAILED" }],
  );

  assert.equal(summary.totalJobs, 3);
  assert.equal(summary.successfulJobs, 1);
  assert.equal(summary.encryptedJobs, 2);
  assert.equal(summary.restoreVerifiedJobs, 1);
  assert.equal(summary.restorePassCount, 1);
  assert.equal(summary.failedJobs, 1);
  assert.equal(summary.latestRegion, "saudi-arabia-riyadh");
});
