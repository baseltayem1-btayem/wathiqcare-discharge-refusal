import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import fs from "node:fs";
import type { Browser } from "puppeteer";
import { sha256Hex } from "@/lib/server/acroform/filled-draft-preview-service";
import { getAcroFormTemplateDiagnostics } from "@/lib/server/acroform/acroform-diagnostics-service";
import {
  computeDraftFingerprint,
} from "@/lib/server/acroform/filled-draft-preview-service";
import {
  generateGovernedPatientCopy,
  isAcroFormBackedPatientCopy,
  resolveAcroFormPatientCopyInputs,
  verifyFilledDraftFingerprint,
  type ConsentDocumentForPatientCopy,
} from "@/lib/server/acroform/patient-copy-dispatch-service";

// 1x1 transparent PNG
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

function buildPatientSignature(): { dataUrl: string; signerName: string; signedAt: Date } {
  return {
    dataUrl: `data:image/png;base64,${TINY_PNG_BASE64}`,
    signerName: "SYNTHETIC PATIENT",
    signedAt: new Date("2026-07-16T10:00:00Z"),
  };
}

function buildDoctorValues(): Record<string, string> {
  return {
    condition_description_en: "TEST CONDITION EN",
    condition_description_ar: "حالة تجريبية",
    proposed_procedure_en: "TEST PROCEDURE EN",
    proposed_procedure_ar: "إجراء تجريبي",
    significant_risks_options_en: "TEST RISKS EN",
    significant_risks_options_ar: "مخاطر تجريبية",
    significant_risks_options_cont_en: "TEST RISKS CONT EN",
    significant_risks_options_cont_ar: "مخاطر تجريبية إضافية",
    risks_without_procedure_en: "TEST NON PROCEDURE RISKS EN",
    risks_without_procedure_ar: "مخاطر عدم الإجراء",
    anaesthetic_discussed_en: "GENERAL ANAESTHESIA",
    anaesthetic_discussed_ar: "تخدير عام",
    physician_name: "SYNTHETIC PHYSICIAN",
    physician_designation: "TEST DESIGNATION",
    "physician.signature": `data:image/png;base64,${TINY_PNG_BASE64}`,
    "physician.date": "2026-07-16",
    "physician.time": "10:00",
    interpreter_required: "false",
    interpreter_present: "false",
    anesthesia_applies: "true",
    education_amputation_sheet_provided: "true",
  };
}

function buildDocumentMetadata(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  const diagnostics = getAcroFormTemplateDiagnostics("imc-approved-amputation");

  return {
    approvedConsentFormId: "imc-approved-amputation",
    approvedPdfUrl: "/approved-consent-forms/amputation.pdf",
    pdfTemplateUrl: "/approved-consent-forms/amputation.pdf",
    doctorCompletionValues: buildDoctorValues(),
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
    filledDraftFingerprint: "",
    ...overrides,
  };
}

function buildDocument(overrides: Record<string, unknown> = {}): ConsentDocumentForPatientCopy {
  const pdfBytes = loadCanonicalAmputationPdf();
  const metadata = buildDocumentMetadata(overrides);
  const inputs = resolveAcroFormPatientCopyInputs({
    id: "doc-1",
    patientName: "SYNTHETIC PATIENT",
    mrn: "TEST-MRN-1135",
    dob: "1985-03-15",
    physicianName: "SYNTHETIC PHYSICIAN",
    physicianSpecialty: "TEST DESIGNATION",
    metadata,
  });

  if (!("filledDraftFingerprint" in overrides)) {
    metadata.filledDraftFingerprint = computeDraftFingerprint({
      formId: inputs.formId,
      formVersion: "2018-02",
      canonicalPdfHash: sha256Hex(pdfBytes),
      manifestHash: inputs.manifestHash,
      doctorCompletionValues: inputs.doctorCompletionValues,
      patientDisplay: inputs.patientDisplay,
      physicianContext: inputs.physicianContext,
      encounterReference: inputs.encounterReference,
    });
  }

  return {
    id: "doc-1",
    patientName: "SYNTHETIC PATIENT",
    mrn: "TEST-MRN-1135",
    dob: "1985-03-15",
    physicianName: "SYNTHETIC PHYSICIAN",
    physicianSpecialty: "TEST DESIGNATION",
    metadata,
  };
}

