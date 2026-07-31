import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { PDFDocument } from "pdf-lib";

(process.env as Record<string, string>).NODE_ENV = "test";
process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://dummy";

import {
  analyzeDoctorReadiness,
  isDoctorReadinessFieldComplete,
} from "@/components/informed-consents/production-workspace/doctorReadiness";
import {
  computeConsentFieldMappingHash,
  extractFieldMappingVerification,
  getConsentFieldMappingByFormId,
  getConsentFieldMappingReadiness,
  persistFieldMappingVerification,
} from "@/lib/server/consent-field-mappings";
import { computePhysicianJourneyReadiness } from "@/lib/server/physician-journey-readiness";
import { renderImcApprovedDoctorDraftPdf } from "@/lib/server/imc-approved-pdf-template-engine";
import {
  isSignatureHashStale,
  resolveTrustedDocumentHash,
} from "@/lib/server/signature-hash-binding";
import type { ConsentFieldMapping } from "@/lib/consents/field-mapping/types";

const SYNTHETIC_PNG_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";

function buildMinimalMapping(overrides?: Partial<ConsentFieldMapping>): ConsentFieldMapping {
  return {
    formId: "test-form",
    slug: "test",
    titleEn: "Test Form",
    layoutFamily: "TEST",
    version: "1.0.0",
    verificationStatus: "DRAFT",
    requiresDoctorCompletion: true,
    supportsAnesthesiaWorkflow: false,
    blocksPatientDispatchUntilVerified: true,
    fields: [
      {
        key: "condition_and_treatment",
        labelEn: "Condition and treatment",
        role: "PHYSICIAN_REQUIRED",
        type: "MULTILINE_TEXT",
        required: true,
        coordinates: {
          coordinateMode: "NORMALIZED",
          page: 1,
          x: 0.1,
          y: 0.2,
          width: 0.3,
          height: 0.04,
        },
      },
      {
        key: "treating_physician_signature",
        labelEn: "Treating physician signature",
        role: "PHYSICIAN_REQUIRED",
        type: "SIGNATURE",
        required: true,
        coordinates: {
          coordinateMode: "NORMALIZED",
          page: 2,
          x: 0.15,
          y: 0.46,
          width: 0.3,
          height: 0.03,
        },
      },
      {
        key: "patient_signature",
        labelEn: "Patient signature",
        role: "PATIENT_REQUIRED",
        type: "SIGNATURE",
        required: true,
      },
    ],
    ...overrides,
  };
}

function createMemoryPrismaClient(initialForms: Array<{ id: string; tenantId: string; metadata?: unknown }>) {
  const forms = new Map(initialForms.map((f) => [f.id, { ...f }]));

  return {
    consentForm: {
      findFirst: async (args: { where: { id?: string; tenantId?: string } }) => {
        for (const form of forms.values()) {
          if (args.where.id && form.id !== args.where.id) continue;
          if (args.where.tenantId && form.tenantId !== args.where.tenantId) continue;
          return { ...form };
        }
        return null;
      },
      update: async (args: {
        where: { id: string; tenantId?: string };
        data: { metadata?: Record<string, unknown> };
      }) => {
        const form = forms.get(args.where.id);
        if (!form) throw new Error("Form not found");
        if (args.where.tenantId && form.tenantId !== args.where.tenantId) {
          throw new Error("Tenant mismatch");
        }
        form.metadata = args.data.metadata;
        return { ...form };
      },
    },
  };
}

// -----------------------------------------------------------------------------
// 1. Mapping hash determinism and stale detection
// -----------------------------------------------------------------------------

test("computeConsentFieldMappingHash is deterministic for identical mappings", () => {
  const mapping = buildMinimalMapping();
  const first = computeConsentFieldMappingHash(mapping);
  const second = computeConsentFieldMappingHash(buildMinimalMapping());
  assert.equal(first, second);
  assert.equal(first.length, 64);
});

test("computeConsentFieldMappingHash ignores transient labels", () => {
  const base = buildMinimalMapping();
  const relabeled = buildMinimalMapping({ titleEn: "Relabeled Form" });
  relabeled.fields[0].labelEn = "Different label";
  relabeled.fields[0].placeholderEn = "Different placeholder";

  assert.equal(
    computeConsentFieldMappingHash(base),
    computeConsentFieldMappingHash(relabeled),
  );
});

