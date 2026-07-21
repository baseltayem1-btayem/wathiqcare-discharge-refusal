import assert from "node:assert/strict";
import test from "node:test";
import {
  evaluateAllowlistedRecipient,
  isAllowlistedRecipient,
  normalizePhoneNumber,
  normalizeRecipientEmail,
} from "./workspace-consent-helpers";

function withEnv(overrides: Record<string, string | undefined>, fn: () => void) {
  const previous: Record<string, string | undefined> = {};
  for (const key of Object.keys(overrides)) {
    previous[key] = process.env[key];
    if (overrides[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = overrides[key];
    }
  }
  try {
    fn();
  } finally {
    for (const key of Object.keys(overrides)) {
      if (previous[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = previous[key];
      }
    }
  }
}

test("normalizePhoneNumber handles Saudi mobile formats", () => {
  assert.equal(normalizePhoneNumber("0501234567"), "+966501234567");
  assert.equal(normalizePhoneNumber("966501234567"), "+966501234567");
  assert.equal(normalizePhoneNumber("+966501234567"), "+966501234567");
});

test("normalizePhoneNumber ignores separators", () => {
  assert.equal(normalizePhoneNumber("+966 50 123 4567"), "+966501234567");
  assert.equal(normalizePhoneNumber("050-123-4567"), "+966501234567");
  assert.equal(normalizePhoneNumber("(966) 501 234 567"), "+966501234567");
});

test("normalizePhoneNumber preserves other international numbers", () => {
  assert.equal(normalizePhoneNumber("+14155552671"), "+14155552671");
  assert.equal(normalizePhoneNumber("004915112345678"), "+4915112345678");
});

test("normalizeRecipientEmail trims and lowercases", () => {
  assert.equal(normalizeRecipientEmail("  Patient@Example.COM  "), "patient@example.com");
});

test("evaluateAllowlistedRecipient returns disabled reason when pilot is off", () => {
  withEnv(
    {
      FF_PATIENT_FACING_PILOT_SEND: undefined,
      PILOT_PATIENT_SEND_ALLOWLIST_MOBILE: "+966501234567",
      PILOT_PATIENT_SEND_ALLOWLIST_EMAIL: "",
    },
    () => {
      const result = evaluateAllowlistedRecipient("+966501234567", "patient@example.com");
      assert.equal(result.allowlisted, false);
      assert.equal(result.pilotEnabled, false);
      assert.equal(result.reason, "Patient-facing pilot send is disabled.");
    },
  );
});

test("evaluateAllowlistedRecipient allowlists by normalized mobile", () => {
  withEnv(
    {
      FF_PATIENT_FACING_PILOT_SEND: "true",
      PILOT_PATIENT_SEND_ALLOWLIST_MOBILE: "+966501234567",
      PILOT_PATIENT_SEND_ALLOWLIST_EMAIL: "",
    },
    () => {
      const result = evaluateAllowlistedRecipient("0501234567", "patient@example.com");
      assert.equal(result.allowlisted, true);
      assert.equal(result.mobileAllowed, true);
      assert.equal(result.emailAllowed, false);
      assert.equal(result.reason, "Recipient is approved for pilot send.");
    },
  );
});

test("evaluateAllowlistedRecipient allowlists by normalized email", () => {
  withEnv(
    {
      FF_PATIENT_FACING_PILOT_SEND: "true",
      PILOT_PATIENT_SEND_ALLOWLIST_MOBILE: "",
      PILOT_PATIENT_SEND_ALLOWLIST_EMAIL: "patient@example.com",
    },
    () => {
      const result = evaluateAllowlistedRecipient("+966501234567", "  PATIENT@EXAMPLE.COM  ");
      assert.equal(result.allowlisted, true);
      assert.equal(result.mobileAllowed, false);
      assert.equal(result.emailAllowed, true);
      assert.equal(result.reason, "Recipient is approved for pilot send.");
    },
  );
});

test("evaluateAllowlistedRecipient blocks unknown recipients", () => {
  withEnv(
    {
      FF_PATIENT_FACING_PILOT_SEND: "true",
      PILOT_PATIENT_SEND_ALLOWLIST_MOBILE: "+966501234567",
      PILOT_PATIENT_SEND_ALLOWLIST_EMAIL: "patient@example.com",
    },
    () => {
      const result = evaluateAllowlistedRecipient("+966509999999", "other@example.com");
      assert.equal(result.allowlisted, false);
      assert.equal(result.mobileAllowed, false);
      assert.equal(result.emailAllowed, false);
      assert.equal(result.reason, "Recipient is not in the pilot allowlist.");
    },
  );
});

test("evaluateAllowlistedRecipient reports missing configuration precisely", () => {
  withEnv(
    {
      FF_PATIENT_FACING_PILOT_SEND: "true",
      PILOT_PATIENT_SEND_ALLOWLIST_MOBILE: "",
      PILOT_PATIENT_SEND_ALLOWLIST_EMAIL: "",
    },
    () => {
      const result = evaluateAllowlistedRecipient("+966501234567", "patient@example.com");
      assert.equal(result.allowlisted, false);
      assert.equal(result.configMissing, true);
      assert.ok(result.reason.includes("Pilot allowlist configuration is missing for this environment."));
      assert.ok(result.reason.includes("FF_PATIENT_FACING_PILOT_SEND"));
      assert.ok(result.reason.includes("PILOT_PATIENT_SEND_ALLOWLIST_MOBILE"));
      assert.ok(result.reason.includes("PILOT_PATIENT_SEND_ALLOWLIST_EMAIL"));
    },
  );
});

test("hardcoded preview pilot patients are not used as an allowlist bypass", () => {
  // These values match the static imcPilotPatients list and preview pilot patients are enabled,
  // but no env allowlist is configured, so the result must be configuration-missing.
  withEnv(
    {
      FF_PATIENT_FACING_PILOT_SEND: undefined,
      VERCEL_ENV: "preview",
      PILOT_PATIENT_SEND_ALLOWLIST_MOBILE: "",
      PILOT_PATIENT_SEND_ALLOWLIST_EMAIL: "",
    },
    () => {
      const result = evaluateAllowlistedRecipient("0542690673", "asma.alzahrani.pilot@wathiqcare.test");
      assert.equal(result.pilotEnabled, true);
      assert.equal(result.allowlisted, false);
      assert.equal(result.configMissing, true);
      assert.ok(result.reason.includes("Pilot allowlist configuration is missing for this environment."));
    },
  );
});

test("isAllowlistedRecipient delegates to evaluateAllowlistedRecipient", () => {
  withEnv(
    {
      FF_PATIENT_FACING_PILOT_SEND: "true",
      PILOT_PATIENT_SEND_ALLOWLIST_MOBILE: "+966501234567",
      PILOT_PATIENT_SEND_ALLOWLIST_EMAIL: "",
    },
    () => {
      assert.equal(isAllowlistedRecipient("0501234567", ""), true);
      assert.equal(isAllowlistedRecipient("+966509999999", ""), false);
    },
  );
});
