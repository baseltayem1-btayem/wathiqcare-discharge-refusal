import assert from "node:assert/strict";
import test from "node:test";

import {
  generateOtpCode,
  getBaseUrl,
  maskPhone,
  normalizePhoneNumber,
  normalizeRecipientEmail,
  otpHash,
  parseOtpPayload,
} from "./public-signing-otp-helpers";

function withEnv(values: Record<string, string | undefined>, fn: () => void) {
  const previous = new Map<string, string | undefined>();
  for (const [key, value] of Object.entries(values)) {
    previous.set(key, process.env[key]);
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
  try {
    fn();
  } finally {
    for (const [key, value] of previous.entries()) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

test("normalizePhoneNumber converts Saudi national to E.164", () => {
  assert.equal(normalizePhoneNumber("0501234567"), "+966501234567");
  assert.equal(normalizePhoneNumber("966501234567"), "+966501234567");
  assert.equal(normalizePhoneNumber("+966501234567"), "+966501234567");
  assert.equal(normalizePhoneNumber("00 966 501 234 567"), "+966501234567");
});

test("normalizeRecipientEmail lowercases and trims", () => {
  assert.equal(normalizeRecipientEmail(" Patient@Example.com "), "patient@example.com");
});

test("generateOtpCode returns a 6-digit numeric code", () => {
  const code = generateOtpCode();
  assert.equal(code.length, 6);
  assert.match(code, /^\d{6}$/);
});

test("otpHash is deterministic and uses pepper", () => {
  withEnv({ PUBLIC_SIGNING_OTP_PEPPER: "a-very-secret-pepper" }, () => {
    const h1 = otpHash("123456");
    const h2 = otpHash("123456");
    const h3 = otpHash("654321");
    assert.equal(h1, h2);
    assert.notEqual(h1, h3);
    assert.equal(h1.length, 64);
  });
});

test("maskPhone hides all but the last four digits", () => {
  assert.equal(maskPhone("+966501234567"), "*********4567");
  assert.equal(maskPhone("1234"), "****");
});

test("parseOtpPayload validates required fields", () => {
  const valid = {
    challengeId: "challenge-1",
    tokenHash: "hash-1",
    otpHash: "hash-2",
    expiresAt: new Date().toISOString(),
  };
  assert.ok(parseOtpPayload(valid));
  assert.equal(parseOtpPayload(null), null);
  assert.equal(parseOtpPayload({ challengeId: "x" }), null);
});

test("getBaseUrl hardens http to canonical in production", () => {
  withEnv(
    {
      VERCEL_ENV: "production",
      NEXT_PUBLIC_APP_BASE_URL: "http://wathiqcare.online",
    },
    () => {
      assert.equal(getBaseUrl(), "https://wathiqcare.online");
    },
  );
});

test("getBaseUrl respects configured https URL", () => {
  withEnv(
    {
      VERCEL_ENV: "production",
      NEXT_PUBLIC_APP_BASE_URL: "https://app.wathiqcare.online",
    },
    () => {
      assert.equal(getBaseUrl(), "https://app.wathiqcare.online");
    },
  );
});
