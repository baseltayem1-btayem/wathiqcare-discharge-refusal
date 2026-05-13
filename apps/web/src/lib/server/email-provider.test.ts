import assert from "node:assert/strict";
import test from "node:test";

import {
  isMockEmailDeliveryEnabled,
  sendEmailWithDiagnostics,
} from "@/lib/server/email-provider";

test("mock email delivery mode enables sandbox-safe transport", async () => {
  const previousMode = process.env.EMAIL_DELIVERY_MODE;
  delete process.env.SMTP_PASS;
  delete process.env.RESEND_API_KEY;
  process.env.EMAIL_DELIVERY_MODE = "mock";

  try {
    assert.equal(isMockEmailDeliveryEnabled(), true);

    const diagnostics = await sendEmailWithDiagnostics({
      to: "sandbox@example.com",
      subject: "Sandbox notification",
      html: "<p>ok</p>",
      text: "ok",
    });

    assert.equal(diagnostics.provider, "smtp");
    assert.equal(diagnostics.smtpVerifyOk, true);
    assert.deepEqual(diagnostics.smtpAccepted, ["sandbox@example.com"]);
    assert.match(diagnostics.messageId ?? "", /^mock-/);
  } finally {
    if (previousMode === undefined) {
      delete process.env.EMAIL_DELIVERY_MODE;
    } else {
      process.env.EMAIL_DELIVERY_MODE = previousMode;
    }
  }
});

test("email delivery still requires SMTP credentials outside mock mode", async () => {
  const previousMode = process.env.EMAIL_DELIVERY_MODE;
  const previousPass = process.env.SMTP_PASS;
  const previousResend = process.env.RESEND_API_KEY;
  delete process.env.EMAIL_DELIVERY_MODE;
  delete process.env.SMTP_PASS;
  delete process.env.RESEND_API_KEY;

  try {
    await assert.rejects(
      sendEmailWithDiagnostics({
        to: "sandbox@example.com",
        subject: "Sandbox notification",
        html: "<p>ok</p>",
      }),
      /SMTP email configuration is missing/,
    );
  } finally {
    if (previousMode === undefined) {
      delete process.env.EMAIL_DELIVERY_MODE;
    } else {
      process.env.EMAIL_DELIVERY_MODE = previousMode;
    }

    if (previousPass === undefined) {
      delete process.env.SMTP_PASS;
    } else {
      process.env.SMTP_PASS = previousPass;
    }

    if (previousResend === undefined) {
      delete process.env.RESEND_API_KEY;
    } else {
      process.env.RESEND_API_KEY = previousResend;
    }
  }
});
