import assert from "node:assert/strict";
import test from "node:test";

import { buildPdfEvidenceHash } from "@/lib/pdf-engine/core/pdf-evidence";
import { buildInformedConsentEvidenceHtml } from "@/lib/pdf-engine/templates/informed-consent-evidence-template";
import { buildEvidenceVerificationUrl } from "@/lib/pdf-engine/verification/evidence-token";

test("pdf evidence hash stays deterministic and excludes volatile fields by default", () => {
  const baseEvidence = {
    documentId: "doc-1",
    evidenceId: "evidence-1",
    auditId: "audit-1",
    tenantId: "tenant-1",
    moduleKey: "informed-consents",
    patientMrn: "IMC-2026-02000",
    patientName: "Najib",
    caseNumber: "CASE-001",
    encounterNo: "ENC-001",
    generatedAt: "2026-05-18T00:00:00.000Z",
    generatedBy: "physician-1",
    consentVersion: "v1",
    language: "en" as const,
    hash: null,
    verificationUrl: "https://wathiqcare.online/verify/evidence-1",
    qrDataUrl: null,
    legalFooterText: "Footer",
  };

  const reorderedEvidence = {
    patientName: "Najib",
    patientMrn: "IMC-2026-02000",
    encounterNo: "ENC-001",
    caseNumber: "CASE-001",
    legalFooterText: "Footer",
    documentId: "doc-1",
    evidenceId: "evidence-1",
    auditId: "audit-1",
    tenantId: "tenant-1",
    moduleKey: "informed-consents",
    generatedBy: "physician-1",
    generatedAt: "2026-05-19T00:00:00.000Z",
    consentVersion: "v1",
    language: "en" as const,
    hash: null,
    verificationUrl: "https://wathiqcare.online/verify/evidence-1",
    qrDataUrl: null,
  };

  assert.equal(buildPdfEvidenceHash(baseEvidence), buildPdfEvidenceHash(reorderedEvidence));
});

test("informed consent evidence HTML respects language direction and verification details", () => {
  const verificationUrl = buildEvidenceVerificationUrl("evidence-1");
  const html = buildInformedConsentEvidenceHtml({
    evidence: {
      documentId: "doc-1",
      evidenceId: "evidence-1",
      auditId: "audit-1",
      tenantId: "tenant-1",
      moduleKey: "informed-consents",
      patientMrn: "IMC-2026-02000",
      patientName: "Najib",
      caseNumber: "CASE-001",
      encounterNo: "ENC-001",
      generatedAt: "2026-05-18T00:00:00.000Z",
      generatedBy: "physician-1",
      consentVersion: "v1",
      language: "ar",
      hash: "abc123",
      verificationUrl,
      qrDataUrl: null,
      legalFooterText: "Legal footer",
    },
    consentTitle: "Surgical Consent",
    consentType: "SURGICAL_CONSENT",
    templateName: "General Surgery Template",
    physicianName: "Dr. Ahmed",
  });

  assert.match(html, /dir="rtl"/);
  assert.match(html, /evidence-1/);
  assert.match(html, /IMC official letterhead placeholder/);
  assert.match(html, /Legal footer/);
});