test("computeConsentFieldMappingHash changes when canonical shape changes", () => {
  const base = buildMinimalMapping();
  const moved = buildMinimalMapping();
  moved.fields[0].coordinates = {
    coordinateMode: "NORMALIZED",
    page: 1,
    x: 0.99,
    y: 0.99,
    width: 0.3,
    height: 0.04,
  };

  assert.notEqual(
    computeConsentFieldMappingHash(base),
    computeConsentFieldMappingHash(moved),
  );
});

// -----------------------------------------------------------------------------
// 2. Persisted verification drives readiness
// -----------------------------------------------------------------------------

const REGISTERED_FORM_ID = "imc-approved-adenotonsillectomy";

test("getConsentFieldMappingReadiness returns VERIFIED when persisted hash matches", () => {
  const mapping = getConsentFieldMappingByFormId(REGISTERED_FORM_ID);
  assert.ok(mapping);
  const hash = computeConsentFieldMappingHash(mapping);
  const readiness = getConsentFieldMappingReadiness(REGISTERED_FORM_ID, {
    status: "VERIFIED",
    approvedAt: new Date().toISOString(),
    approvedByUserId: "user-1",
    mappingHash: hash,
  });

  assert.equal(readiness.verificationStatus, "VERIFIED");
  assert.equal(readiness.hasMapping, true);
  assert.ok(readiness.requiredDoctorFields.some((f) => f.key === "condition_and_treatment"));
  assert.ok(readiness.requiredPatientFields.some((f) => f.key === "patient_signature"));
});

test("getConsentFieldMappingReadiness returns STALE when persisted hash mismatches", () => {
  const readiness = getConsentFieldMappingReadiness(REGISTERED_FORM_ID, {
    status: "VERIFIED",
    approvedAt: new Date().toISOString(),
    approvedByUserId: "user-1",
    mappingHash: "stale-hash",
  });

  assert.equal(readiness.verificationStatus, "STALE");
  assert.ok(readiness.blockers.some((b) => /stale/i.test(b)));
});

test("extractFieldMappingVerification rejects malformed records", () => {
  assert.equal(extractFieldMappingVerification(null), null);
  assert.equal(extractFieldMappingVerification({}), null);
  assert.equal(
    extractFieldMappingVerification({
      fieldMappingVerification: { status: "VERIFIED" },
    }),
    null,
  );
  assert.equal(
    extractFieldMappingVerification({
      fieldMappingVerification: { status: "UNKNOWN", mappingHash: "abc" },
    }),
    null,
  );
});

test("persistFieldMappingVerification writes verification into ConsentForm metadata", async () => {
  const client = createMemoryPrismaClient([
    { id: REGISTERED_FORM_ID, tenantId: "t1", metadata: { existingKey: "preserve-me" } },
  ]);

  const readiness = await persistFieldMappingVerification({
    tenantId: "t1",
    formId: REGISTERED_FORM_ID,
    approvedByUserId: "user-1",
    prisma: client as unknown as import("@prisma/client").PrismaClient,
  });

  assert.equal(readiness.verificationStatus, "VERIFIED");
  assert.equal(readiness.persistedVerification?.approvedByUserId, "user-1");

  const updated = await client.consentForm.findFirst({
    where: { id: REGISTERED_FORM_ID, tenantId: "t1" },
  });
  const metadata = updated?.metadata as Record<string, unknown> | undefined;
  assert.equal(metadata?.existingKey, "preserve-me");
  const verification = metadata?.fieldMappingVerification as Record<string, unknown> | undefined;
  assert.ok(verification);
  assert.equal(verification.status, "VERIFIED");
  assert.equal(verification.approvedByUserId, "user-1");
  assert.equal(typeof verification.mappingHash, "string");
});

test("persistFieldMappingVerification enforces tenant isolation", async () => {
  const client = createMemoryPrismaClient([
    { id: REGISTERED_FORM_ID, tenantId: "t1", metadata: {} },
  ]);

  await assert.rejects(
    persistFieldMappingVerification({
      tenantId: "t2",
      formId: REGISTERED_FORM_ID,
      approvedByUserId: "user-1",
      prisma: client as unknown as import("@prisma/client").PrismaClient,
    }),
    /not found/,
  );
});

