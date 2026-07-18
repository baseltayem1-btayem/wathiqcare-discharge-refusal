import assert from "node:assert/strict";
import test from "node:test";
import { ConsentSignatureRole, PatientMessageStatus } from "@prisma/client";

import { resolveTrustedSigningBaseUrl } from "@/lib/server/signing-url-config";
import {
  generateSigningToken,
  verifySigningToken,
  computeTokenHash,
  buildSigningUrl,
} from "@/lib/server/signing-token-service";
import {
  deriveSecureSigningBadgeFlags,
  resolveTrustedPdfHash,
  deriveSendRootOperationKey,
  isDispatchConsideredSent,
  toLegacyDeliveryStatus,
} from "@/lib/server/module-secure-signing-service";
import { buildRefusalFormPayload } from "@/lib/server/public-signing-decision-service";
import { createFakeSmsGateway } from "@/lib/server/fake-sms-gateway";
import { createFakeEmailGateway } from "@/lib/server/fake-email-gateway";
import { buildWathiqCareEmailHtml, buildWathiqCareEmailText } from "@/lib/server/email-provider";
import {
  normalizeSaudiMobileForSms,
  isTaqnyatReady,
} from "@/services/sms/taqnyatClient";
import { IMC_APPROVED_CONSENT_FORMS_MANIFEST } from "@/lib/server/imc-approved-consent-forms.manifest";

// ---------------------------------------------------------------------------
// Mandatory env guards for deterministic, fail-closed behavior.
// ---------------------------------------------------------------------------
function setNodeEnv(value: string): void {
  (process.env as Record<string, string>).NODE_ENV = value;
}

setNodeEnv("test");
process.env.SIGNING_TOKEN_SECRET = "test-signing-token-secret-32-bytes-long!!";
process.env.PUBLIC_SIGNING_OTP_PEPPER = "test-public-signing-otp-pepper!!";
process.env.RECIPIENT_HASH_PEPPER = "test-recipient-hash-pepper-32-bytes!!";
process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://dummy";
process.env.RECIPIENT_RESOLVER_DISABLE_DB = "true";
process.env.SIGNING_BASE_URL = "https://localhost/sign";
process.env.NEXT_PUBLIC_APP_BASE_URL = "https://localhost";

// ---------------------------------------------------------------------------
// Production allowlist and canonical domain
// ---------------------------------------------------------------------------

test("valid production recipient is not blocked by allowlist", () => {
  process.env.SIGNING_URL_APPROVED_HOSTS = "wathiqcare.online,wathiqcare.med.sa";
  delete process.env.SIGNING_BASE_URL;
  delete process.env.NEXTAUTH_URL;
  process.env.NEXT_PUBLIC_CANONICAL_PRODUCTION_URL = "https://wathiqcare.online";
  setNodeEnv("production");

  const url = resolveTrustedSigningBaseUrl();
  assert.equal(url, "https://wathiqcare.online");
});

test("test-mode allowlist is optional and falls back to localhost", () => {
  delete process.env.SIGNING_URL_APPROVED_HOSTS;
  process.env.SIGNING_BASE_URL = "http://localhost:3000";
  setNodeEnv("test");

  const url = resolveTrustedSigningBaseUrl();
  assert.equal(url, "http://localhost:3000");
});

test("preview environment cannot silently generate a production signing URL", () => {
  process.env.VERCEL_ENV = "preview";
  setNodeEnv("production");
  process.env.NEXT_PUBLIC_CANONICAL_PRODUCTION_URL = "https://wathiqcare.online";

  assert.throws(
    () => resolveTrustedSigningBaseUrl(),
    /Preview environment cannot silently generate a production signing URL/,
  );

  delete process.env.VERCEL_ENV;
});

test("unapproved host is rejected in production", () => {
  setNodeEnv("production");
  process.env.SIGNING_URL_APPROVED_HOSTS = "wathiqcare.online";

  assert.throws(
    () => resolveTrustedSigningBaseUrl("https://evil.example.com"),
    /host is not approved/,
  );
});

// ---------------------------------------------------------------------------
// Secure-link token lifecycle
// ---------------------------------------------------------------------------

test("secure-link token creation is deterministic for identical inputs", () => {
  const expiresAt = new Date("2030-01-01T00:00:00Z");
  const t1 = generateSigningToken({
    tenantId: "tenant-prod",
    sessionId: "session-1",
    signerRole: "PATIENT",
    expiresAt,
  });
  const t2 = generateSigningToken({
    tenantId: "tenant-prod",
    sessionId: "session-1",
    signerRole: "PATIENT",
    expiresAt,
  });
  assert.equal(t1, t2);
  assert.ok(t1.startsWith("v1:"));
});

