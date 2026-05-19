import assert from "node:assert/strict";
import test from "node:test";

import { buildEvidenceAuditMetadata } from "@/lib/pdf-engine/evidence/audit-metadata";
import { generateEvidenceHash } from "@/lib/pdf-engine/evidence/evidence-hash";
import { buildEvidenceVerificationUrl } from "@/lib/pdf-engine/evidence/verification-token";
import { buildInformedConsentTemplatePayload } from "@/lib/pdf-engine/templates/informed-consent.template";

test("generateEvidenceHash stays deterministic for stable payloads", () => {
  const left = {
    documentId: "doc-1",
    evidenceId: "e-1",
    patientName: "Najib",
    generatedAt: "2026-05-18T00:00:00.000Z",
  };
  const right = {
    patientName: "Najib",
    evidenceId: "e-1",
    documentId: "doc-1",
    generatedAt: "2026-05-19T00:00:00.000Z",
  };

  assert.equal(generateEvidenceHash(left), generateEvidenceHash(right));
});

test("buildEvidenceAuditMetadata returns reusable evidence metadata", () => {
  const metadata = buildEvidenceAuditMetadata({
    evidenceId: "e-1",
    generatedBy: "physician-1",
    documentHash: "hash-1",
    sourceModule: "informed-consents",
    formVersion: "v1.0",
  });

  assert.equal(metadata.evidenceId, "e-1");
  assert.equal(metadata.documentHash, "hash-1");
  assert.equal(metadata.deviceFingerprint, "device-fingerprint-placeholder");
});

test("buildEvidenceVerificationUrl returns verify URL", () => {
  assert.equal(
    buildEvidenceVerificationUrl("e-1"),
    "https://wathiqcare.online/verify/e-1",
  );
});

test("buildInformedConsentTemplatePayload preserves template-ready payload", () => {
  const payload = buildInformedConsentTemplatePayload({
    evidence: {
      documentId: "doc-1",
      evidenceId: "e-1",
      auditId: "audit-1",
      tenantId: "tenant-1",
      moduleKey: "informed-consents",
      patientMrn: "IMC-2026-02000",
      patientName: "Najib",
      caseNumber: "CASE-001",
      encounterNo: null,
      generatedAt: "2026-05-18T00:00:00.000Z",
      generatedBy: "physician-1",
      consentVersion: "v1.0",
      language: "en",
      hash: "hash-1",
      verificationUrl: "https://wathiqcare.online/verify/e-1",
      qrDataUrl: null,
      legalFooterText: "footer",
    },
    consentTitle: "Surgical Consent",
    consentType: "SURGICAL_CONSENT",
    templateName: "Surgical Consent",
    physicianName: "Dr. Ahmed",
    renderedBodyHtml: null,
  });

  assert.equal(payload.consentTitle, "Surgical Consent");
  assert.equal(payload.evidence.evidenceId, "e-1");
});