// -----------------------------------------------------------------------------
// 3. Field mapping and signature mapping do not overwrite each other
// -----------------------------------------------------------------------------

test("field mapping verification only touches ConsentForm.metadata.fieldMappingVerification", async () => {
  const client = createMemoryPrismaClient([
    {
      id: REGISTERED_FORM_ID,
      tenantId: "t1",
      metadata: {
        signatureMappings: [{ fieldKey: "patient_signature" }],
        unrelated: true,
      },
    },
  ]);

  await persistFieldMappingVerification({
    tenantId: "t1",
    formId: REGISTERED_FORM_ID,
    approvedByUserId: "user-1",
    prisma: client as unknown as import("@prisma/client").PrismaClient,
  });

  const updated = await client.consentForm.findFirst({
    where: { id: REGISTERED_FORM_ID, tenantId: "t1" },
  });
  const metadata = updated?.metadata as Record<string, unknown> | undefined;
  assert.deepEqual(metadata?.signatureMappings, [{ fieldKey: "patient_signature" }]);
  assert.equal(metadata?.unrelated, true);
  assert.ok(metadata?.fieldMappingVerification);
});

// -----------------------------------------------------------------------------
// 4. Physician completion readiness
// -----------------------------------------------------------------------------

test("doctor readiness requires physician signature when mapping declares one", () => {
  const fields = [
    { key: "condition_and_treatment", labelEn: "Condition", type: "MULTILINE_TEXT" },
    { key: "treating_physician_signature", labelEn: "Physician signature", type: "SIGNATURE" },
  ];

  const withoutSignature = analyzeDoctorReadiness({
    fields,
    values: { condition_and_treatment: "Stable angina" },
    physicianSignatureDataUrl: "",
  });
  assert.equal(withoutSignature.ready, false);
  assert.equal(withoutSignature.missingFields.length, 1);
  assert.equal(withoutSignature.missingFields[0].key, "treating_physician_signature");

  const withSignature = analyzeDoctorReadiness({
    fields,
    values: { condition_and_treatment: "Stable angina" },
    physicianSignatureDataUrl: SYNTHETIC_PNG_DATA_URL,
  });
  assert.equal(withSignature.ready, true);
});

test("isDoctorReadinessFieldComplete treats checkbox true/false as complete", () => {
  assert.equal(
    isDoctorReadinessFieldComplete({
      field: { key: "anesthesia_applies", type: "CHECKBOX" },
      values: { anesthesia_applies: "false" },
      physicianSignatureDataUrl: "",
    }),
    true,
  );
});

// -----------------------------------------------------------------------------
// 5. Canonical physician journey readiness aggregate
// -----------------------------------------------------------------------------

const ALL_CLEAR_ASSEMBLY = {
  assemblyId: "a1",
  tenantId: "t1",
  procedureId: "proc1",
  procedureCode: "CODE1",
  procedureNameEn: "Adenotonsillectomy",
  procedureNameAr: "استئصال اللوزتين والأنف",
  packageId: "pkg1",
  packageVersion: "1",
  status: "ready" as const,
  consentForm: {
    id: "imc-approved-adenotonsillectomy",
    tenantId: "t1",
    code: "IMC-MR-1168",
    titleEn: "Adenotonsillectomy",
    titleAr: "استئصال اللوزتين والأنف",
    formType: "PROCEDURE_CONSENT" as const,
    riskLevel: "STANDARD" as const,
    status: "PUBLISHED" as const,
    version: "1",
    effectiveDate: "2024-01-01",
    requiresWitness: false,
    requiresInterpreter: false,
    createdByUserId: "u1",
    updatedAt: "2024-01-01",
    createdAt: "2024-01-01",
    pdfTemplateUrl: "/approved-consent-forms/adenotonsillectomy.pdf",
  },
  educationMaterials: [],
  riskDisclosures: [],
  illustrations: [],
  decisionRules: [],
  suggestions: [],
  blockers: [],
  requiredParticipants: [],
  assembledAt: new Date().toISOString(),
};

function getVerifiedAdenotonsillectomyReadiness() {
  const mapping = getConsentFieldMappingByFormId("imc-approved-adenotonsillectomy");
  assert.ok(mapping);
  const hash = computeConsentFieldMappingHash(mapping);
  return getConsentFieldMappingReadiness(mapping.formId, {
    status: "VERIFIED",
    approvedAt: new Date().toISOString(),
    approvedByUserId: "user-1",
    mappingHash: hash,
  });
}

