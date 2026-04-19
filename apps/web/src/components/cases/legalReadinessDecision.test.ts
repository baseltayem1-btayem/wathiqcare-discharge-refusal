import assert from "node:assert/strict";
import test from "node:test";
import { getLegalReadinessDecisionIndicator } from "@/components/cases/legalReadinessDecision";

test("legal readiness patient decision indicator maps accepted, refused, and missing states", () => {
  const accepted = getLegalReadinessDecisionIndicator("accepted");
  const refused = getLegalReadinessDecisionIndicator("refused");
  const missing = getLegalReadinessDecisionIndicator(null);

  assert.equal(accepted.label, "Accepted");
  assert.equal(accepted.badgeVariant, "success");
  assert.equal(accepted.followUpText, "Discharge completion path.");

  assert.equal(refused.label, "Refused");
  assert.equal(refused.badgeVariant, "destructive");
  assert.equal(refused.followUpText, "Legal follow-up required.");

  assert.equal(missing.label, "Not Recorded");
  assert.equal(missing.badgeVariant, "warning");
});

test("legal readiness patient decision indicator supports Arabic labels", () => {
  const refused = getLegalReadinessDecisionIndicator("refused", "ar");
  const missing = getLegalReadinessDecisionIndicator(null, "ar");

  assert.equal(refused.label, "رفض");
  assert.equal(refused.followUpText, "يلزم متابعة قانونية.");
  assert.equal(missing.label, "غير مسجل");
});
