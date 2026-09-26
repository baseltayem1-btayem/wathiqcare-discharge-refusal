import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import fs from "node:fs";
import type { Browser } from "puppeteer";

(process.env as Record<string, string>).NODE_ENV = "test";
process.env.SIGNING_TOKEN_SECRET = "test-signing-token-secret-32-bytes-long!!";
process.env.RECIPIENT_HASH_PEPPER = "test-recipient-hash-pepper-32-bytes!!";
process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://dummy";
process.env.RECIPIENT_RESOLVER_DISABLE_DB = "true";
process.env.SIGNING_BASE_URL = "https://localhost:3000/sign";
process.env.SIGNING_URL_APPROVED_HOSTS = "localhost,127.0.0.1,test.wathiqcare.local";

import {
  sha256Hex,
  computeDraftFingerprint,
} from "@/lib/server/acroform/filled-draft-preview-service";
import { getAcroFormTemplateDiagnostics } from "@/lib/server/acroform/acroform-diagnostics-service";
import {
  sendModuleSecureSigningLink,
  deriveSendRootOperationKey,
} from "@/lib/server/module-secure-signing-service";
import {
  resolveGovernedPatientCopyUrl,
  documentRequiresGovernedPatientCopy,
} from "@/lib/server/public-signing-document-service";
import { createMemoryPrismaClient } from "@/lib/server/test-helpers/memory-prisma-client";
import { createFakeSmsGateway } from "@/lib/server/fake-sms-gateway";
import {
  registerTestRecipient,
  clearTestRecipients,
} from "@/lib/server/recipient-resolution-service";

const TINY_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=";

function createMockBrowser(): Browser {
  return {
    newPage: async () => ({
      setViewport: async () => {},
      setContent: async () => {},
      emulateMediaType: async () => {},
      evaluate: async () => {},
      screenshot: async () => Buffer.from(TINY_PNG_BASE64, "base64"),
      close: async () => {},
    }),
    close: async () => {},
  } as unknown as Browser;
}

function loadCanonicalAmputationPdf(): Uint8Array {
  const candidates = [
    path.join(process.cwd(), "public", "approved-consent-forms", "amputation.pdf"),
    path.join(process.cwd(), "apps", "web", "public", "approved-consent-forms", "amputation.pdf"),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return fs.readFileSync(candidate);
    }
  }
  throw new Error("Canonical amputation PDF not found for test");
}

function buildDoctorCompletionValues(): Record<string, string> {
  return {
    condition_description_en: "TEST CONDITION EN",
    condition_description_ar: "حالة تجريبية",
    proposed_procedure_en: "TEST PROCEDURE EN",
    proposed_procedure_ar: "إجراء تجريبي",
    significant_risks_options_en: "TEST RISKS EN",
    significant_risks_options_ar: "مخاطر تجريبية",
    risks_without_procedure_en: "TEST NON PROCEDURE RISKS EN",
    risks_without_procedure_ar: "مخاطر عدم الإجراء",
    physician_name: "SYNTHETIC PHYSICIAN",
    physician_designation: "TEST DESIGNATION",
    interpreter_required: "false",
    interpreter_present: "false",
    anesthesia_applies: "false",
    education_amputation_sheet_provided: "true",
  };
}

function buildDocumentMetadata(fingerprint?: string): Record<string, unknown> {
  const diagnostics = getAcroFormTemplateDiagnostics("imc-approved-amputation");
  return {
    approvedConsentFormId: "imc-approved-amputation",
    approvedPdfUrl: "/approved-consent-forms/amputation.pdf",
    pdfTemplateUrl: "/approved-consent-forms/amputation.pdf",
    doctorCompletionValues: buildDoctorCompletionValues(),
    patientDisplay: {
      name: "SYNTHETIC PATIENT",
      mrn: "TEST-MRN-1135",
      dob: "1985-03-15",
    },
    physicianContext: {
      name: "SYNTHETIC PHYSICIAN",
      designation: "TEST DESIGNATION",
    },
    encounterReference: {
      id: "enc-1",
      encounterId: "ENC-1",
    },
    fieldMappingReadiness: {
      formId: "imc-approved-amputation",
      acroForm: {
        manifestState: {
          hash: diagnostics.manifestHash,
        },
      },
    },
    filledDraftReviewed: true,
    filledDraftFingerprint: fingerprint ?? "",
  };
}

function computeFingerprintForValues(values: Record<string, string>): string {
  const pdfBytes = loadCanonicalAmputationPdf();
  const diagnostics = getAcroFormTemplateDiagnostics("imc-approved-amputation");
  return computeDraftFingerprint({
    formId: "imc-approved-amputation",
    formVersion: diagnostics.manifestHash ? "2018-02" : "1.0",
    canonicalPdfHash: sha256Hex(pdfBytes),
    manifestHash: diagnostics.manifestHash ?? "",
    doctorCompletionValues: values,
    patientDisplay: { name: "SYNTHETIC PATIENT", mrn: "TEST-MRN-1135", dob: "1985-03-15" },
    physicianContext: { name: "SYNTHETIC PHYSICIAN", designation: "TEST DESIGNATION" },
    encounterReference: { id: "enc-1", encounterId: "ENC-1" },
  });
}

function buildConsentDocument(fingerprint?: string): {
  id: string;
  tenantId: string;
  patientName: string;
  mrn: string;
  dob: string;
  physicianName: string;
  physicianSpecialty: string;
  metadata: Record<string, unknown>;
} {
  return {
    id: "doc-1135",
    tenantId: "tenant-1",
    patientName: "SYNTHETIC PATIENT",
    mrn: "TEST-MRN-1135",
    dob: "1985-03-15",
    physicianName: "SYNTHETIC PHYSICIAN",
    physicianSpecialty: "TEST DESIGNATION",
    metadata: buildDocumentMetadata(fingerprint),
  };
}

