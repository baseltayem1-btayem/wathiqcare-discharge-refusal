import assert from "node:assert/strict";
import test from "node:test";

import { performForensicVerification } from "@/lib/pdf-engine/audit/forensic-verification";
import { buildComplianceReview } from "@/lib/pdf-engine/operations/compliance-review";
import { buildEvidenceConsole } from "@/lib/pdf-engine/operations/evidence-console";
import { buildLegalDisclosurePackage } from "@/lib/pdf-engine/operations/legal-disclosure";
import { buildRetentionDashboard } from "@/lib/pdf-engine/operations/retention-dashboard";
import { archiveEvidencePackage } from "@/lib/pdf-engine/persistence/evidence-archive";
import { buildJudicialEvidenceExport } from "@/lib/pdf-engine/persistence/judicial-export";
import { buildLegalEvidencePackage } from "@/lib/pdf-engine/runtime/legal-evidence-package";
import { buildOtpEvidenceRecord } from "@/lib/pdf-engine/runtime/otp-evidence";
import { buildEvidenceTimelineModel } from "@/lib/pdf-engine/ui-models/evidence-timeline-model";
import { buildForensicInspectionModel } from "@/lib/pdf-engine/ui-models/forensic-inspection-model";
import { buildVerificationPageModel } from "@/lib/pdf-engine/ui-models/verification-page-model";

function buildArchivedRecord() {
  const evidencePackage = buildLegalEvidencePackage({
    auditMetadata: {
      evidenceId: "e-phase4-1",
      auditId: "audit-phase4-1",
      generatedAt: "2026-05-18T00:00:00.000Z",
      generatedBy: "physician-1",
      ipAddress: null,
      otpStatus: null,
      formVersion: "v1.0",
      documentHash: "hash-phase4-1",
      sourceModule: "informed-consents",
      deviceFingerprint: "device-fingerprint-placeholder",
    },
    documentContent: {
      patientName: "Najib",
      procedure: "Appendectomy",
    },
    evidenceHash: "hash-phase4-1",
    evidenceId: "e-phase4-1",
    html: "<html><body>preview</body></html>",
    languageDirection: "ltr",
    otpEvidence: buildOtpEvidenceRecord({
      verified: true,
      deliveryTimestamp: "2026-05-18T00:00:00.000Z",
      verificationTimestamp: "2026-05-18T00:01:00.000Z",
      deliveryProvider: "taqniat",
      deliveryReference: "otp-phase4-1",
      verificationMethod: "sms-otp",
      maskedMobileNumber: "+9665******12",
    }),
    signerDetails: {
      signerReference: "IMC-2026-02000",
      signerName: "Najib",
      signerRole: "patient-subject",
    },
    sourceModule: "informed-consents",
    templateVersion: "v1.0",
  });

  return archiveEvidencePackage(evidencePackage);
}

test("buildVerificationPageModel prepares future verification page DTO", () => {
  const archived = buildArchivedRecord();
  const forensic = performForensicVerification({ archivedEvidence: archived, legalEvidencePackage: archived.legalEvidencePackage });
  const retentionItem = buildRetentionDashboard([archived])[0];
  const model = buildVerificationPageModel({
    forensicVerificationReport: forensic,
    legalEvidencePackage: archived.legalEvidencePackage,
    retentionItem,
  });

  assert.equal(model.evidenceId, archived.evidenceId);
  assert.equal(model.verificationStatus, "verified");
});

test("buildEvidenceTimelineModel prepares lifecycle events", () => {
  const archived = buildArchivedRecord();
  const model = buildEvidenceTimelineModel({
    auditTimeline: [],
    legalEvidencePackage: archived.legalEvidencePackage,
  });

  assert.ok(model.events.some((event) => event.eventType === "otp-sent"));
  assert.ok(model.events.some((event) => event.eventType === "sealed"));
});

test("buildForensicInspectionModel surfaces forensic status and risk flags", () => {
  const archived = buildArchivedRecord();
  const forensic = performForensicVerification({ archivedEvidence: archived, legalEvidencePackage: archived.legalEvidencePackage });
  const model = buildForensicInspectionModel({
    forensicVerificationReport: forensic,
    legalEvidencePackage: archived.legalEvidencePackage,
  });

  assert.equal(model.hashComparison, "match");
  assert.equal(Array.isArray(model.riskFlags), true);
});

test("buildEvidenceConsole aggregates operations counts", () => {
  const archived = buildArchivedRecord();
  const consoleModel = buildEvidenceConsole([archived]);

  assert.equal(consoleModel.totalEvidenceRecords, 1);
  assert.equal(consoleModel.verifiedRecords, 1);
});

test("buildComplianceReview detects clean evidence package as compliant", () => {
  const archived = buildArchivedRecord();
  const forensic = performForensicVerification({ archivedEvidence: archived, legalEvidencePackage: archived.legalEvidencePackage });
  const retentionItem = buildRetentionDashboard([archived])[0];
  const review = buildComplianceReview({
    archivedEvidence: archived,
    forensicVerificationReport: forensic,
    legalEvidencePackage: archived.legalEvidencePackage,
    retentionItem,
  });

  assert.equal(review.status, "compliant");
});

test("buildLegalDisclosurePackage prepares disclosure DTO", () => {
  const archived = buildArchivedRecord();
  const forensic = performForensicVerification({ archivedEvidence: archived, legalEvidencePackage: archived.legalEvidencePackage });
  const retentionItem = buildRetentionDashboard([archived])[0];
  const verificationPageModel = buildVerificationPageModel({
    forensicVerificationReport: forensic,
    legalEvidencePackage: archived.legalEvidencePackage,
    retentionItem,
  });
  const timelineModel = buildEvidenceTimelineModel({
    auditTimeline: [],
    legalEvidencePackage: archived.legalEvidencePackage,
  });
  const judicialExport = buildJudicialEvidenceExport({
    archivedEvidence: archived,
    legalEvidencePackage: archived.legalEvidencePackage,
  });
  const disclosure = buildLegalDisclosurePackage({
    judicialExportReference: judicialExport.judicialExportReference,
    legalEvidencePackage: archived.legalEvidencePackage,
    timelineModel,
    verificationPageModel,
  });

  assert.equal(disclosure.evidenceMetadata.evidenceId, archived.evidenceId);
  assert.equal(disclosure.judicialExportReference, judicialExport.judicialExportReference);
});