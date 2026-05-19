import assert from "node:assert/strict";
import test from "node:test";

import { canPlaceLegalHold, canViewEvidence } from "@/lib/pdf-engine/access-control/evidence-permissions";
import { evaluateRolePrivilege } from "@/lib/pdf-engine/access-control/role-policy";
import { validateTenantIsolation } from "@/lib/pdf-engine/access-control/tenant-isolation";
import { buildEvidenceLifecycleTrail, resolveEvidenceLifecycleState } from "@/lib/pdf-engine/management/evidence-lifecycle";
import { searchEnterpriseEvidence } from "@/lib/pdf-engine/management/enterprise-search";
import { evaluateRetentionCompliance } from "@/lib/pdf-engine/management/retention-enforcement";
import { registerTenantEvidencePartition } from "@/lib/pdf-engine/multi-tenant/tenant-evidence-partition";
import { archiveEvidencePackage } from "@/lib/pdf-engine/persistence/evidence-archive";
import { buildLegalEvidencePackage } from "@/lib/pdf-engine/runtime/legal-evidence-package";
import { buildOtpEvidenceRecord } from "@/lib/pdf-engine/runtime/otp-evidence";
import { buildAccessAuditEvent } from "@/lib/pdf-engine/security/access-audit";
import { decryptEvidencePayload, encryptEvidencePayload, generateEncryptionContext } from "@/lib/pdf-engine/security/evidence-encryption";
import { buildForensicAlerts } from "@/lib/pdf-engine/security/forensic-alerts";
import { buildIntegrityHealthReport, monitorEvidenceIntegrity } from "@/lib/pdf-engine/security/integrity-monitor";

function buildArchivedRecord(input: {
  evidenceId: string;
  generatedAt: string;
  signerName: string;
}) {
  const evidencePackage = buildLegalEvidencePackage({
    auditMetadata: {
      evidenceId: input.evidenceId,
      auditId: `audit-${input.evidenceId}`,
      generatedAt: input.generatedAt,
      generatedBy: "physician-1",
      ipAddress: null,
      otpStatus: null,
      formVersion: "v1.0",
      documentHash: `hash-${input.evidenceId}`,
      sourceModule: "informed-consents",
      deviceFingerprint: "device-fingerprint-placeholder",
    },
    documentContent: {
      patientName: input.signerName,
      procedure: "Appendectomy",
    },
    evidenceHash: `hash-${input.evidenceId}`,
    evidenceId: input.evidenceId,
    html: "<html><body>preview</body></html>",
    languageDirection: "ltr",
    otpEvidence: buildOtpEvidenceRecord({
      verified: true,
      deliveryTimestamp: input.generatedAt,
      verificationTimestamp: input.generatedAt,
      deliveryProvider: "taqniat",
      deliveryReference: `otp-${input.evidenceId}`,
      verificationMethod: "sms-otp",
      maskedMobileNumber: "+9665******12",
    }),
    signerDetails: {
      signerReference: `ref-${input.evidenceId}`,
      signerName: input.signerName,
      signerRole: "patient-subject",
    },
    sourceModule: "informed-consents",
    templateVersion: "v1.0",
  });

  return archiveEvidencePackage(evidencePackage);
}

test("role policy evaluates privileged export correctly", () => {
  const evaluation = evaluateRolePrivilege({
    legalPrivilege: true,
    requestedPermission: "export",
    role: "legal-admin",
  });

  assert.equal(evaluation.allowed, true);
});

test("evidence permissions respect sensitivity and legal hold actions", () => {
  assert.equal(canViewEvidence({ evidenceSensitivity: "restricted", role: "legal-admin", tenantAccessValid: true }), true);
  assert.equal(
    canPlaceLegalHold({ legalPrivilege: true, role: "legal-admin", tenantAccessValid: true, legalHoldState: false }),
    true,
  );
});

test("tenant isolation blocks cross-tenant physician access", () => {
  const result = validateTenantIsolation({
    actorTenantId: "tenant-a",
    evidenceTenantId: "tenant-b",
    legalPrivilege: false,
    role: "physician",
  });

  assert.equal(result.allowed, false);
});