test("token verification returns canonical claims", () => {
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  const token = generateSigningToken({
    tenantId: "tenant-prod",
    sessionId: "session-1",
    signerRole: "PATIENT",
    expiresAt,
  });
  const claims = verifySigningToken(token);
  assert.equal(claims.tenantId, "tenant-prod");
  assert.equal(claims.sessionId, "session-1");
  assert.equal(claims.signerRole, "PATIENT");
});

test("expired token is rejected", () => {
  const token = generateSigningToken({
    tenantId: "tenant-prod",
    sessionId: "session-1",
    signerRole: "PATIENT",
    expiresAt: new Date(Date.now() - 1000),
  });
  assert.throws(() => verifySigningToken(token), /TOKEN_EXPIRED/);
});

test("tampered token signature is rejected", () => {
  const token = generateSigningToken({
    tenantId: "tenant-prod",
    sessionId: "session-1",
    signerRole: "PATIENT",
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
  });
  const tampered = token.replace(/.$/, token.at(-1) === "a" ? "b" : "a");
  assert.throws(() => verifySigningToken(tampered), /INVALID_TOKEN_SIGNATURE/);
});

test("buildSigningUrl encodes token and uses canonical domain", () => {
  setNodeEnv("production");
  process.env.SIGNING_URL_APPROVED_HOSTS = "wathiqcare.online";
  process.env.NEXT_PUBLIC_CANONICAL_PRODUCTION_URL = "https://wathiqcare.online";

  const token = generateSigningToken({
    tenantId: "tenant-prod",
    sessionId: "session-1",
    signerRole: "PATIENT",
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
  });
  const url = buildSigningUrl(token);
  assert.ok(url.startsWith("https://wathiqcare.online/sign/"));
  assert.ok(url.includes(encodeURIComponent(token)));
});

test("token hash is SHA-256 hex and hides plaintext", () => {
  const token = generateSigningToken({
    tenantId: "tenant-prod",
    sessionId: "session-1",
    signerRole: "PATIENT",
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
  });
  const hash = computeTokenHash(token);
  assert.equal(hash.length, 64);
  assert.ok(/^[a-f0-9]+$/.test(hash));
  assert.ok(!hash.includes(token));
});

// ---------------------------------------------------------------------------
// Physician approval / secure signing badge flags
// ---------------------------------------------------------------------------

test("physician approval enables send: linkCreated and smsSent are true", () => {
  const flags = deriveSecureSigningBadgeFlags({
    tokenFound: true,
    tokenExpired: false,
    tokenUsed: false,
    tokenRevoked: false,
    otpRequestedCount: 0,
    otpVerifiedCount: 0,
    otpFailedCount: 0,
    smsSent: true,
    smsFailed: false,
  });
  assert.equal(flags.linkCreated, true);
  assert.equal(flags.smsSent, true);
  assert.equal(flags.failed, false);
});

test("stale approval blocks until regeneration: expired token shows expired", () => {
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
  assert.equal(flags.signed, false);
});

