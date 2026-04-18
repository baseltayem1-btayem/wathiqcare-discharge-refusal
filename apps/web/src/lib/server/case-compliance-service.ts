import { DocumentStatus, DocumentType, Prisma } from "@prisma/client";
import type { NextRequest } from "next/server";
import type { AuthContext } from "@/lib/server/auth";
import { ApiError } from "@/lib/server/http";
import { getPrisma } from "@/lib/server/prisma";
import { appendAuditChainEvent } from "@/lib/server/audit-chain-service";
import { asRecord } from "@/lib/server/compliance-utils";
import { recordCaseConsent } from "@/lib/server/consent-service";
import { assertCaseReadyForLegalExport, getLegalReadiness } from "@/lib/server/legal-readiness-service";
import { assertDataResidencyCompliance } from "@/lib/server/privacy-service";
import { logReportAccess } from "@/lib/server/report-access-service";
import { assertStepUpForSensitiveAction } from "@/lib/server/security-policy-service";
import { writeAuditLog } from "@/lib/server/saas-services";

const prisma = getPrisma();

function mergeSection(
  currentMetadata: Record<string, unknown> | null,
  sectionKey: string,
  patch: Record<string, unknown>,
): Prisma.InputJsonValue {
  return {
    ...(currentMetadata ?? {}),
    [sectionKey]: {
      ...(asRecord(currentMetadata?.[sectionKey]) ?? {}),
      ...patch,
    },
  } as Prisma.InputJsonValue;
}

async function getAuthorizedCase(auth: AuthContext, caseId: string) {
  if (!auth.tenant_id) {
    throw new ApiError(403, "Tenant context is required");
  }

  const caseRecord = await prisma.case.findFirst({
    where: { id: caseId, tenantId: auth.tenant_id },
    include: {
      documents: true,
      consentRecords: true,
    },
  });

  if (!caseRecord) {
    throw new ApiError(404, "Case not found");
  }

  return caseRecord;
}

export async function recordCasePresentation(
  auth: AuthContext,
  caseId: string,
  payload: Record<string, unknown>,
  request?: NextRequest,
) {
  const caseRecord = await getAuthorizedCase(auth, caseId);
  await assertDataResidencyCompliance({
    tenantId: auth.tenant_id!,
    dataType: "PATIENT_SENSITIVE",
    operation: "case_presentation_capture",
  });

  const updated = await prisma.case.update({
    where: { id: caseId },
    data: {
      metadata: mergeSection(asRecord(caseRecord.metadata), "presentation", {
        ...payload,
        risks_explained: true,
        recorded_at: new Date().toISOString(),
      }),
      updatedByUserId: auth.sub,
    },
  });

  await writeAuditLog({
    tenantId: auth.tenant_id!,
    userId: auth.sub,
    entityType: "case",
    entityId: caseId,
    action: "risks_presented",
    details: "Risks and legal implications explained to the patient/representative",
    caseId,
    metadataJson: payload as Prisma.InputJsonValue,
    request,
  });

  await appendAuditChainEvent({
    tenantId: auth.tenant_id!,
    caseId,
    eventType: "RISKS_EXPLAINED",
    actorId: auth.sub,
    actorRole: auth.role ?? null,
    payloadSummary: "Risk explanation presentation recorded",
    metadataJson: payload,
    request,
  }).catch(() => undefined);

  return updated;
}