function baseSendArgs(filledDraftFingerprint?: string) {
  return {
    tenantId: "tenant-1",
    initiatedBy: "physician-1",
    moduleKey: "informed_consent" as const,
    moduleType: "informed_consent" as const,
    documentId: "doc-1135",
    caseId: "case-1135",
    patientName: "SYNTHETIC PATIENT",
    mobileNumber: "+966501234567",
    recipientEmail: "patient@example.com",
    locale: "ar" as const,
    approvedConsentFormKey: "imc-approved-amputation",
    approvedTemplateVersionId: "v1",
    immutablePdfHash: "immutable-hash-1135",
    filledDraftFingerprint,
  };
}

test("deriveSendRootOperationKey changes when filled draft fingerprint changes", () => {
  const base = {
    tenantId: "tenant-1",
    caseId: "case-1135",
    documentId: "doc-1135",
    approvedConsentFormKey: "imc-approved-amputation" as const,
    approvedTemplateVersionId: "v1",
    immutablePdfHash: "immutable-hash-1135",
    mobileNumber: "+966501234567",
    recipientEmail: "patient@example.com",
    locale: "ar" as const,
  };

  const withoutFingerprint = deriveSendRootOperationKey(base);
  const withFingerprintA = deriveSendRootOperationKey({ ...base, filledDraftFingerprint: "fp-a" });
  const withFingerprintA2 = deriveSendRootOperationKey({ ...base, filledDraftFingerprint: "fp-a" });
  const withFingerprintB = deriveSendRootOperationKey({ ...base, filledDraftFingerprint: "fp-b" });

  assert.equal(withFingerprintA, withFingerprintA2);
  assert.notEqual(withoutFingerprint, withFingerprintA);
  assert.notEqual(withFingerprintA, withFingerprintB);
});

function seedSmsDeliveryRecipient() {
  registerTestRecipient("tenant-1", "case:case-1135:mobile", { mobile: "+966501234567" });
}

test("sendModuleSecureSigningLink reuses the same session for identical governed identity", async () => {
  const client = createMemoryPrismaClient();
  const gateway = createFakeSmsGateway();
  const fingerprint = computeFingerprintForValues(buildDoctorCompletionValues());
  client.setConsentDocument(buildConsentDocument(fingerprint));
  seedSmsDeliveryRecipient();

  try {
    const first = await sendModuleSecureSigningLink({
      ...baseSendArgs(fingerprint),
      browser: createMockBrowser(),
      smsGateway: gateway,
      client: client as unknown as import("@prisma/client").PrismaClient,
    });

    const second = await sendModuleSecureSigningLink({
      ...baseSendArgs(fingerprint),
      browser: createMockBrowser(),
      smsGateway: gateway,
      client: client as unknown as import("@prisma/client").PrismaClient,
    });

    assert.equal(first.sessionId, second.sessionId);
    assert.equal(gateway.calls.length, 1, "identical identity must not resend the SMS");
    assert.equal(client.sessions.filter((s) => s.status !== "REVOKED").length, 1);
  } finally {
    clearTestRecipients();
  }
});

test("resolveGovernedPatientCopyUrl returns the patient-copy endpoint when governed copy is bound", async () => {
  const client = createMemoryPrismaClient();
  client.signingSession.create({
    data: {
      tenantId: "tenant-1",
      documentId: "doc-1135",
      moduleType: "informed_consent",
      providerKey: "internal_secure_link",
      status: "PENDING",
      requiredSigners: ["PATIENT"],
      completedSigners: [],
      signerLinks: {},
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      initiatedById: "physician-1",
      idempotencyKey: "key-1",
      idempotencyFingerprint: "fp-1",
      metadata: {
        governedPatientCopy: {
          pdfHash: "abc123",
          pdfBytesBase64: "dGVzdA==",
          fingerprint: "fp-1135",
        },
      },
    },
  });

  const url = await resolveGovernedPatientCopyUrl({
    token: "token-1",
    tenantId: "tenant-1",
    sessionId: client.sessions[0].id,
    client: client as unknown as import("@prisma/client").PrismaClient,
  });

  assert.ok(url);
  assert.match(url, /patient-copy-pdf$/);
});

test("resolveGovernedPatientCopyUrl returns null when governed copy is missing", async () => {
  const client = createMemoryPrismaClient();
  client.signingSession.create({
    data: {
      tenantId: "tenant-1",
      documentId: "doc-1135",
      moduleType: "informed_consent",
      providerKey: "internal_secure_link",
      status: "PENDING",
      requiredSigners: ["PATIENT"],
      completedSigners: [],
      signerLinks: {},
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      initiatedById: "physician-1",
      idempotencyKey: "key-1",
      idempotencyFingerprint: "fp-1",
      metadata: {},
    },
  });

  const url = await resolveGovernedPatientCopyUrl({
    token: "token-1",
    tenantId: "tenant-1",
    sessionId: client.sessions[0].id,
    client: client as unknown as import("@prisma/client").PrismaClient,
  });

  assert.equal(url, null);
});

test("documentRequiresGovernedPatientCopy is true for acroform-backed metadata", () => {
  assert.equal(
    documentRequiresGovernedPatientCopy({
      id: "doc-1135",
      metadata: buildDocumentMetadata("some-fingerprint"),
    }),
    true,
  );
});

test("documentRequiresGovernedPatientCopy is false for non-acroform metadata", () => {
  assert.equal(
    documentRequiresGovernedPatientCopy({
      id: "doc-legacy",
      metadata: { source: "legacy" },
    }),
    false,
  );
});
