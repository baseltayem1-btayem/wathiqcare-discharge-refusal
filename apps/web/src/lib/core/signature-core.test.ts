/**
 * Signature Core Unit Tests
 * Tests: token generation, URL building, expiry, HMAC verification, error classes
 */

import assert from "node:assert/strict";
import test from "node:test";
import crypto from "node:crypto";

import {
  generateSecureSigningToken,
  buildSigningUrl,
  computeSigningExpiry,
  verifyWebhookSignature,
  SignatureDisabledError,
  SignatureProviderError,
  SignatureExpiredError,
} from "./signature-core";

// ---------------------------------------------------------------------------
// generateSecureSigningToken
// ---------------------------------------------------------------------------

test("generateSecureSigningToken produces 43+ char URL-safe base64 string", () => {
  const token = generateSecureSigningToken();
  assert.equal(typeof token, "string");
  assert.ok(token.length >= 43, "32 bytes base64url should be at least 43 chars");
  assert.ok(!/[+/=]/.test(token), "Token must be URL-safe (no +, /, =)");
});

test("generateSecureSigningToken produces unique tokens", () => {
  const tokens = new Set(Array.from({ length: 100 }, generateSecureSigningToken));
  assert.equal(tokens.size, 100, "All 100 tokens must be unique");
});

// ---------------------------------------------------------------------------
// buildSigningUrl
// ---------------------------------------------------------------------------

test("buildSigningUrl constructs correct URL with base", () => {
  const token = "abc123def";
  const url = buildSigningUrl(token, "https://wathiqcare.online");
  assert.equal(url, "https://wathiqcare.online/sign/abc123def");
});

test("buildSigningUrl URL-encodes token with special chars", () => {
  const token = "abc+def/xyz=";
  const url = buildSigningUrl(token, "https://example.com");
  assert.ok(!url.includes("+") || url.includes("%2B"), "Must encode + in token");
});

// ---------------------------------------------------------------------------
// computeSigningExpiry
// ---------------------------------------------------------------------------

test("computeSigningExpiry returns date in the future", () => {
  const expiry = computeSigningExpiry(24);
  assert.ok(expiry > new Date(), "Expiry must be in the future");
});

test("computeSigningExpiry respects hours parameter", () => {
  const now = Date.now();
  const expiry = computeSigningExpiry(48);
  const diffHours = (expiry.getTime() - now) / 3600_000;
  assert.ok(diffHours >= 47.9 && diffHours <= 48.1, "Expiry must be ~48 hours from now");
});

// ---------------------------------------------------------------------------
// verifyWebhookSignature
// ---------------------------------------------------------------------------

test("verifyWebhookSignature accepts valid HMAC", () => {
  const secret = "test-webhook-secret-32chars-long!!";
  process.env.SIGNING_WEBHOOK_SECRET = secret;

  const body = JSON.stringify({ event: "session.completed", sessionId: "sess-001" });
  const hmac = crypto.createHmac("sha256", secret).update(body, "utf8").digest("hex");

  const valid = verifyWebhookSignature(body, hmac);
  assert.equal(valid, true, "Valid HMAC must pass verification");
});

test("verifyWebhookSignature rejects tampered body", () => {
  const secret = "test-webhook-secret-32chars-long!!";
  process.env.SIGNING_WEBHOOK_SECRET = secret;

  const body = JSON.stringify({ event: "session.completed" });
  const hmac = crypto.createHmac("sha256", secret).update(body, "utf8").digest("hex");
  const tamperedBody = JSON.stringify({ event: "session.completed", injected: true });

  const valid = verifyWebhookSignature(tamperedBody, hmac);
  assert.equal(valid, false, "Tampered body must fail HMAC verification");
});

test("verifyWebhookSignature accepts sha256= prefixed HMAC", () => {
  const secret = "test-webhook-secret-32chars-long!!";
  process.env.SIGNING_WEBHOOK_SECRET = secret;

  const body = "test-body";
  const rawHmac = crypto.createHmac("sha256", secret).update(body, "utf8").digest("hex");
  const prefixedHmac = `sha256=${rawHmac}`;

  const valid = verifyWebhookSignature(body, prefixedHmac);
  assert.equal(valid, true, "sha256= prefixed HMAC must be accepted");
});

// ---------------------------------------------------------------------------
// Error Classes
// ---------------------------------------------------------------------------

test("SignatureDisabledError has correct code", () => {
  const err = new SignatureDisabledError("disabled");
  assert.equal(err.code, "SIGNATURE_DISABLED");
  assert.ok(err instanceof Error);
});

test("SignatureProviderError has correct code", () => {
  const err = new SignatureProviderError("provider failed");
  assert.equal(err.code, "SIGNATURE_PROVIDER_FAILED");
});

test("SignatureExpiredError has correct code", () => {
  const err = new SignatureExpiredError("expired");
  assert.equal(err.code, "SIGNATURE_EXPIRED");
});