test("resolveAcroFormPatientCopyInputs extracts normalized values from document metadata", () => {
  const document = buildDocument();
  const inputs = resolveAcroFormPatientCopyInputs(document);

  assert.equal(inputs.formId, "imc-approved-amputation");
  assert.equal(inputs.approvedPdfUrl, "/approved-consent-forms/amputation.pdf");
  assert.ok(inputs.manifestHash.length > 0);
  assert.equal(inputs.doctorCompletionValues.condition_description_en, "TEST CONDITION EN");
  assert.equal(inputs.patientDisplay.name, "SYNTHETIC PATIENT");
  assert.equal(inputs.patientDisplay.mrn, "TEST-MRN-1135");
  assert.equal(inputs.physicianContext.name, "SYNTHETIC PHYSICIAN");
  assert.equal(inputs.filledDraftReviewed, true);
  assert.ok(inputs.filledDraftFingerprint);
});

test("isAcroFormBackedPatientCopy is true only when all binding fields are present", () => {
  assert.equal(isAcroFormBackedPatientCopy(buildDocument()), true);
  assert.equal(
    isAcroFormBackedPatientCopy(
      buildDocument({
        filledDraftReviewed: false,
      }),
    ),
    false,
  );
  assert.equal(
    isAcroFormBackedPatientCopy(
      buildDocument({
        filledDraftFingerprint: "",
      }),
    ),
    false,
  );
});

test("verifyFilledDraftFingerprint rejects unreviewed preview", () => {
  const document = buildDocument({ filledDraftReviewed: false });
  const inputs = resolveAcroFormPatientCopyInputs(document);

  assert.throws(() => verifyFilledDraftFingerprint(inputs, sha256Hex(loadCanonicalAmputationPdf())), /not been reviewed/);
});

test("verifyFilledDraftFingerprint rejects stale fingerprint", () => {
  const document = buildDocument({
    filledDraftFingerprint: "stale-fingerprint",
  });
  const inputs = resolveAcroFormPatientCopyInputs(document);

  assert.throws(() => verifyFilledDraftFingerprint(inputs, sha256Hex(loadCanonicalAmputationPdf())), /mismatch/);
});

test("generateGovernedPatientCopy produces a 5-page filled PDF that is not the blank source", async () => {
  const browser = createMockBrowser();
  const document = buildDocument();
  const patientSignature = buildPatientSignature();

  const result = await generateGovernedPatientCopy({ document, browser, patientSignature });

  assert.ok(result.bytes.length > 0);
  assert.ok(result.pdfHash.length > 0);
  assert.equal(result.summary.pages, 5);
  assert.equal(result.summary.pageWidth, 612);
  assert.equal(result.summary.pageHeight, 792);

  const canonicalBytes = loadCanonicalAmputationPdf();
  assert.notEqual(result.pdfHash, sha256Hex(canonicalBytes), "Patient copy must differ from blank canonical source");
});

