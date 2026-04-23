import crypto from "node:crypto";
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
import {
  assertWitnessIntegrityOrThrow,
  buildWitnessIdentityHash,
  extractWitnessesFromMetadata,
  toWitnessesMetadataValue,
  type LegalWitnessRecord,
  type WitnessRoleCategory,
} from "@/lib/server/witness-integrity-service";

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

function normalizeRoleCategory(value: string | null | undefined): WitnessRoleCategory {
  const normalized = (value ?? "").trim();
  if (normalized === "clinical" || normalized === "non_clinical") {
    return normalized;
  }
  return "non_clinical";
}

function getClientAddress(request?: NextRequest): string | null {
  const forwarded = request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (forwarded) {
    return forwarded;
  }
  return request?.headers.get("x-real-ip")?.trim() || null;
}

function hasRequiredWitnessFields(payload: {
  full_name?: string;
  role?: string;
  id_number?: string;
  mobile_number?: string;
  signature_hash?: string;
  signature_type?: string;
  verification_status?: string;
  attestation_confirmed?: boolean;
  otp_reference?: string;
}): Record<string, string> {
  const fields: Record<string, string> = {};
  if (!payload.full_name?.trim()) {
    fields.full_name = "Witness full name is required";
  }
  if (!payload.role?.trim()) {
    fields.role = "Witness role is required";
  }
  if (!payload.id_number?.trim()) {
    fields.id_number = "Witness ID number is required";
  }
  if (!payload.mobile_number?.trim()) {
    fields.mobile_number = "Witness mobile number is required";
  }
  if (!payload.signature_hash?.trim()) {
    fields.signature_hash = "Witness signature evidence is required";
  }
  if (!payload.attestation_confirmed) {
    fields.attestation_confirmed = "Witness attestation must be confirmed";
  }
  if ((payload.verification_status ?? "").trim().toUpperCase() !== "VERIFIED") {
    fields.verification_status = "Witness identity verification must be VERIFIED";
  }
  if ((payload.signature_type ?? "").trim().toUpperCase() === "OTP" && !payload.otp_reference?.trim()) {
    fields.otp_reference = "OTP reference is required when OTP verification is used";
  }
  return fields;
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
  assertWitnessIntegrityOrThrow(caseRecord.metadata);
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
    action?: "add" | "update" | "remove";
    witness_id?: string;
    witness_name?: string;
    witness_role?: string;
    full_name?: string;
    role?: string;
    role_category?: WitnessRoleCategory;
    id_type?: string;
    id_number?: string;
    mobile_number?: string;
    attestation_confirmed?: boolean;
    attestation_language?: "en" | "ar";
    attestation_version?: string;
    signature_type?: "DIGITAL_SIGNATURE" | "OTP" | "MANUAL_CONFIRMATION";
    signature_hash?: string;
    otp_reference?: string;
    verification_status?: "VERIFIED" | "PENDING" | "FAILED";
    manual_fallback_used?: boolean;
    device_fingerprint?: string;
    force_unlock?: boolean;
    unlock_reason?: string;
  },
  request?: NextRequest,
) {
  const caseRecord = await getAuthorizedCase(auth, caseId);
  const metadata = asRecord(caseRecord.metadata);
  const nowIso = new Date().toISOString();
  const action = payload.action ?? "add";
  const isFinalized = String(caseRecord.status ?? "").toUpperCase() === "CLOSED";

  if (isFinalized && !payload.force_unlock) {
    throw new ApiError(400, "Witness records are locked after finalization", {
      code: "WITNESS_RECORDS_LOCKED",
      fields: {
        case_status: "Case is finalized and witness records are immutable",
      },
    });
  }

  let nextWitnesses = extractWitnessesFromMetadata(caseRecord.metadata);

  if (action === "remove") {
    const witnessId = payload.witness_id?.trim();
    if (!witnessId) {
      throw new ApiError(400, "Witness ID is required for removal", {
        code: "WITNESS_ID_REQUIRED",
        fields: {
          witness_id: "Provide witness_id when removing a witness",
        },
      });
    }
    nextWitnesses = nextWitnesses.filter((item) => item.witness_id !== witnessId);
  } else {
    const fullName = payload.full_name?.trim() || payload.witness_name?.trim() || "";
    const role = payload.role?.trim() || payload.witness_role?.trim() || "";
    const idType = payload.id_type?.trim() || "NATIONAL_ID";
    const idNumber = payload.id_number?.trim() || "";
    const mobileNumber = payload.mobile_number?.trim() || "";
    const signatureType = payload.signature_type?.trim().toUpperCase() || "DIGITAL_SIGNATURE";
    const requiredFields = hasRequiredWitnessFields({
      full_name: fullName,
      role,
      id_number: idNumber,
      mobile_number: mobileNumber,
      signature_hash: payload.signature_hash,
      signature_type: signatureType,
      verification_status: payload.verification_status,
      attestation_confirmed: payload.attestation_confirmed,
      otp_reference: payload.otp_reference,
    });
    if (Object.keys(requiredFields).length > 0) {
      throw new ApiError(400, "Witness attestation incomplete", {
        code: "WITNESS_ATTESTATION_INCOMPLETE",
        fields: requiredFields,
      });
    }

    const witnessId = payload.witness_id?.trim() || crypto.randomUUID();
    const existingIndex = nextWitnesses.findIndex((item) => item.witness_id === witnessId);
    const existingWitness = existingIndex >= 0 ? nextWitnesses[existingIndex] : null;

    const witnessRecord: LegalWitnessRecord = {
      witness_id: witnessId,
      full_name: fullName,
      role,
      role_category: normalizeRoleCategory(payload.role_category),
      id_type: idType,
      id_number: idNumber,
      mobile_number: mobileNumber,
      identity_hash: buildWitnessIdentityHash(idType, idNumber, mobileNumber),
      attestation_confirmed: true,
      attested_at: nowIso,
      attestation_language: payload.attestation_language === "ar" ? "ar" : "en",
      attestation_version: payload.attestation_version?.trim() || "1.0",
      signature_type:
        signatureType === "OTP" || signatureType === "MANUAL_CONFIRMATION"
          ? signatureType
          : "DIGITAL_SIGNATURE",
      signature_hash: payload.signature_hash?.trim() || "",
      otp_reference: payload.otp_reference?.trim() || null,
      verification_status: "VERIFIED",
      manual_fallback_used: Boolean(payload.manual_fallback_used),
      created_at: existingWitness?.created_at || nowIso,
      created_by: existingWitness?.created_by || auth.sub,
      updated_at: nowIso,
      updated_by: auth.sub,
      ip_address: getClientAddress(request),
      device_fingerprint: payload.device_fingerprint?.trim() || request?.headers.get("user-agent") || null,
      locked: false,
      edit_history: existingWitness
        ? [
            ...(existingWitness.edit_history ?? []),
            {
              edited_at: nowIso,
              edited_by: auth.sub,
              reason: "Witness record updated",
            },
          ]
        : [],
    };

    if (existingIndex >= 0) {
      nextWitnesses[existingIndex] = witnessRecord;
    } else {
      nextWitnesses.push(witnessRecord);
    }
  }

  const identitySet = new Set<string>();
  for (const witness of nextWitnesses) {
    const identityKey = `${witness.id_number}|${witness.mobile_number}`.toLowerCase();
    if (identitySet.has(identityKey)) {
      throw new ApiError(400, "Witness identity not verified", {
        code: "WITNESS_IDENTITY_NOT_VERIFIED",
        fields: {
          duplicate: "Duplicate witness identity is not allowed",
        },
      });
    }
    identitySet.add(identityKey);
  }

  if (nextWitnesses.length >= 2) {
    const hasClinical = nextWitnesses.some((item) => item.role_category === "clinical");
    const hasNonClinical = nextWitnesses.some((item) => item.role_category === "non_clinical");
    if (!hasClinical || !hasNonClinical) {
      throw new ApiError(400, "Witness roles not compliant", {
        code: "INVALID_WITNESS_COMPOSITION",
        fields: {
          role_category: "At least one clinical and one non-clinical witness are required",
        },
      });
    }
  }

  const updated = await prisma.case.update({
    where: { id: caseId },
    data: {
      metadata: {
        ...(metadata ?? {}),
        witnesses: toWitnessesMetadataValue(nextWitnesses),
        witness: nextWitnesses[0]
          ? {
              witness_name: nextWitnesses[0].full_name,
              witness_role: nextWitnesses[0].role,
              recorded_at: nextWitnesses[0].updated_at,
            }
          : null,
        legal: {
          ...(asRecord(metadata?.legal) ?? {}),
          witness_count: nextWitnesses.length,
          legally_modified: Boolean(isFinalized && payload.force_unlock),
          witness_unlock_reason:
            isFinalized && payload.force_unlock ? payload.unlock_reason?.trim() || "forced_unlock" : null,
        },
      } as Prisma.InputJsonValue,
      updatedByUserId: auth.sub,
    },
  });

  if (isFinalized && payload.force_unlock) {
    await writeAuditLog({
      tenantId: auth.tenant_id!,
      userId: auth.sub,
      entityType: "case_witness",
      entityId: caseId,
      action: "witness_unlock_forced",
      details: payload.unlock_reason?.trim() || "Witness records unlocked for legal correction",
      caseId,
      metadataJson: {
        unlock_reason: payload.unlock_reason?.trim() || null,
      },
      request,
    });
  }

  await writeAuditLog({
    tenantId: auth.tenant_id!,
    userId: auth.sub,
    entityType: "case_witness",
    entityId: caseId,
    action: "witness_recorded",
    details: `Witness record ${action}ed. Total witnesses: ${nextWitnesses.length}`,
    caseId,
    metadataJson: {
      action,
      witness_id: payload.witness_id ?? null,
      total_witnesses: nextWitnesses.length,
    } as Prisma.InputJsonValue,
    request,
  });

  await appendAuditChainEvent({
    tenantId: auth.tenant_id!,
    caseId,
    eventType: "WITNESS_RECORDED",
    actorId: auth.sub,
    actorRole: auth.role ?? null,
    payloadSummary: `Witness ${action}ed. Total witnesses: ${nextWitnesses.length}`,
    metadataJson: {
      action,
      total_witnesses: nextWitnesses.length,
    },
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
  assertWitnessIntegrityOrThrow(caseRecord.metadata);
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