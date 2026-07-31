import assert from "node:assert/strict";
import test from "node:test";
import { parseAcroFormFilledDraftRequest } from "@/lib/server/draft-pdf-request-parser";
import { createAcroFormFilledDraftPreview } from "@/components/informed-consents/production-workspace/lib/api";

const VALID_BODY = {
  formId: "imc-approved-amputation",
  approvedPdfUrl: "/approved-consent-forms/amputation.pdf",
  manifestHash: "verified-manifest-hash-1135",
  doctorCompletionValues: {
    condition_description_en: "TEST CONDITION EN",
    condition_description_ar: "حالة تجريبية",
    proposed_procedure_en: "TEST PROCEDURE EN",
    proposed_procedure_ar: "إجراء تجريبي",
    physician_name: "SYNTHETIC PHYSICIAN",
  },
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
};

test("parseAcroFormFilledDraftRequest accepts a complete canonical payload", () => {
  const { request, missing } = parseAcroFormFilledDraftRequest("imc-approved-amputation", VALID_BODY);
  assert.equal(missing.length, 0);
  assert.equal(request.formId, "imc-approved-amputation");
  assert.equal(request.approvedPdfUrl, "/approved-consent-forms/amputation.pdf");
  assert.equal(request.manifestHash, "verified-manifest-hash-1135");
  assert.equal(request.patientDisplay.name, "SYNTHETIC PATIENT");
  assert.equal(request.patientDisplay.mrn, "TEST-MRN-1135");
  assert.equal(request.physicianContext.name, "SYNTHETIC PHYSICIAN");
  assert.equal(request.physicianContext.designation, "TEST DESIGNATION");
  assert.equal(request.encounterReference?.encounterId, "ENC-1");
});

test("parseAcroFormFilledDraftRequest rejects missing patientDisplay", () => {
  const { missing } = parseAcroFormFilledDraftRequest("imc-approved-amputation", {
    ...VALID_BODY,
    patientDisplay: undefined,
  });
  assert.ok(missing.includes("patientDisplay"));
});

test("parseAcroFormFilledDraftRequest rejects missing physicianContext", () => {
  const { missing } = parseAcroFormFilledDraftRequest("imc-approved-amputation", {
    ...VALID_BODY,
    physicianContext: undefined,
  });
  assert.ok(missing.includes("physicianContext"));
});

test("parseAcroFormFilledDraftRequest rejects missing manifestHash", () => {
  const { missing } = parseAcroFormFilledDraftRequest("imc-approved-amputation", {
    ...VALID_BODY,
    manifestHash: undefined,
  });
  assert.ok(missing.includes("manifestHash"));
});

test("parseAcroFormFilledDraftRequest rejects missing patientDisplay.name", () => {
  const { missing } = parseAcroFormFilledDraftRequest("imc-approved-amputation", {
    ...VALID_BODY,
    patientDisplay: { mrn: "TEST-MRN-1135" },
  });
  assert.ok(missing.includes("patientDisplay.name"));
});

test("parseAcroFormFilledDraftRequest rejects missing patientDisplay.mrn", () => {
  const { missing } = parseAcroFormFilledDraftRequest("imc-approved-amputation", {
    ...VALID_BODY,
    patientDisplay: { name: "SYNTHETIC PATIENT" },
  });
  assert.ok(missing.includes("patientDisplay.mrn"));
});

test("parseAcroFormFilledDraftRequest rejects missing physicianContext.name", () => {
  const { missing } = parseAcroFormFilledDraftRequest("imc-approved-amputation", {
    ...VALID_BODY,
    physicianContext: { designation: "TEST DESIGNATION" },
  });
  assert.ok(missing.includes("physicianContext.name"));
});

test("parseAcroFormFilledDraftRequest rejects missing patientDisplay.dob", () => {
  const { missing } = parseAcroFormFilledDraftRequest("imc-approved-amputation", {
    ...VALID_BODY,
    patientDisplay: { name: "SYNTHETIC PATIENT", mrn: "TEST-MRN-1135" },
  });
  assert.ok(missing.includes("patientDisplay.dob"));
});

test("parseAcroFormFilledDraftRequest rejects empty patientDisplay.dob", () => {
  const { missing } = parseAcroFormFilledDraftRequest("imc-approved-amputation", {
    ...VALID_BODY,
    patientDisplay: { name: "SYNTHETIC PATIENT", mrn: "TEST-MRN-1135", dob: "   " },
  });
  assert.ok(missing.includes("patientDisplay.dob"));
});

test("createAcroFormFilledDraftPreview sends the canonical required fields", async () => {
  const captured: { url: string; init: RequestInit }[] = [];
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    captured.push({ url: String(input), init: init ?? {} });
    return new Response(new Blob(["%PDF-1.4"], { type: "application/pdf" }), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "X-WathiqCare-Draft-Fingerprint": "synthetic-fingerprint",
      },
    });
  };

  try {
    const result = await createAcroFormFilledDraftPreview({
      formId: "imc-approved-amputation",
      approvedPdfUrl: "/approved-consent-forms/amputation.pdf",
      manifestHash: "verified-manifest-hash-1135",
      doctorCompletionValues: VALID_BODY.doctorCompletionValues,
      patientDisplay: VALID_BODY.patientDisplay,
      physicianContext: VALID_BODY.physicianContext,
      encounterReference: VALID_BODY.encounterReference,
    });

    assert.equal(captured.length, 1);
    const body = JSON.parse(String(captured[0].init.body));
    assert.equal(body.approvedPdfUrl, "/approved-consent-forms/amputation.pdf");
    assert.equal(body.manifestHash, "verified-manifest-hash-1135");
    assert.equal(body.patientDisplay.name, "SYNTHETIC PATIENT");
    assert.equal(body.patientDisplay.mrn, "TEST-MRN-1135");
    assert.equal(body.physicianContext.name, "SYNTHETIC PHYSICIAN");
    assert.equal(body.physicianContext.designation, "TEST DESIGNATION");
    assert.equal(body.encounterReference.encounterId, "ENC-1");
    assert.ok(result.fingerprint);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