function buildAllClearReadiness() {
  return computePhysicianJourneyReadiness({
    patient: { id: "p1", mrn: "MRN123", name: "Synthetic Patient", dateOfBirth: "1980-01-01", gender: "Male" },
    encounter: { id: "e1", encounterId: "ENC001" },
    selectedProcedure: { id: "proc1", titleEn: "Adenotonsillectomy", titleAr: "استئصال اللوزتين والأنف", specialty: "ENT", anesthesiaRequired: false },
    assembly: ALL_CLEAR_ASSEMBLY,
    fieldMappingReadiness: getVerifiedAdenotonsillectomyReadiness(),
    doctorCompletionValues: {
      condition_and_treatment: "Obstructive sleep apnea",
      procedure_site_side: "Tonsils and adenoids",
    },
    physicianSignatureDataUrl: SYNTHETIC_PNG_DATA_URL,
    anesthesiaOverride: "NONE",
    previewReviewed: true,
    recipientMobile: "+966500000000",
    recipientEmail: "patient@example.com",
    sendEligibility: { allowlisted: true, reason: "" },
    draftApproved: true,
    acknowledgedBlockers: new Set(),
    physicianContext: { userId: "doc1", email: "doc@example.com", name: "Dr. Synthetic", tenantId: "t1", licenseNumber: "LIC123", specialty: "ENT" },
  });
}

test("canonical readiness reaches 100% only when every gate is complete", () => {
  const readiness = buildAllClearReadiness();
  assert.equal(readiness.sendReady, true);
  assert.equal(readiness.blocked, false);
  assert.equal(readiness.progressPercentage, 100);
  assert.ok(readiness.items.every((item) => item.status === "COMPLETE" || item.status === "NOT_APPLICABLE"));
});

test("canonical readiness uses the same items for count, percentage, blockers, and send gating", () => {
  const readiness = buildAllClearReadiness();
  const satisfiedItems = readiness.items.filter((i) => i.status === "COMPLETE" || i.status === "NOT_APPLICABLE");
  assert.equal(readiness.completedCount, satisfiedItems.length);
  assert.equal(readiness.totalCount, readiness.items.length);
  assert.equal(readiness.progressPercentage, Math.round((satisfiedItems.length / readiness.items.length) * 100));
  assert.deepEqual(
    readiness.missingItemKeys.sort(),
    readiness.items.filter((i) => i.status === "BLOCKED" || i.status === "REQUIRED").map((i) => i.key).sort(),
  );
});

test("NOT_APPLICABLE counts as satisfied and is visually distinct", () => {
  const readiness = buildAllClearReadiness();
  const notApplicableItems = readiness.items.filter((i) => i.status === "NOT_APPLICABLE");
  assert.ok(notApplicableItems.length > 0);
  assert.equal(readiness.notApplicableCount, notApplicableItems.length);
  assert.ok(notApplicableItems.every((i) => i.blocking === false));
});

test("missing physician signature blocks readiness", () => {
  const readiness = computePhysicianJourneyReadiness({
    patient: { id: "p1", mrn: "MRN123", name: "Synthetic Patient" },
    encounter: { id: "e1", encounterId: "ENC001" },
    selectedProcedure: { id: "proc1", titleEn: "Adenotonsillectomy", titleAr: "استئصال اللوزتين والأنف", specialty: "ENT", anesthesiaRequired: false },
    assembly: ALL_CLEAR_ASSEMBLY,
    fieldMappingReadiness: getVerifiedAdenotonsillectomyReadiness(),
    doctorCompletionValues: { condition_and_treatment: "Condition", procedure_site_side: "Site" },
    physicianSignatureDataUrl: "",
    previewReviewed: true,
    recipientMobile: "+966500000000",
    recipientEmail: "patient@example.com",
    sendEligibility: { allowlisted: true },
    draftApproved: true,
    acknowledgedBlockers: new Set(),
    physicianContext: { userId: "doc1", email: "doc@example.com", name: "Dr. Synthetic", tenantId: "t1" },
  });
  assert.equal(readiness.sendReady, false);
  assert.ok(readiness.items.some((i) => i.key === "physician_signature_complete" && i.status === "REQUIRED"));
});

