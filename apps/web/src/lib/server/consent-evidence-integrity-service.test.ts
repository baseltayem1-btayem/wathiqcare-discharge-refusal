import assert from "node:assert/strict";
import test from "node:test";

import {
  buildEvidenceIntegritySnapshot,
  computeEvidencePackageChecksum,
} from "./consent-evidence-integrity-service";

function makeDoc(overrides?: {
  signatureHash?: string | null;
  signedVersionLinkage?: Record<string, unknown> | null;
  immutablePdfHash?: string | null;
}): Parameters<typeof buildEvidenceIntegritySnapshot>[0]["doc"] {
  return {
    id: "doc-1",
    consentReference: "IC-2026-0001",
    status: "FINALIZED",
    immutablePdfUrl: "https://example.com/final.pdf",
    immutablePdfHash: overrides?.immutablePdfHash ?? "pdf-hash-64",
    finalizedAt: new Date("2026-06-27T10:00:00.000Z"),
    finalizedByUserId: "user-1",
    patientName: "Ahmad",
    mrn: "MRN123",
    dob: "1980-01-01",
    gender: "M",
    caseId: "case-1",
    diagnosis: "Appendicitis",
    plannedProcedure: "Appendectomy",
    department: "Surgery",
    physicianName: "Dr. Sara",
    physicianLicense: "MD-123",
    physicianSpecialty: "Surgery",
    metadata: {
      finalizedWordingSnapshot: {
        legalTextAr: "arabic",
        legalTextEn: "english",
        documentVersion: "1.0",
      },
      signedVersionLinkage: overrides?.signedVersionLinkage ?? {
        templateVersion: { id: "tv-1", versionLabel: "1.0" },
      },
      qrPayload: "QR",
    },
    template: { id: "t-1", templateCode: "APPENDECTOMY" },
    templateVersion: { id: "tv-1", versionLabel: "1.0", status: "ACTIVE" },
    signatures: [
      {
        id: "sig-1",
        role: "PHYSICIAN",
        signerName: "Dr. Sara",
        signedAt: new Date("2026-06-27T09:55:00.000Z"),
        signatureMethod: "OTP",
        signatureHash: overrides?.signatureHash ?? "signature-hash-64",
        metadata: { capturedBy: "system" },
      },
    ],
    auditEvents: [{ id: "ae-1", action: "consent_document_finalized", createdAt: new Date("2026-06-27T10:00:00.000Z"), metadata: {} }],
    timelineEvents: [{ id: "te-1", action: "FINALIZED", createdAt: new Date("2026-06-27T10:00:00.000Z"), metadata: {} }],
  };
}

test("evidence integrity snapshot includes signature hashes and version linkage", () => {
  const snapshot = buildEvidenceIntegritySnapshot({ doc: makeDoc() });

  assert.equal((snapshot.signatures as unknown[]).length, 1);
  const firstSignature = (snapshot.signatures as Array<Record<string, unknown>>)[0];
  assert.equal(firstSignature.signatureHash, "signature-hash-64");
  assert.ok(snapshot.signedVersionLinkage);
  assert.equal((snapshot.signedVersionLinkage as Record<string, unknown>).templateVersion ? "present" : "missing", "present");
  assert.ok(snapshot.finalPdfHash);
  assert.ok((snapshot.auditEventIds as string[]).includes("ae-1"));
});

test("evidence package checksum is deterministic", () => {
  const doc = makeDoc();
  const first = computeEvidencePackageChecksum(buildEvidenceIntegritySnapshot({ doc }));
  const second = computeEvidencePackageChecksum(buildEvidenceIntegritySnapshot({ doc }));
  assert.equal(first, second);
  assert.equal(first.length, 64);
});

test("evidence package checksum changes when signature hash changes", () => {
  const baseline = computeEvidencePackageChecksum(buildEvidenceIntegritySnapshot({ doc: makeDoc() }));
  const tampered = computeEvidencePackageChecksum(
    buildEvidenceIntegritySnapshot({ doc: makeDoc({ signatureHash: "different-hash" }) }),
  );
  assert.notEqual(baseline, tampered);
});

test("evidence package checksum changes when PDF hash changes", () => {
  const baseline = computeEvidencePackageChecksum(buildEvidenceIntegritySnapshot({ doc: makeDoc() }));
  const tampered = computeEvidencePackageChecksum(
    buildEvidenceIntegritySnapshot({ doc: makeDoc({ immutablePdfHash: "different-pdf-hash" }) }),
  );
  assert.notEqual(baseline, tampered);
});

test("evidence package checksum changes when version linkage changes", () => {
  const baseline = computeEvidencePackageChecksum(buildEvidenceIntegritySnapshot({ doc: makeDoc() }));
  const tampered = computeEvidencePackageChecksum(
    buildEvidenceIntegritySnapshot({
      doc: makeDoc({ signedVersionLinkage: { templateVersion: { id: "tv-2", versionLabel: "2.0" } } }),
    }),
  );
  assert.notEqual(baseline, tampered);
});
