import assert from "node:assert/strict";
import test from "node:test";

import { sendSecureSigningLinkEmail } from "./pilot-email-override";

type CapturedEmail = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

async function captureSecureSigningEmail(): Promise<{ captured: CapturedEmail; status: string }> {
  let captured: CapturedEmail | null = null;

  const result = await sendSecureSigningLinkEmail(
    {
      tenantId: "tenant-1",
      caseId: "case-1",
      patientName: "Patient One",
      recipientEmail: "patient@example.com",
      mobileNumber: "+966500000000",
      signingUrl: "https://wathiqcare.online/sign/token-1/workflow",
      expiresMinutes: 30,
      documentId: "doc-1",
      sessionId: "session-1",
      moduleKey: "informed_consent",
      locale: "ar",
    },
    {
      sendEmail: async (args) => {
        captured = {
          to: args.to,
          subject: args.subject,
          html: args.html,
          text: args.text,
        };
        return {
          provider: "smtp",
          messageId: "msg-1",
          smtpAccepted: ["patient@example.com"],
          smtpRejected: [],
          smtpSendResponse: "250 Accepted",
        };
      },
      recordAuditAttempt: async () => "audit-1",
    },
  );

  assert.ok(captured, "email payload should be captured");
  return { captured: captured as CapturedEmail, status: result.status };
}

test("enterprise secure-signing template keeps white header and key markers", async () => {
  const { captured, status } = await captureSecureSigningEmail();

  assert.equal(status, "sent");
  assert.equal(captured.to, "patient@example.com");
  assert.equal(captured.subject, "Electronic Informed Consent Request");

  assert.match(captured.html, /background:#FFFFFF;padding:18px 20px;border-bottom:4px solid #C9A13B;/);
  assert.match(captured.html, /color:#1f2937;font-weight:600;/);

  assert.match(captured.html, /\/images\/imc-logo\.png/);
  assert.match(captured.html, /\/images\/wathiqcare-logo\.png/);

  assert.match(captured.html, /Review &amp; Sign Consent/);
  assert.match(captured.html, /مراجعة وتوقيع الموافقة/);
  assert.match(captured.html, /Fallback URL:/);
});