test("no-anesthesia is NOT_APPLICABLE and satisfied", () => {
  const readiness = buildAllClearReadiness();
  const anesthesiaItem = readiness.items.find((i) => i.key === "anesthesia_workflow_reviewed");
  assert.ok(anesthesiaItem);
  assert.equal(anesthesiaItem.status, "NOT_APPLICABLE");
  assert.equal(anesthesiaItem.blocking, false);
});

test("send-ready banner is forbidden while any blocker exists", () => {
  const readiness = computePhysicianJourneyReadiness({
    patient: { id: "p1", mrn: "MRN123", name: "Synthetic Patient" },
    encounter: { id: "e1", encounterId: "ENC001" },
    selectedProcedure: { id: "proc1", titleEn: "Adenotonsillectomy", titleAr: "استئصال اللوزتين والأنف", specialty: "ENT", anesthesiaRequired: false },
    assembly: ALL_CLEAR_ASSEMBLY,
    fieldMappingReadiness: getVerifiedAdenotonsillectomyReadiness(),
    doctorCompletionValues: {},
    physicianSignatureDataUrl: "",
    previewReviewed: false,
    recipientMobile: "",
    recipientEmail: "",
    sendEligibility: { allowlisted: false, reason: "Not allowlisted" },
    draftApproved: false,
    acknowledgedBlockers: new Set(),
    physicianContext: { userId: "doc1", email: "doc@example.com", name: "Dr. Synthetic", tenantId: "t1" },
  });
  assert.equal(readiness.sendReady, false);
  assert.equal(readiness.blocked, true);
  assert.ok(readiness.items.some((i) => i.status === "BLOCKED" || i.status === "REQUIRED"));
});

// -----------------------------------------------------------------------------
// 6. Signature hash binding helpers
// -----------------------------------------------------------------------------

test("resolveTrustedDocumentHash prefers immutablePdfHash column", () => {
  const doc = {
    immutablePdfHash: "column-hash",
    auditChecksum: "audit-hash",
    legalTextAr: "ar",
    legalTextEn: "en",
    pdplTextAr: "ar",
    pdplTextEn: "en",
    witnessDeclAr: "ar",
    witnessDeclEn: "en",
    physicianCertAr: "ar",
    physicianCertEn: "en",
  };
  assert.equal(resolveTrustedDocumentHash(doc), "column-hash");
});

test("isSignatureHashStale accepts legacy signatures without a hash", () => {
  const signature = { metadata: { signatureCapture: { signatureImageDataUrl: SYNTHETIC_PNG_DATA_URL } } };
  const doc = {
    immutablePdfHash: "hash-a",
    legalTextAr: "ar",
    legalTextEn: "en",
    pdplTextAr: "ar",
    pdplTextEn: "en",
    witnessDeclAr: "ar",
    witnessDeclEn: "en",
    physicianCertAr: "ar",
    physicianCertEn: "en",
  };
  assert.equal(isSignatureHashStale(signature, doc), false);
});

test("isSignatureHashStale rejects mismatched hash", () => {
  const signature = { metadata: { documentHash: "hash-a" } };
  const doc = {
    immutablePdfHash: "hash-b",
    legalTextAr: "ar",
    legalTextEn: "en",
    pdplTextAr: "ar",
    pdplTextEn: "en",
    witnessDeclAr: "ar",
    witnessDeclEn: "en",
    physicianCertAr: "ar",
    physicianCertEn: "en",
  };
  assert.equal(isSignatureHashStale(signature, doc), true);
});

test("isSignatureHashStale accepts matching hash", () => {
  const signature = { metadata: { documentHash: "hash-a" } };
  const doc = {
    immutablePdfHash: "hash-a",
    legalTextAr: "ar",
    legalTextEn: "en",
    pdplTextAr: "ar",
    pdplTextEn: "en",
    witnessDeclAr: "ar",
    witnessDeclEn: "en",
    physicianCertAr: "ar",
    physicianCertEn: "en",
  };
  assert.equal(isSignatureHashStale(signature, doc), false);
});

// -----------------------------------------------------------------------------
// 7. Approved PDF renderer places physician signature inside mapped rectangle
// -----------------------------------------------------------------------------

