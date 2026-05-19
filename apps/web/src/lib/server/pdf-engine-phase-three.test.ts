import assert from "node:assert/strict";
import test from "node:test";

import { performForensicVerification } from "@/lib/pdf-engine/audit/forensic-verification";
import { verifyArchiveIntegrity } from "@/lib/pdf-engine/persistence/archive-integrity";
import { archiveEvidencePackage } from "@/lib/pdf-engine/persistence/evidence-archive";
import { buildJudicialEvidenceExport } from "@/lib/pdf-engine/persistence/judicial-export";
import { calculateRetentionExpiry, determineRetentionClass } from "@/lib/pdf-engine/persistence/retention-policy";
import { verifySnapshotHash } from "@/lib/pdf-engine/persistence/snapshot-registry";
import { buildLegalEvidencePackage } from "@/lib/pdf-engine/runtime/legal-evidence-package";
import { buildOtpEvidenceRecord } from "@/lib/pdf-engine/runtime/otp-evidence";
import { validateEvidencePackage } from "@/lib/pdf-engine/verification/verification-validator";

function buildPackage() {
  return buildLegalEvidencePackage({
    auditMetadata: {
      evidenceId: "e-archive-1",
      auditId: "audit-archive-1",
      generatedAt: "2026-05-18T00:00:00.000Z",
      generatedBy: "physician-1",
      ipAddress: null,
      otpStatus: null,
      formVersion: "v1.0",
      documentHash: "hash-archive-1",
      sourceModule: "informed-consents",
      deviceFingerprint: "device-fingerprint-placeholder",
    },
    documentContent: {
      patientName: "Najib",
      procedure: "Appendectomy",
    },
    evidenceHash: "hash-archive-1",
    evidenceId: "e-archive-1",
    html: "<html><body>preview</body></html>",
    languageDirection: "ltr",
    otpEvidence: buildOtpEvidenceRecord({
      verified: true,
      deliveryProvider: "taqniat",
      deliveryReference: "otp-archive-1",
      verificationMethod: "sms-otp",
    }),
    signerDetails: {
      signerReference: "IMC-2026-02000",
      signerName: "Najib",
      signerRole: "patient-subject",
    },
    sourceModule: "informed-consents",
    templateVersion: "v1.0",
  });
}

test("verifyArchiveIntegrity validates archived evidence packages", () => {
  const archived = archiveEvidencePackage(buildPackage());
  const integrity = verifyArchiveIntegrity(archived);

  assert.equal(integrity.integrityValid, true);
});

test("calculateRetentionExpiry applies retention policy years", () => {
  const retentionClass = determineRetentionClass({ moduleKey: "informed-consents" });
  const expiry = calculateRetentionExpiry(retentionClass, "2026-05-18T00:00:00.000Z");

  assert.equal(retentionClass, "informed-consent");
  assert.match(expiry || "", /^2036-05-18T/);
});

test("verifySnapshotHash resolves registered snapshots", () => {
  const archived = archiveEvidencePackage(buildPackage());
  const verification = verifySnapshotHash(archived.evidenceId, archived.legalEvidencePackage.snapshot.snapshotHash);

  assert.equal(verification.valid, true);
});

test("validateEvidencePackage confirms package integrity", () => {
  const evidencePackage = buildPackage();
  const validation = validateEvidencePackage(evidencePackage);

  assert.equal(validation.valid, true);
});

test("buildJudicialEvidenceExport assembles judicial payload metadata", () => {
  const archived = archiveEvidencePackage(buildPackage());
  const judicialExport = buildJudicialEvidenceExport({
    archivedEvidence: archived,
    forensicVerificationReference: "forensic-ref-1",
    legalEvidencePackage: archived.legalEvidencePackage,
  });

  assert.equal(judicialExport.legalFooterReferences.archiveReference, archived.archiveId);
  assert.equal(judicialExport.legalFooterReferences.forensicVerificationReference, "forensic-ref-1");
});

test("performForensicVerification orchestrates archive and verification checks", () => {
  const archived = archiveEvidencePackage(buildPackage());
  const report = performForensicVerification({
    archivedEvidence: archived,
    legalEvidencePackage: archived.legalEvidencePackage,
  });

  assert.equal(report.valid, true);
  assert.ok(report.reference.length > 10);
});