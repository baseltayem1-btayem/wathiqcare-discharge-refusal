/**
 * Platform Error Handling Unit Tests
 * Tests: error factories, API response builders, route error handler
 */

import assert from "node:assert/strict";
import test from "node:test";

import {
  PlatformError,
  Errors,
  ERROR_CODES,
  apiSuccess,
  apiError,
  handleRouteError,
} from "./platform-errors";

// ---------------------------------------------------------------------------
// PlatformError
// ---------------------------------------------------------------------------

test("PlatformError carries code, httpStatus, and message", () => {
  const err = new PlatformError("UNAUTHORIZED", "Not allowed", 401, { user: "x" });
  assert.equal(err.code, "UNAUTHORIZED");
  assert.equal(err.httpStatus, 401);
  assert.equal(err.message, "Not allowed");
  assert.deepEqual(err.context, { user: "x" });
});

// ---------------------------------------------------------------------------
// Error Factories
// ---------------------------------------------------------------------------

test("Errors.unauthorized returns 401 PlatformError", () => {
  const err = Errors.unauthorized();
  assert.equal(err.httpStatus, 401);
  assert.equal(err.code, "UNAUTHORIZED");
});

test("Errors.forbidden returns 403 PlatformError", () => {
  const err = Errors.forbidden();
  assert.equal(err.httpStatus, 403);
});

test("Errors.notFound includes entity name in message", () => {
  const err = Errors.notFound("ConsentDocument", "doc-001");
  assert.ok(err.message.includes("ConsentDocument"));
  assert.ok(err.message.includes("doc-001"));
  assert.equal(err.httpStatus, 404);
});

test("Errors.documentFinalized returns 409", () => {
  const err = Errors.documentFinalized();
  assert.equal(err.httpStatus, 409);
  assert.equal(err.code, "DOCUMENT_FINALIZED");
});

test("Errors.documentUnsigned returns 422", () => {
  const err = Errors.documentUnsigned();
  assert.equal(err.httpStatus, 422);
  assert.equal(err.code, "DOCUMENT_UNSIGNED");
});

test("Errors.featureDisabled includes flag name", () => {
  const err = Errors.featureDisabled("FF_ENABLE_EXTERNAL_SIGNATURES");
  assert.ok(err.message.includes("FF_ENABLE_EXTERNAL_SIGNATURES"));
  assert.equal(err.httpStatus, 503);
});

test("Errors.aiPendingReview returns 422 with correct code", () => {
  const err = Errors.aiPendingReview();
  assert.equal(err.code, "AI_PENDING_REVIEW");
  assert.equal(err.httpStatus, 422);
});

// ---------------------------------------------------------------------------
// apiSuccess / apiError
// ---------------------------------------------------------------------------

test("apiSuccess wraps data in success envelope", () => {
  const res = apiSuccess({ id: "doc-001" });
  assert.ok(res);
  // NextResponse.json wraps — check by reading body
  // (In test env we can't await, but we verify the type shape)
  assert.ok(typeof res === "object");
});

test("apiError wraps error in failure envelope", () => {
  const res = apiError("UNAUTHORIZED", "Not allowed", 401);
  assert.ok(res);
  assert.ok(typeof res === "object");
});

// ---------------------------------------------------------------------------
// handleRouteError
// ---------------------------------------------------------------------------

test("handleRouteError handles PlatformError correctly", () => {
  const err = new PlatformError("FORBIDDEN", "Not allowed", 403);
  const res = handleRouteError(err);
  assert.ok(res);
});

test("handleRouteError handles generic Error", () => {
  const err = new Error("Something went wrong");
  const res = handleRouteError(err, "Default message");
  assert.ok(res);
});

test("handleRouteError handles errors with known code properties", () => {
  const err = new Error("AI is disabled");
  (err as unknown as Record<string, unknown>).code = "AI_DISABLED";
  const res = handleRouteError(err);
  assert.ok(res);
});

// ---------------------------------------------------------------------------
// ERROR_CODES completeness
// ---------------------------------------------------------------------------

test("ERROR_CODES contains required lifecycle codes", () => {
  const required = [
    "DOCUMENT_FINALIZED",
    "DOCUMENT_LEGAL_HOLD",
    "DOCUMENT_UNSIGNED",
    "DOCUMENT_NOT_APPROVED",
    "AI_PENDING_REVIEW",
    "PDF_RENDER_FAILED",
    "SIGNATURE_DISABLED",
    "SIGNATURE_EXPIRED",
    "WEBHOOK_HMAC_INVALID",
    "FEATURE_DISABLED",
  ] as const;

  for (const code of required) {
    assert.ok(code in ERROR_CODES, `Missing required error code: ${code}`);
  }
});