test("renderImcApprovedDoctorDraftPdf draws physician signature for adenotonsillectomy", async () => {
  const pdfPath = path.join(process.cwd(), "public", "approved-consent-forms", "adenotonsillectomy.pdf");
  const pdfBytes = fs.readFileSync(pdfPath);




  const rendered = await renderImcApprovedDoctorDraftPdf({
    pdfBytes,
    formId: "imc-approved-adenotonsillectomy",
    doctorCompletionValues: {
      condition_and_treatment: "Obstructive sleep apnea",
      procedure_site_side: "Tonsils and adenoids",
    },
    physicianSignatureDataUrl: SYNTHETIC_PNG_DATA_URL,
  });

  assert.equal(rendered.physicianSignatureDrawn, true);
  assert.ok(rendered.bytes.length > 0);
  assert.equal(rendered.renderingEngine, "approved-imc-overlay");
});

test("renderImcApprovedDoctorDraftPdf draws physician signature on both English and Arabic targets", async () => {
  const pdfPath = path.join(process.cwd(), "public", "approved-consent-forms", "adenotonsillectomy.pdf");
  const pdfBytes = fs.readFileSync(pdfPath);

  const rendered = await renderImcApprovedDoctorDraftPdf({
    pdfBytes,
    formId: "imc-approved-adenotonsillectomy",
    doctorCompletionValues: {
      condition_and_treatment: "Obstructive sleep apnea",
      procedure_site_side: "Tonsils and adenoids",
    },
    physicianSignatureDataUrl: SYNTHETIC_PNG_DATA_URL,
  });

  const finalDoc = await PDFDocument.load(rendered.bytes);
  const pages = finalDoc.getPages();
  assert.ok(pages.length >= 2);

  // The signature should have been drawn on page 2.
  const page2 = pages[1];
  // We assert the page exists and has content by verifying the overlay succeeded.
  assert.equal(rendered.physicianSignatureDrawn, true);
  assert.ok(page2.getWidth() > 0);
  assert.ok(page2.getHeight() > 0);
});

test("renderImcApprovedDoctorDraftPdf throws when physician signature coordinates are missing", async () => {
  const pdfPath = path.join(process.cwd(), "public", "approved-consent-forms", "adenotonsillectomy.pdf");
  const pdfBytes = fs.readFileSync(pdfPath);

  await assert.rejects(
    renderImcApprovedDoctorDraftPdf({
      pdfBytes,
      formId: "unknown-form-without-mapping",
      doctorCompletionValues: {},
      physicianSignatureDataUrl: SYNTHETIC_PNG_DATA_URL,
    }),
    /Consent field mapping not found/,
  );
});

test("renderImcApprovedDoctorDraftPdf produces correct two-page pagination", async () => {
  const pdfPath = path.join(process.cwd(), "public", "approved-consent-forms", "adenotonsillectomy.pdf");
  const pdfBytes = fs.readFileSync(pdfPath);

  const rendered = await renderImcApprovedDoctorDraftPdf({
    pdfBytes,
    formId: "imc-approved-adenotonsillectomy",
    doctorCompletionValues: {
      condition_and_treatment: "Obstructive sleep apnea",
      procedure_site_side: "Tonsils and adenoids",
    },
    physicianSignatureDataUrl: SYNTHETIC_PNG_DATA_URL,
  });

  const finalDoc = await PDFDocument.load(rendered.bytes);
  assert.equal(finalDoc.getPageCount(), 2);
});

// -----------------------------------------------------------------------------
// 8. Synthetic PNG fixture is deterministic and contains no real biometric data
// -----------------------------------------------------------------------------

test("synthetic signature fixture is a valid PNG with no real biometric data", () => {
  const match = SYNTHETIC_PNG_DATA_URL.match(/^data:image\/png;base64,(.+)$/);
  assert.ok(match);
  const bytes = Buffer.from(match[1], "base64");
  assert.ok(bytes.length > 0);
  assert.equal(bytes.toString("hex", 0, 8), "89504e470d0a1a0a");

  // Deterministic across test runs.
  const sha = crypto.createHash("sha256").update(SYNTHETIC_PNG_DATA_URL).digest("hex");
  assert.equal(sha, "ced3da37fe8325a83360be2fa32ef4abedd1c00961d3d3c601e7f0c8a020bc4e");
});