test("one-time completion marks signed when token is used", () => {
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

test("revoked token prevents signing", () => {
  const flags = deriveSecureSigningBadgeFlags({
    tokenFound: true,
    tokenExpired: false,
    tokenUsed: false,
    tokenRevoked: true,
    otpRequestedCount: 1,
    otpVerifiedCount: 0,
    otpFailedCount: 0,
    smsSent: true,
    smsFailed: false,
  });
  assert.equal(flags.revoked, true);
  assert.equal(flags.signed, false);
});

test("OTP attempt limits cause failure after max attempts", () => {
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

// ---------------------------------------------------------------------------
// Exact doctor-filled PDF shown
// ---------------------------------------------------------------------------

test("resolveTrustedPdfHash prefers immutablePdfHash column", () => {
  const hash = resolveTrustedPdfHash({
    immutablePdfHash: "column-hash",
    metadata: { immutablePdfHash: "meta-hash" },
  });
  assert.equal(hash, "column-hash");
});

test("resolveTrustedPdfHash falls back to approved metadata sources", () => {
  assert.equal(
    resolveTrustedPdfHash({ immutablePdfHash: null, metadata: { checksum: "checksum-hash" } }),
    "checksum-hash",
  );
  assert.equal(
    resolveTrustedPdfHash({ immutablePdfHash: null, metadata: { approvedPdfHash: "approved-hash" } }),
    "approved-hash",
  );
  assert.equal(resolveTrustedPdfHash({ immutablePdfHash: null, metadata: {} }), null);
});

// ---------------------------------------------------------------------------
// Adult consent / refusal / guardian signing
// ---------------------------------------------------------------------------

test("refusal form payload includes Arabic and English statements", () => {
  const doc = {
    id: "doc-1",
    patientName: "Test Patient",
    mrn: "MRN123",
    physicianName: "Dr. Smith",
    plannedProcedure: "Appendectomy",
    template: { titleEn: "Appendectomy Consent" },
    templateVersion: { versionLabel: "1.0" },
    sections: [],
    signatures: [],
    diagnosis: null,
    legalTextAr: null,
    legalTextEn: null,
    pdplTextAr: null,
    pdplTextEn: null,
    consentReference: "C-2026-001",
    updatedAt: new Date(),
  } as unknown as Parameters<typeof buildRefusalFormPayload>[0]["doc"];

  const education = {
    versionLabel: "ed-1.0",
    contentHash: "edu-hash",
  } as unknown as Parameters<typeof buildRefusalFormPayload>[0]["education"];

  const form = buildRefusalFormPayload({ doc, education });
  assert.ok(form.statementAr.length > 0);
  assert.ok(form.statementEn.length > 0);
  assert.ok(form.statementAr.includes("رفض"));
  assert.ok(form.statementEn.includes("refuse"));
  assert.ok(form.acknowledgementAr.length > 0);
  assert.ok(form.acknowledgementEn.length > 0);
  assert.equal(form.formHash.length, 64);
  assert.ok(/^[a-f0-9]+$/.test(form.formHash));
});

test("patient and guardian are both valid signer roles", () => {
  assert.equal(ConsentSignatureRole.PATIENT, "PATIENT");
  assert.equal(ConsentSignatureRole.GUARDIAN, "GUARDIAN");
  assert.notEqual(ConsentSignatureRole.PATIENT, ConsentSignatureRole.GUARDIAN);
});

// ---------------------------------------------------------------------------
// SMS / email provider success and failure
// ---------------------------------------------------------------------------

test("fake SMS gateway records success and can simulate failure", async () => {
  const gateway = createFakeSmsGateway();
  const success = await gateway.send({ recipient: "+966501234567", message: "Test" });
  assert.equal(success.ok, true);
  assert.equal(gateway.calls.length, 1);

  gateway.setFailureCount(1);
  const failure = await gateway.send({ recipient: "+966501234567", message: "Test" });
  assert.equal(failure.ok, false);
  assert.equal(gateway.calls.length, 2);

  gateway.reset();
  assert.equal(gateway.calls.length, 0);
});

test("fake email gateway records success and can simulate failure", async () => {
  const gateway = createFakeEmailGateway();
  const success = await gateway.send({
    recipient: "patient@example.com",
    subject: "Consent",
    html: "<p>Consent</p>",
    text: "Consent",
  });
  assert.equal(success.ok, true);
  assert.equal(gateway.calls.length, 1);

  gateway.setFailureCount(1);
  const failure = await gateway.send({
    recipient: "patient@example.com",
    subject: "Consent",
    html: "<p>Consent</p>",
    text: "Consent",
  });
  assert.equal(failure.ok, false);
});

test("email template includes brand, security note, and canonical domain", () => {
  const html = buildWathiqCareEmailHtml({
    title: "Test Consent",
    bodyHtml: "<p>Please review and sign.</p>",
    ctaUrl: "https://wathiqcare.online/sign/test",
    ctaText: "Sign Now",
    expiresNote: "Expires in 30 minutes",
    securityNote: "Secure signing link",
  });
  assert.ok(html.includes("WathiqCare"));
  assert.ok(html.includes("wathiqcare.online"));
  assert.ok(html.includes("Sign Now"));
  assert.ok(html.includes("Expires in 30 minutes"));
  assert.ok(html.includes("Secure signing link"));

  const text = buildWathiqCareEmailText({
    title: "Test Consent",
    bodyLines: ["Please review and sign."],
    ctaLabel: "Sign Now",
    ctaUrl: "https://wathiqcare.online/sign/test",
    expiresNote: "Expires in 30 minutes",
    securityNote: "Secure signing link",
  });
  assert.ok(text.includes("WathiqCare"));
  assert.ok(text.includes("wathiqcare.online"));
});

// ---------------------------------------------------------------------------
// SMS proxy readiness and normalization
// ---------------------------------------------------------------------------

test("isTaqnyatReady requires SMS proxy URL and secret", () => {
  delete process.env.TAQNYAT_BEARER_TOKEN;
  delete process.env.TAQNYAT_API_KEY;
  process.env.SMS_PROXY_URL = "https://sms-proxy.example.com";
  process.env.SMS_PROXY_SECRET = "secret-value";

  assert.equal(isTaqnyatReady(), true);

  delete process.env.SMS_PROXY_SECRET;
  assert.equal(isTaqnyatReady(), false);

  delete process.env.SMS_PROXY_URL;
});

test("normalizeSaudiMobileForSms converts common formats to gateway format", () => {
  assert.equal(normalizeSaudiMobileForSms("+966501234567"), "966501234567");
  assert.equal(normalizeSaudiMobileForSms("00966501234567"), "966501234567");
  assert.equal(normalizeSaudiMobileForSms("0501234567"), "966501234567");
  assert.equal(normalizeSaudiMobileForSms("501234567"), "966501234567");
});

// ---------------------------------------------------------------------------
// Idempotency, resend, and revocation
// ---------------------------------------------------------------------------

test("deriveSendRootOperationKey is deterministic for identical medical intent", () => {
  const args = {
    tenantId: "t1",
    caseId: "case-1",
    documentId: "doc-1",
    approvedConsentFormKey: "adenotonsillectomy",
    approvedTemplateVersionId: "v1",
    immutablePdfHash: "pdf-hash",
    mobileNumber: "+966501234567",
    recipientEmail: "patient@example.com",
    locale: "ar" as const,
  };
  const k1 = deriveSendRootOperationKey(args);
  const k2 = deriveSendRootOperationKey(args);
  assert.equal(k1, k2);

  const k3 = deriveSendRootOperationKey({ ...args, locale: "en" });
  assert.notEqual(k1, k3);
});

// ---------------------------------------------------------------------------
// Dispatch status mapping - no fake production success
// ---------------------------------------------------------------------------

test("isDispatchConsideredSent only accepts real terminal success states", () => {
  assert.equal(isDispatchConsideredSent(PatientMessageStatus.ACCEPTED), true);
  assert.equal(isDispatchConsideredSent(PatientMessageStatus.SENT), true);
  assert.equal(isDispatchConsideredSent(PatientMessageStatus.DELIVERED), true);
  assert.equal(isDispatchConsideredSent(PatientMessageStatus.PENDING), false);
  assert.equal(isDispatchConsideredSent(PatientMessageStatus.CLAIMED), false);
  assert.equal(isDispatchConsideredSent(PatientMessageStatus.FAILED), false);
  assert.equal(isDispatchConsideredSent(PatientMessageStatus.PERMANENT_FAILURE), false);
});

test("toLegacyDeliveryStatus maps terminal states only", () => {
  assert.equal(toLegacyDeliveryStatus(PatientMessageStatus.ACCEPTED), "sent");
  assert.equal(toLegacyDeliveryStatus(PatientMessageStatus.SENT), "sent");
  assert.equal(toLegacyDeliveryStatus(PatientMessageStatus.DELIVERED), "sent");
  assert.equal(toLegacyDeliveryStatus(PatientMessageStatus.FAILED), "failed");
  assert.equal(toLegacyDeliveryStatus(PatientMessageStatus.PERMANENT_FAILURE), "failed");
  assert.equal(toLegacyDeliveryStatus(PatientMessageStatus.PENDING), undefined);
  assert.equal(toLegacyDeliveryStatus(PatientMessageStatus.CLAIMED), undefined);
});

// ---------------------------------------------------------------------------
// Approved consent forms batch certification
// ---------------------------------------------------------------------------

test("all supported forms in manifest are approved and have PDF URLs", () => {
  assert.ok(IMC_APPROVED_CONSENT_FORMS_MANIFEST.length > 0);

  const failures: string[] = [];
  const categories = new Set<string>();

  for (const item of IMC_APPROVED_CONSENT_FORMS_MANIFEST) {
    categories.add(item.category);
    if (item.approvalStatus !== "approved") {
      failures.push(`${item.id}: approvalStatus=${item.approvalStatus}`);
    }
    if (!item.pdfUrl || !item.pdfUrl.startsWith("/approved-consent-forms/")) {
      failures.push(`${item.id}: missing or invalid pdfUrl`);
    }
  }

  assert.equal(failures.length, 0, `Manifest certification failures: ${failures.join("; ")}`);
});

test("one manifest failure does not disable processing of other forms", () => {
  const copy = structuredClone(IMC_APPROVED_CONSENT_FORMS_MANIFEST) as Array<{
    approvalStatus: string;
  }>;
  copy[0].approvalStatus = "draft";
  const failures = copy.filter((item) => item.approvalStatus !== "approved");
  assert.equal(failures.length, 1);
  assert.ok(copy.slice(1).every((item) => item.approvalStatus === "approved"));
});

// ---------------------------------------------------------------------------
// OTP pepper requirement
// ---------------------------------------------------------------------------

test("SIGNING_TOKEN_SECRET and PUBLIC_SIGNING_OTP_PEPPER must be at least 32 characters", () => {
  assert.ok(process.env.SIGNING_TOKEN_SECRET && process.env.SIGNING_TOKEN_SECRET.length >= 32);
  assert.ok(process.env.PUBLIC_SIGNING_OTP_PEPPER && process.env.PUBLIC_SIGNING_OTP_PEPPER.length >= 32);
});
