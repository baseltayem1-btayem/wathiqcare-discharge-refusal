import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

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
// 5. Physician journey progress reaches 100 when all gates are true
// -----------------------------------------------------------------------------

test("14 readiness gates all true yields 100% progress", () => {
  const mapping = getConsentFieldMappingByFormId("imc-approved-adenotonsillectomy");
  assert.ok(mapping);
  const hash = computeConsentFieldMappingHash(mapping);
  const readiness = getConsentFieldMappingReadiness(mapping.formId, {
    status: "VERIFIED",
    approvedAt: new Date().toISOString(),
    approvedByUserId: "user-1",
    mappingHash: hash,
  });

  const doctorReadiness = analyzeDoctorReadiness({
    fields: readiness.requiredDoctorFields,
    values: {
      condition_and_treatment: "Condition text",
      procedure_site_side: "Site text",
    },
    physicianSignatureDataUrl: SYNTHETIC_PNG_DATA_URL,
  });

  const checks = [
    true, // patientReady
    true, // encounterReady
    true, // procedureSelected
    true, // assemblyReady
    readiness.verificationStatus === "VERIFIED", // fieldMappingVerified
    doctorReadiness.ready, // doctorCompletionReady
    true, // anesthesiaMappingReady
    readiness.requiredPatientFields.length > 0, // patientSignatureMapped
    true, // educationReady
    true, // previewReviewed
    true, // contactAvailable
    true, // allowlisted
    true, // blockersResolved
    true, // draftApproved
  ];

  const completedChecks = checks.filter(Boolean).length;
  const totalChecks = checks.length;
  const progressPercentage = Math.round((completedChecks / totalChecks) * 100);

  assert.equal(totalChecks, 14);
  assert.equal(completedChecks, 14);
  assert.equal(progressPercentage, 100);
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
