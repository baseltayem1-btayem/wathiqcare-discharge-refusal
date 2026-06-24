import assert from "node:assert/strict";
import test from "node:test";

import { deriveSecureSigningBadgeFlags } from "./module-secure-signing-service";

test("OTP expiry/token expiry sets expired status", () => {
  const flags = deriveSecureSigningBadgeFlags({
    tokenFound: true,
    tokenExpired: true,
    tokenUsed: false,
    tokenRevoked: false,
    otpRequestedCount: 1,
    otpVerifiedCount: 0,
    otpFailedCount: 0,
    smsSent: true,
    smsFailed: false,
  });

  assert.equal(flags.expired, true);
  assert.equal(flags.otpRequested, true);
  assert.equal(flags.otpVerified, false);
});

test("retry lockout marks failed after max OTP failures", () => {
  const flags = deriveSecureSigningBadgeFlags({
    tokenFound: true,
    tokenExpired: false,
    tokenUsed: false,
    tokenRevoked: false,
    otpRequestedCount: 1,
    otpVerifiedCount: 0,
    otpFailedCount: 3,
    smsSent: true,
    smsFailed: false,
  });

  assert.equal(flags.failed, true);
  assert.equal(flags.failedAttempts, 3);
});

test("token single-use marks signed when token used", () => {
  const flags = deriveSecureSigningBadgeFlags({
    tokenFound: true,
    tokenExpired: false,
    tokenUsed: true,
    tokenRevoked: false,
    otpRequestedCount: 1,
    otpVerifiedCount: 1,
    otpFailedCount: 0,
    smsSent: true,
    smsFailed: false,
  });

  assert.equal(flags.signed, true);
  assert.equal(flags.otpVerified, true);
});

test("invalid token keeps linkCreated false", () => {
  const flags = deriveSecureSigningBadgeFlags({
    tokenFound: false,
    tokenExpired: false,
    tokenUsed: false,
    tokenRevoked: false,
    otpRequestedCount: 0,
    otpVerifiedCount: 0,
    otpFailedCount: 0,
    smsSent: false,
    smsFailed: false,
  });

  assert.equal(flags.linkCreated, false);
  assert.equal(flags.opened, false);
});

test("SMS failure marks failed badge", () => {
  const flags = deriveSecureSigningBadgeFlags({
    tokenFound: true,
    tokenExpired: false,
    tokenUsed: false,
    tokenRevoked: false,
    otpRequestedCount: 0,
    otpVerifiedCount: 0,
    otpFailedCount: 0,
    smsSent: false,
    smsFailed: true,
  });

  assert.equal(flags.smsSent, false);
  assert.equal(flags.failed, true);
});

test("audit-visible OTP progression updates opened/requested/verified", () => {
  const flags = deriveSecureSigningBadgeFlags({
    tokenFound: true,
    tokenExpired: false,
    tokenUsed: false,
    tokenRevoked: false,
    otpRequestedCount: 2,
    otpVerifiedCount: 1,
    otpFailedCount: 1,
    smsSent: true,
    smsFailed: false,
  });

  assert.equal(flags.opened, true);
  assert.equal(flags.otpRequested, true);
  assert.equal(flags.otpVerified, true);
  assert.equal(flags.failed, false);
});