test("lifecycle trail includes archival and judicial export states", () => {
  const archived = buildArchivedRecord({ evidenceId: "phase5-life", generatedAt: "2026-05-18T00:00:00.000Z", signerName: "Najib" });
  const trail = buildEvidenceLifecycleTrail({
    archivedEvidence: archived,
    judicialExported: true,
    legalEvidencePackage: archived.legalEvidencePackage,
  });

  assert.deepEqual(trail.slice(-2), ["archived", "judicial-exported"]);
  assert.equal(
    resolveEvidenceLifecycleState({ archivedEvidence: archived, judicialExported: true, legalEvidencePackage: archived.legalEvidencePackage }),
    "judicial-exported",
  );
});

test("retention enforcement reports expired evidence without deleting it", () => {
  const expired = buildArchivedRecord({ evidenceId: "phase5-old", generatedAt: "2010-01-01T00:00:00.000Z", signerName: "Expired" });
  const summary = evaluateRetentionCompliance([expired]);

  assert.equal(summary.compliant, false);
  assert.equal(summary.violations.length > 0, true);
});

test("encryption abstraction round-trips local evidence payload", () => {
  const context = generateEncryptionContext({ evidenceId: "phase5-encryption", tenantId: "tenant-a" });
  const encrypted = encryptEvidencePayload({ test: true, value: 42 }, context);

  assert.deepEqual(decryptEvidencePayload(encrypted), { test: true, value: 42 });
});

test("forensic alerts surface repeated access attempts and retention violations", () => {
  const alerts = buildForensicAlerts({
    accessAuditTrail: [
      buildAccessAuditEvent({ action: "view", actorId: "u1", actorTenantId: "tenant-a", department: "legal", evidenceId: "e1", outcome: "denied", reason: "blocked", role: "physician" }),
      buildAccessAuditEvent({ action: "view", actorId: "u1", actorTenantId: "tenant-a", department: "legal", evidenceId: "e1", outcome: "denied", reason: "blocked", role: "physician" }),
      buildAccessAuditEvent({ action: "view", actorId: "u1", actorTenantId: "tenant-a", department: "legal", evidenceId: "e1", outcome: "denied", reason: "blocked", role: "physician" }),
    ],
    evidenceId: "e1",
    retentionViolations: [{ evidenceId: "e1", reason: "Retention period expired.", severity: "high" }],
    tenantIsolationValid: false,
  });

  assert.equal(alerts.some((alert) => alert.type === "repeated-access-attempts"), true);
  assert.equal(alerts.some((alert) => alert.type === "retention-violation"), true);
});

test("integrity monitor reports healthy valid archived evidence", () => {
  const archived = buildArchivedRecord({ evidenceId: "phase5-integrity", generatedAt: "2026-05-18T00:00:00.000Z", signerName: "Healthy" });
  const results = monitorEvidenceIntegrity([archived]);
  const health = buildIntegrityHealthReport(results);

  assert.equal(results[0]?.report.valid, true);
  assert.equal(health.healthy, true);
});

test("enterprise search filters by tenant and lifecycle-aware access", () => {
  const tenantARecord = buildArchivedRecord({ evidenceId: "phase5-search-a", generatedAt: "2026-05-18T00:00:00.000Z", signerName: "Tenant A" });
  const tenantBRecord = buildArchivedRecord({ evidenceId: "phase5-search-b", generatedAt: "2026-05-18T00:00:00.000Z", signerName: "Tenant B" });
  registerTenantEvidencePartition({ evidenceId: tenantARecord.evidenceId, tenantId: "tenant-a", sensitivity: "standard" });
  registerTenantEvidencePartition({ evidenceId: tenantBRecord.evidenceId, tenantId: "tenant-b", sensitivity: "standard" });

  const results = searchEnterpriseEvidence(
    {
      actorId: "legal-user",
      actorTenantId: "tenant-a",
      role: "legal-admin",
      tenantId: "tenant-a",
    },
    [tenantARecord, tenantBRecord],
  );

  assert.equal(results.length, 1);
  assert.equal(results[0]?.evidenceId, tenantARecord.evidenceId);
});