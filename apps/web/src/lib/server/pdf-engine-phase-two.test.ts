import assert from "node:assert/strict";
import test from "node:test";

import { generateImmutableEvidenceSeal } from "@/lib/pdf-engine/runtime/immutable-evidence";
import { buildLegalEvidencePackage } from "@/lib/pdf-engine/runtime/legal-evidence-package";
import { buildOtpEvidenceRecord } from "@/lib/pdf-engine/runtime/otp-evidence";
import { buildForensicAuditEvent, generateAuditChainHash } from "@/lib/pdf-engine/runtime/forensic-audit-chain";
import { resolveEvidenceVerificationUrl } from "@/lib/pdf-engine/runtime/verification-registry";

test("generateImmutableEvidenceSeal stays deterministic for the same input", () => {
  const left = generateImmutableEvidenceSeal({
    sha256Hash: "hash-1",
    timestamp: "2026-05-18T00:00:00.000Z",
    evidenceId: "e-1",
    signerReference: "mrn-1",
  });
  const right = generateImmutableEvidenceSeal({
    sha256Hash: "hash-1",
    timestamp: "2026-05-18T00:00:00.000Z",
    evidenceId: "e-1",
    signerReference: "mrn-1",
  });

  assert.equal(left.fingerprint, right.fingerprint);
});

test("generateAuditChainHash is stable for the same forensic event payload", () => {
  const eventBase = {
    actor: "physician-1",
    details: { preview: true },
    evidenceId: "e-1",
    eventType: "package_built",
    ipAddress: null,
    previousChainHash: null,
    sourceModule: "informed-consents",
    timestamp: "2026-05-18T00:00:00.000Z",
  };

  assert.equal(generateAuditChainHash(eventBase), generateAuditChainHash(eventBase));
});

test("buildOtpEvidenceRecord maps legal OTP evidence fields", () => {
  const record = buildOtpEvidenceRecord({
    verified: true,
    deliveryTimestamp: "2026-05-18T00:00:00.000Z",
    verificationTimestamp: "2026-05-18T00:01:00.000Z",
    maskedMobileNumber: "+9665******12",
    deliveryProvider: "taqniat",
    deliveryReference: "otp-1",
    verificationMethod: "sms-otp",
  });

  assert.equal(record.verificationStatus, "verified");
  assert.equal(record.deliveryProvider, "taqniat");
});

test("buildLegalEvidencePackage assembles the runtime evidence bundle", () => {
  const otpEvidence = buildOtpEvidenceRecord({
    verified: false,
    deliveryProvider: "preview-pending",
    deliveryReference: "otp-preview-1",
    verificationMethod: "preview-placeholder",
  });
  const evidencePackage = buildLegalEvidencePackage({
    auditMetadata: {
      evidenceId: "e-1",
      auditId: "audit-1",
      generatedAt: "2026-05-18T00:00:00.000Z",
      generatedBy: "physician-1",
      ipAddress: null,
      otpStatus: null,
      formVersion: "v1.0",
      documentHash: "hash-1",
      sourceModule: "informed-consents",
      deviceFingerprint: "device-fingerprint-placeholder",
    },
    documentContent: {
      patientName: "Najib",
      procedure: "Appendectomy",
    },
    evidenceHash: "hash-1",
    evidenceId: "e-1",
    html: "<html></html>",
    languageDirection: "ltr",
    otpEvidence,
    signerDetails: {
      signerReference: "mrn-1",
      signerName: "Najib",
      signerRole: "patient-subject",
    },
    sourceModule: "informed-consents",
    templateVersion: "v1.0",
  });

  assert.equal(evidencePackage.evidenceId, "e-1");
  assert.equal(evidencePackage.snapshot.evidenceHash, "hash-1");
  assert.equal(evidencePackage.auditChainReference, evidencePackage.auditChain.currentChainHash);
});

test("resolveEvidenceVerificationUrl uses the public verification path", () => {
  assert.equal(resolveEvidenceVerificationUrl("e-1"), "https://wathiqcare.online/verify/e-1");
});

test("buildForensicAuditEvent produces an append-only chain hash", () => {
  const event = buildForensicAuditEvent({
    eventType: "preview_runtime_probe",
    actor: "system",
    timestamp: "2026-05-18T00:00:00.000Z",
    ipAddress: null,
    sourceModule: "informed-consents",
    evidenceId: "e-1",
    previousChainHash: "prev-1",
  });

  assert.ok(event.currentChainHash.length > 10);
  assert.equal(event.previousChainHash, "prev-1");
});