export async function recordCaseSignature(
  auth: AuthContext,
  caseId: string,
  payload: {
    outcome?: string;
    patient_decision?: string;
    signer_name?: string;
    reason?: string;
    signer_role?: string;
    identity_verified?: boolean;
  },
  request?: NextRequest,
) {
  const caseRecord = await getAuthorizedCase(auth, caseId);
  await assertDataResidencyCompliance({
    tenantId: auth.tenant_id!,
    dataType: "PATIENT_SENSITIVE",
    operation: "signature_store",
  });

  const normalizedOutcome = payload.outcome?.trim() || "signed";
  const normalizedDecisionInput = payload.patient_decision?.trim().toLowerCase();
  const normalizedDecision =
    normalizedDecisionInput === "accepted" || normalizedDecisionInput === "refused"
      ? normalizedDecisionInput
      : normalizedOutcome === "signed"
        ? "accepted"
        : "refused";

  const updated = await prisma.case.update({
    where: { id: caseId },
    data: {
      metadata: {
        ...(asRecord(caseRecord.metadata) ?? {}),
        signature: {
          outcome: normalizedOutcome,
          patient_decision: normalizedDecision,
          signer_name: payload.signer_name?.trim() || null,
          signer_role: payload.signer_role?.trim() || "patient",
          reason: payload.reason?.trim() || null,
          identity_verified: payload.identity_verified !== false,
          recorded_at: new Date().toISOString(),
        },
        legal: {
          ...(asRecord(asRecord(caseRecord.metadata)?.legal) ?? {}),
          signature_obtained: normalizedOutcome === "signed",
          witness_required: normalizedOutcome !== "signed",
          patient_decision: normalizedDecision,
          authority_verified: payload.identity_verified !== false,
        },
      } as Prisma.InputJsonValue,
      updatedByUserId: auth.sub,
    },
  });

  if (payload.signer_name?.trim()) {
    const existingConsentCount = await prisma.consentRecord.count({
      where: { tenantId: auth.tenant_id!, caseId },
    }).catch(() => 0);

    if (existingConsentCount === 0) {
      await recordCaseConsent(
        auth,
        caseId,
        {
          processingPurpose: "Discharge refusal legal consent evidence",
          lawfulBasis: "PDPL healthcare treatment + legal defense basis",
          consentType: "discharge_refusal_consent",
          consentMethod: normalizedOutcome === "signed" ? "ELECTRONIC_SIGNATURE" : "WITNESS_ACKNOWLEDGMENT",
          documentSnapshot: {
            signer_name: payload.signer_name,
            signer_role: payload.signer_role ?? "patient",
            outcome: normalizedOutcome,
            patient_decision: normalizedDecision,
          },
        },
        request,
      ).catch(() => undefined);
    }
  }

  await writeAuditLog({
    tenantId: auth.tenant_id!,
    userId: auth.sub,
    entityType: "case_signature",
    entityId: caseId,
    action: "signature_recorded",
    details: `Signature outcome: ${normalizedOutcome}; decision: ${normalizedDecision}`,
    caseId,
    metadataJson: payload as Prisma.InputJsonValue,
    request,
  });

  await appendAuditChainEvent({
    tenantId: auth.tenant_id!,
    caseId,
    eventType: "SIGNATURE_RECORDED",
    actorId: auth.sub,
    actorRole: auth.role ?? null,
    payloadSummary: `Signature recorded: ${normalizedOutcome}; decision: ${normalizedDecision}`,
    metadataJson: payload,
    request,
  }).catch(() => undefined);

  return updated;
}

export async function recordCaseWitness(
  auth: AuthContext,
  caseId: string,
  payload: {
    witness_name?: string;
    witness_role?: string;
  },
  request?: NextRequest,
) {
  const caseRecord = await getAuthorizedCase(auth, caseId);

  const updated = await prisma.case.update({
    where: { id: caseId },
    data: {
      metadata: mergeSection(asRecord(caseRecord.metadata), "witness", {
        witness_name: payload.witness_name?.trim() || null,
        witness_role: payload.witness_role?.trim() || null,
        recorded_at: new Date().toISOString(),
      }),
      updatedByUserId: auth.sub,
    },
  });

  await writeAuditLog({
    tenantId: auth.tenant_id!,
    userId: auth.sub,
    entityType: "case_witness",
    entityId: caseId,
    action: "witness_recorded",
    details: `Witness recorded: ${payload.witness_name?.trim() || "unknown"}`,
    caseId,
    metadataJson: payload as Prisma.InputJsonValue,
    request,
  });

  await appendAuditChainEvent({
    tenantId: auth.tenant_id!,
    caseId,
    eventType: "WITNESS_RECORDED",
    actorId: auth.sub,
    actorRole: auth.role ?? null,
    payloadSummary: `Witness recorded: ${payload.witness_name?.trim() || "unknown"}`,
    metadataJson: payload,
    request,
  }).catch(() => undefined);

  return updated;
}

