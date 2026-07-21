import assert from "node:assert/strict";
import test from "node:test";

(process.env as Record<string, string>).NODE_ENV = "test";
process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://dummy";

import { createAcroFormFilledDraftPreview } from "@/components/informed-consents/production-workspace/lib/api";

const sampleInput = {
  formId: "imc-approved-amputation",
  approvedPdfUrl: "/approved-consent-forms/amputation.pdf",
  manifestHash: "manifest-hash-abc123",
  doctorCompletionValues: {
    condition_description_en: "Diabetic foot infection.",
    condition_description_ar: "عدوى القدم السكرية.",
  },
  patientDisplay: {
    name: "Test Patient",
    mrn: "MRN-000001",
    dob: "1985-03-15",
  },
  physicianContext: {
    name: "Dr. Ahmed",
    designation: "Orthopedic Surgery",
  },
  encounterReference: {
    id: "enc-1",
    encounterId: "ENC-1",
  },
};

type FetchMockState = {
  input?: RequestInfo | URL;
  init?: RequestInit;
};

function installFetchMock(response: Response): { restore: () => void; state: FetchMockState } {
  const state: FetchMockState = {};
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    if (init?.signal?.aborted) {
      const error = new Error("The operation was aborted.");
      error.name = "AbortError";
      throw error;
    }
    state.input = input;
    state.init = init;
    return response;
  };
  return {
    restore: () => {
      globalThis.fetch = originalFetch;
    },
    state,
  };
}

test("createAcroFormFilledDraftPreview POSTs to the canonical draft-pdf endpoint", async () => {
  const pdfBytes = Buffer.from("%PDF-1.4 fake pdf");
  const headers = new Headers();
  headers.set("X-WathiqCare-Draft-Fingerprint", "fp-test-123");
  headers.set("Content-Type", "application/pdf");

  const { restore, state } = installFetchMock(
    new Response(pdfBytes, { status: 200, headers }),
  );

  let resultUrl: string | undefined;
  try {
    const result = await createAcroFormFilledDraftPreview(sampleInput);
    resultUrl = result.url;

    assert.ok(resultUrl);
    assert.equal(result.fingerprint, "fp-test-123");

    assert.equal(state.input, "/api/modules/informed-consents/forms/imc-approved-amputation/draft-pdf");
    assert.equal(state.init?.method, "POST");
    const requestHeaders = state.init?.headers as Record<string, string> | undefined;
    assert.equal(requestHeaders?.["Content-Type"], "application/json");
    assert.equal(requestHeaders?.Accept, "application/pdf");

    const body = JSON.parse(state.init?.body as string) as Record<string, unknown>;
    assert.equal(body.approvedPdfUrl, sampleInput.approvedPdfUrl);
    assert.equal(body.manifestHash, sampleInput.manifestHash);
    assert.deepEqual(body.patientDisplay, sampleInput.patientDisplay);
    assert.deepEqual(body.physicianContext, sampleInput.physicianContext);
    assert.ok(body.doctorCompletionValues);
    assert.equal(body.correlationId, undefined);
  } finally {
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    restore();
  }
});

test("createAcroFormFilledDraftPreview surfaces errors without fallback", async () => {
  const { restore } = installFetchMock(
    new Response(JSON.stringify({ error: "Manifest hash mismatch" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    }),
  );

  try {
    await assert.rejects(
      () => createAcroFormFilledDraftPreview(sampleInput),
      /Manifest hash mismatch/,
    );
  } finally {
    restore();
  }
});

test("createAcroFormFilledDraftPreview honors abort signal", async () => {
  const { restore } = installFetchMock(
    new Response(Buffer.from("%PDF-1.4"), {
      status: 200,
      headers: { "Content-Type": "application/pdf" },
    }),
  );

  const controller = new AbortController();
  controller.abort();

  try {
    await assert.rejects(
      () => createAcroFormFilledDraftPreview(sampleInput, controller.signal),
      (error: unknown) => error instanceof Error && error.name === "AbortError",
    );
  } finally {
    restore();
  }
});
