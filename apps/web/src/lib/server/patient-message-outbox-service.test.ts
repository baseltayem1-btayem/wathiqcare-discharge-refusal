import assert from "node:assert/strict";
import test from "node:test";

import {
  isPermanentError,
  sanitizeErrorMessage,
} from "./patient-message-outbox-service";

test("sanitizeErrorMessage redacts signing tokens from error text", () => {
  const raw =
    "Failed to deliver v1:eyJ0ZW5hbnRJZCI6InRlbmFudC0xIn0:abc123def456 to +966501234567";
  const sanitized = sanitizeErrorMessage(raw);
  assert.ok(!sanitized?.includes("v1:"));
  assert.ok(sanitized?.includes("[REDACTED_TOKEN]"));
  assert.ok(sanitized?.includes("[REDACTED_RECIPIENT]"));
});

test("sanitizeErrorMessage redacts URLs and emails", () => {
  const raw =
    "Callback failed for https://wathiqcare.online/sign/secret contact admin@wathiqcare.online";
  const sanitized = sanitizeErrorMessage(raw);
  assert.ok(sanitized?.includes("[REDACTED_URL]"));
  assert.ok(sanitized?.includes("[REDACTED_EMAIL]"));
});

test("isPermanentError recognizes authentication and bad-request codes", () => {
  assert.equal(isPermanentError("authentication_failed", ""), true);
  assert.equal(isPermanentError("", "invalid_recipient"), true);
  assert.equal(isPermanentError("bad_request", "Malformed payload"), true);
});

test("isPermanentError treats transient codes as retryable", () => {
  assert.equal(isPermanentError("timeout", "Gateway timeout"), false);
  assert.equal(isPermanentError("", ""), false);
});
