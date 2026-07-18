import assert from "node:assert/strict";
import test from "node:test";

import { buildFinalPdfState } from "./public-signing-signature-service";

test("buildFinalPdfState is pending when signer has not completed the workflow", () => {
  const state = buildFinalPdfState("token-123", {
    signerCompletesWorkflow: false,
    hasPhysicianSignature: false,
  });

  assert.equal(state.status, "pending");
  assert.ok(state.viewUrl.includes("token-123"));
  assert.ok(state.downloadUrl.includes("token-123"));
  assert.ok(state.error);
});

test("buildFinalPdfState reports patient copy available when awaiting physician countersignature", () => {
  const state = buildFinalPdfState("token-456", {
    signerCompletesWorkflow: true,
    hasPhysicianSignature: false,
  });

  assert.equal(state.status, "patient_copy_available");
  assert.ok(state.viewUrl.includes("token-456"));
  assert.ok(state.error?.toLowerCase().includes("physician"));
});

test("buildFinalPdfState reports finalization pending when all signatures are captured", () => {
  const state = buildFinalPdfState("token-789", {
    signerCompletesWorkflow: true,
    hasPhysicianSignature: true,
  });

  assert.equal(state.status, "finalization_pending");
  assert.ok(state.viewUrl.includes("token-789"));
  assert.ok(state.error?.toLowerCase().includes("final pdf"));
});