function buildLegalPackageHtml(args: {
  caseRecord: Awaited<ReturnType<typeof getAuthorizedCase>>;
  readiness: Awaited<ReturnType<typeof getLegalReadiness>>;
}) {
  const caseMetadata = JSON.stringify(args.caseRecord.metadata ?? {}, null, 2);
  const readiness = JSON.stringify(args.readiness, null, 2);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>WathiqCare Legal Package - ${args.caseRecord.id}</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 24px; color: #0f172a; }
      h1, h2 { color: #0f766e; }
      .pill { display:inline-block; padding: 4px 10px; border-radius: 999px; background:#dcfce7; color:#166534; font-size:12px; }
      pre { white-space: pre-wrap; word-break: break-word; background:#f8fafc; border:1px solid #e2e8f0; padding: 12px; border-radius: 10px; }
    </style>
  </head>
  <body>
    <h1>WathiqCare Medico-Legal Evidence Package</h1>
    <p class="pill">Saudi PDPL / Medico-Legal Export</p>
    <h2>Case</h2>
    <pre>${JSON.stringify({
      id: args.caseRecord.id,
      caseNumber: args.caseRecord.caseNumber,
      patientName: args.caseRecord.patientName,
      status: args.caseRecord.status,
      generatedAt: new Date().toISOString(),
    }, null, 2)}</pre>
    <h2>Legal Readiness</h2>
    <pre>${readiness}</pre>
    <h2>Documents</h2>
    <pre>${JSON.stringify(args.caseRecord.documents.map((doc) => ({
      id: doc.id,
      title: doc.titleEn,
      templateKey: doc.templateKey,
      status: doc.status,
      generatedAt: doc.generatedAt,
    })), null, 2)}</pre>
    <h2>Case Metadata Snapshot</h2>
    <pre>${caseMetadata}</pre>
  </body>
</html>`;
}

export async function getLegalPackageMetadata(auth: AuthContext, caseId: string) {
  const caseRecord = await getAuthorizedCase(auth, caseId);
  const existing = caseRecord.documents
    .filter((item) => item.templateKey === "legal_package")
    .sort((a, b) => b.generatedAt.getTime() - a.generatedAt.getTime())[0];

  if (!existing) {
    return null;
  }

  const html = existing.previewHtml ?? "<html><body><p>Legal package available.</p></body></html>";
  return {
    version: Number(existing.versionLabel) || 1,
    generated_at: existing.generatedAt.toISOString(),
    download_url: `data:text/html;charset=utf-8,${encodeURIComponent(html)}`,
    json_download_url: `data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(existing.payloadJson ?? {}, null, 2))}`,
  };
}

export async function generateLegalPackageForCase(auth: AuthContext, caseId: string, request: NextRequest) {
  const caseRecord = await getAuthorizedCase(auth, caseId);
  await assertDataResidencyCompliance({
    tenantId: auth.tenant_id!,
    dataType: "PATIENT_SENSITIVE",
    operation: "legal_package_export",
  });
  await assertStepUpForSensitiveAction({
    auth,
    request,
    tenantId: auth.tenant_id!,
    actionKey: "legal_package_export",
    reason: "Medico-legal export requested",
    caseId,
  });

  const readiness = await assertCaseReadyForLegalExport(auth, caseId);
  const html = buildLegalPackageHtml({ caseRecord, readiness });
  const version =
    caseRecord.documents.filter((item) => item.templateKey === "legal_package").length + 1;

  const doc = await prisma.document.create({
    data: {
      tenantId: auth.tenant_id!,
      caseId,
      documentType: DocumentType.CASE_FILE,
      status: DocumentStatus.GENERATED,
      documentCode: `LEGAL-PKG-${version}`,
      titleEn: "Saudi Medico-Legal Evidence Package",
      titleAr: "حزمة الأدلة القانونية الطبية",
      templateKey: "legal_package",
      versionLabel: String(version),
      fileName: `legal-package-${caseId}-v${version}.html`,
      mimeType: "text/html",
      previewHtml: html,
      payloadJson: {
        case_id: caseId,
        readiness,
        document_count: caseRecord.documents.length,
        consent_count: caseRecord.consentRecords.length,
      } as Prisma.InputJsonValue,
      sizeBytes: BigInt(Buffer.byteLength(html, "utf8")),
      generatedByUserId: auth.sub,
    },
  });

  await writeAuditLog({
    tenantId: auth.tenant_id!,
    userId: auth.sub,
    entityType: "legal_package",
    entityId: doc.id,
    action: "legal_package_exported",
    details: "Legal package generated after readiness validation",
    caseId,
    documentId: doc.id,
    metadataJson: {
      version,
      readinessStatus: readiness.status,
    },
    request,
  });

  await appendAuditChainEvent({
    tenantId: auth.tenant_id!,
    caseId,
    eventType: "EXPORT_LEGAL_PACKAGE",
    actorId: auth.sub,
    actorRole: auth.role ?? null,
    payloadSummary: `Legal package exported (v${version})`,
    documentVersion: String(version),
    metadataJson: {
      documentId: doc.id,
      readinessStatus: readiness.status,
    },
    request,
  }).catch(() => undefined);

  await logReportAccess({
    tenantId: auth.tenant_id!,
    caseId,
    reportKey: "legal_package_export",
    exportFormat: "HTML",
    accessedByUserId: auth.sub,
    accessedByRole: auth.role ?? null,
    request,
    metadataJson: {
      documentId: doc.id,
      version,
    },
  }).catch(() => undefined);

  return {
    version,
    generated_at: doc.generatedAt.toISOString(),
    download_url: `data:text/html;charset=utf-8,${encodeURIComponent(html)}`,
    json_download_url: `data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(doc.payloadJson ?? {}, null, 2))}`,
    readiness,
  };
}