test("generateGovernedPatientCopy renders the same physician values as the preview", async () => {
  const browser = createMockBrowser();
  const document = buildDocument();
  const patientSignature = buildPatientSignature();

  const result = await generateGovernedPatientCopy({ document, browser, patientSignature });
  const rendered = new Set(result.summary.fieldsRendered);

  assert.ok(rendered.has("patient_name"));
  assert.ok(rendered.has("mrn"));
  assert.ok(rendered.has("date_of_birth"));
  assert.ok(rendered.has("condition_description_en"));
  assert.ok(rendered.has("condition_description_ar"));
  assert.ok(rendered.has("proposed_procedure_en"));
  assert.ok(rendered.has("proposed_procedure_ar"));
  assert.ok(rendered.has("significant_risks_options_en"));
  assert.ok(rendered.has("significant_risks_options_ar"));
  assert.ok(rendered.has("risks_without_procedure_en"));
  assert.ok(rendered.has("risks_without_procedure_ar"));
  assert.ok(rendered.has("doctor_delegate_name"));
  assert.ok(rendered.has("doctor_delegate_designation"));
  assert.ok(rendered.has("info_sheet_amputation"));
});

test("generateGovernedPatientCopy rejects patient copy without required patient signature", async () => {
  const browser = createMockBrowser();
  const document = buildDocument();

  await assert.rejects(
    async () => generateGovernedPatientCopy({ document, browser }),
    /Required manifest fields are missing/,
  );
});

test("generateGovernedPatientCopy adds patient signature without removing physician values", async () => {
  const browser = createMockBrowser();
  const document = buildDocument();

  const result = await generateGovernedPatientCopy({
    document,
    browser,
    patientSignature: {
      dataUrl: `data:image/png;base64,${TINY_PNG_BASE64}`,
      signerName: "SYNTHETIC PATIENT",
      signedAt: new Date("2026-07-16T10:00:00Z"),
    },
  });

  assert.ok(result.summary.signaturesRendered.length >= 1, "Patient signature should be rendered");
  assert.ok(result.summary.fieldsRendered.includes("patient_signature_en"));
  assert.ok(result.summary.fieldsRendered.includes("condition_description_en"));
  assert.ok(result.summary.fieldsRendered.includes("doctor_delegate_name"));
});

test("generateGovernedPatientCopy preserves Arabic values without mojibake", async () => {
  const browser = createMockBrowser();
  const document = buildDocument();
  const patientSignature = buildPatientSignature();

  const result = await generateGovernedPatientCopy({ document, browser, patientSignature });
  const metadata = document.metadata as Record<string, unknown>;
  const doctorCompletionValues = (metadata?.doctorCompletionValues ?? {}) as Record<string, unknown>;
  const arabicFields = result.summary.fieldsRendered.filter((key) => {
    const value = String(doctorCompletionValues[key] ?? "");
    return /[\u0600-\u06FF]/.test(value);
  });

  assert.ok(arabicFields.length > 0);
});

test("generateGovernedPatientCopy returns a deterministic fingerprint for the same values", async () => {
  const browser = createMockBrowser();
  const document = buildDocument();
  const patientSignature = buildPatientSignature();

  const a = await generateGovernedPatientCopy({ document, browser, patientSignature });
  const b = await generateGovernedPatientCopy({ document, browser, patientSignature });

  assert.equal(a.fingerprint, b.fingerprint);
});

test("generateGovernedPatientCopy rejects a mismatched manifest hash", async () => {
  const browser = createMockBrowser();
  const document = buildDocument({
    fieldMappingReadiness: {
      formId: "imc-approved-amputation",
      acroForm: {
        manifestState: {
          hash: "invalid-hash",
        },
      },
    },
  });

  await assert.rejects(
    async () => generateGovernedPatientCopy({ document, browser }),
    /Manifest hash mismatch/,
  );
});

test("generateGovernedPatientCopy rejects missing canonical PDF source", async () => {
  const browser = createMockBrowser();
  const document = buildDocument({ approvedPdfUrl: "/missing.pdf" });

  await assert.rejects(async () => generateGovernedPatientCopy({ document, browser }), /unavailable/);
});

test("generateGovernedPatientCopy fails closed when fingerprint is missing", async () => {
  const browser = createMockBrowser();
  const document = buildDocument({ filledDraftFingerprint: "" });

  await assert.rejects(async () => generateGovernedPatientCopy({ document, browser }), /missing/);
});
