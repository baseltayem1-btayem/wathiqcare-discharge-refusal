import assert from "node:assert/strict";
import test from "node:test";

import {
  buildInformedConsentEvidenceHtmlPreview,
  buildInformedConsentEvidencePayloadFromDocument,
  isInformedConsentPdfEnginePreviewEnabled,
} from "@/lib/server/informed-consent-pdf-preview-adapter";

test("preview flag defaults to false when unset", () => {
  const previous = process.env.WATHIQCARE_PDF_ENGINE_PREVIEW_ENABLED;

  try {
    delete process.env.WATHIQCARE_PDF_ENGINE_PREVIEW_ENABLED;
    assert.equal(isInformedConsentPdfEnginePreviewEnabled(), false);
  } finally {
    if (previous === undefined) {
      delete process.env.WATHIQCARE_PDF_ENGINE_PREVIEW_ENABLED;
    } else {
      process.env.WATHIQCARE_PDF_ENGINE_PREVIEW_ENABLED = previous;
    }
  }
});

test("preview adapter maps informed consent document data into pdf engine payload", async () => {
  const payload = await buildInformedConsentEvidencePayloadFromDocument({
    origin: "https://wathiqcare.online",
    language: "en",
    document: {
      id: "doc-1",
      tenantId: "tenant-1",
      consentReference: "IC-2026-0001",
      documentVersion: "v1.0",
      patientName: "Najib",
      mrn: "IMC-2026-02000",
      physicianName: "Dr. Ahmed",
      physicianLicense: "LIC-1",
      physicianSpecialty: "Surgery",
      plannedProcedure: "Appendectomy",
      procedureDetails: "Laparoscopic appendectomy",
      diagnosis: "Acute appendicitis",
      createdAt: new Date("2026-05-18T00:00:00.000Z"),
      template: {
        titleAr: "موافقة جراحية",
        titleEn: "Surgical Consent",
        consentType: "SURGICAL_CONSENT",
        specialty: "General Surgery",
      },
      case: { caseNumber: "CASE-001" },
      auditChecksum: null,
      immutablePdfHash: null,
      generatedByModel: "gpt-5.4",
    },
  });

  assert.equal(payload.evidence.documentId, "doc-1");
  assert.match(payload.evidence.verificationUrl || "", /\/verify\/consent\/doc-1$/);
  assert.equal(payload.consentTitle, "Surgical Consent");
});

test("preview adapter builds HTML without replacing production output path", async () => {
  const preview = await buildInformedConsentEvidenceHtmlPreview({
    origin: "https://wathiqcare.online",
    language: "ar",
    document: {
      id: "doc-1",
      tenantId: "tenant-1",
      consentReference: "IC-2026-0001",
      documentVersion: "v1.0",
      patientName: "Najib",
      mrn: "IMC-2026-02000",
      physicianName: "Dr. Ahmed",
      physicianLicense: "LIC-1",
      physicianSpecialty: "Surgery",
      plannedProcedure: "Appendectomy",
      procedureDetails: "Laparoscopic appendectomy",
      diagnosis: "Acute appendicitis",
      createdAt: new Date("2026-05-18T00:00:00.000Z"),
      template: {
        titleAr: "موافقة جراحية",
        titleEn: "Surgical Consent",
        consentType: "SURGICAL_CONSENT",
        specialty: "General Surgery",
      },
      case: { caseNumber: "CASE-001" },
      auditChecksum: null,
      immutablePdfHash: null,
      generatedByModel: null,
    },
  });

  assert.match(preview.html, /dir="rtl"/);
  assert.match(preview.html, /consent-evidence-doc-1/);
  assert.equal(preview.legalEvidencePackage.snapshot.evidenceId, "consent-evidence-doc-1");
  assert.equal(preview.payload.evidence.legalRuntime?.evidenceVerificationStatus, "preview-registered");
  assert.equal(preview.payload.evidence.legalRuntime?.retentionClass, "informed-consent");
});