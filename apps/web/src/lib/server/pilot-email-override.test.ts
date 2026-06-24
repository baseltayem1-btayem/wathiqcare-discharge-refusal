import assert from "node:assert/strict";
import test from "node:test";

import { sendSecureSigningLinkEmail } from "./pilot-email-override";

test("secure signing email uses the patient-entered recipient address", async () => {
  let sentTo = "";
  let auditedRecipient = "";

  const result = await sendSecureSigningLinkEmail(
    {
      tenantId: "tenant-1",
      caseId: "case-1",
      patientName: "Patient One",
      recipientEmail: " Patient@Example.com ",
      mobileNumber: "+966500000000",
      signingUrl: "https://wathiqcare.online/sign/token-1",
      expiresMinutes: 30,
      documentId: "doc-1",
      sessionId: "session-1",
      moduleKey: "informed_consent",
      locale: "ar",
    },
    {
      sendEmail: async (args) => {
        sentTo = args.to;
        return {
          provider: "smtp",
          messageId: "msg-1",
          smtpAccepted: ["patient@example.com"],
          smtpRejected: [],
          smtpSendResponse: "250 Accepted",
        };
      },
      recordAuditAttempt: async (args) => {
        auditedRecipient = args.recipient;
        return "audit-1";
      },
    },
  );

  assert.equal(sentTo, "patient@example.com");
  assert.equal(auditedRecipient, "patient@example.com");
  assert.equal(result.recipient, "patient@example.com");
  assert.equal(result.status, "sent");
  assert.equal(result.failureReason, null);
});

test("secure signing email fails when the provider rejects the patient recipient", async () => {
  const result = await sendSecureSigningLinkEmail(
    {
      tenantId: "tenant-1",
      caseId: "case-1",
      patientName: "Patient One",
      recipientEmail: "patient@example.com",
      mobileNumber: "+966500000000",
      signingUrl: "https://wathiqcare.online/sign/token-1",
      expiresMinutes: 30,
      documentId: "doc-1",
      sessionId: "session-1",
      moduleKey: "informed_consent",
      locale: "ar",
    },
    {
      sendEmail: async () => ({
        provider: "smtp",
        messageId: "msg-2",
        smtpAccepted: [],
        smtpRejected: ["patient@example.com"],
        smtpSendResponse: "550 Rejected",
      }),
      recordAuditAttempt: async () => "audit-2",
    },
  );

  assert.equal(result.status, "failed");
  assert.equal(result.recipient, "patient@example.com");
  assert.match(result.failureReason || "", /did not accept/i);
});
import { resetEnvironmentConfig } from "@/lib/environment/environment";
import { getPilotEmailOverrideConfig } from "@/lib/server/pilot-email-override";

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

  resetEnvironmentConfig();
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
    resetEnvironmentConfig();
  }
}

test("pilot override is enabled by default in pilot", () => {
  withEnv({
    APP_ENV: "pilot",
    PILOT_EMAIL_NOTIFICATION_OVERRIDE_ENABLED: undefined,
    PILOT_EMAIL_OVERRIDE_RECIPIENT: undefined,
  }, () => {
    const config = getPilotEmailOverrideConfig();
    assert.equal(config.enabled, true);
    assert.equal(config.environment, "pilot");
    assert.equal(config.recipient, "Admin@wathiqcare.med.sa");
  });
});

test("pilot override stays disabled in production unless explicitly enabled", () => {
  withEnv({
    APP_ENV: "production",
    PILOT_EMAIL_NOTIFICATION_OVERRIDE_ENABLED: undefined,
  }, () => {
    const config = getPilotEmailOverrideConfig();
    assert.equal(config.enabled, false);
    assert.equal(config.environment, "production");
  });
});

test("pilot override can be disabled explicitly in uat", () => {
  withEnv({
    APP_ENV: "uat",
    PILOT_EMAIL_NOTIFICATION_OVERRIDE_ENABLED: "false",
  }, () => {
    const config = getPilotEmailOverrideConfig();
    assert.equal(config.enabled, false);
    assert.equal(config.environment, "uat");
  });
});