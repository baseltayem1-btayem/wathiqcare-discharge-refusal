import assert from "node:assert/strict";
import test from "node:test";

import { calculateRetentionDueDate } from "./retention-service";

test("retention due date adds the configured number of years", () => {
  const dueDate = calculateRetentionDueDate("2026-04-08T00:00:00.000Z", 10);
  assert.equal(dueDate.toISOString(), "2036-04-08T00:00:00.000Z");
});