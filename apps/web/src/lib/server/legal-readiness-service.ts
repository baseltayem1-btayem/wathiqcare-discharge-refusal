import { LegalReadinessStatus } from "@prisma/client";
import type { AuthContext } from "@/lib/server/auth";
import { ApiError } from "@/lib/server/http";
import { getPrisma } from "@/lib/server/prisma";
import { asRecord, readBoolean, readNumber, readString } from "@/lib/server/compliance-utils";
import { verifyAuditChain } from "@/lib/server/audit-chain-service";
import { evaluateWitnessIntegrity } from "@/lib/server/witness-integrity-service";

const prisma = getPrisma();

export type LegalReadinessItem = {
  key: string;
  label: string;
  required: boolean;
  satisfied: boolean;
  reason: string;
};

export type LegalReadinessReport = {
  caseId: string;
  status: LegalReadinessStatus;
  readyForLegal: boolean;
  checkedAt: string;
  blockers: string[];
  checklist: LegalReadinessItem[];
  summary: {
    total: number;
    satisfied: number;
  };
  evidence: {
    consentCount: number;
    documentCount: number;
    auditChainVerified: boolean;
  };
};

export function evaluateLegalReadinessFromSnapshot(input: {
  medicalDecisionDocumented: boolean;
  risksExplained: boolean;
  refusalFormCompleted: boolean;
  signerCaptured: boolean;
  capacityVerified: boolean;
  witnessRequired: boolean;
  witnessAdded: boolean;
  witnessIntegrity: {
    witnessCount: number;
    minimumWitnessesMet: boolean;
    identityVerified: boolean;
    roleCompositionValid: boolean;
    attestationComplete: boolean;
  };
  consentRecorded: boolean;
  auditTrailCaptured: boolean;
  signerIdentityVerified: boolean;
  supportingDocumentsAttached: boolean;
  financialAcknowledgmentRequired: boolean;
  financialAcknowledgmentCompleted: boolean;
  openValidationErrors: number;
  auditChainVerified: boolean;
  consentCount: number;
  documentCount: number;
  caseId: string;
}): LegalReadinessReport {
  const checklist: LegalReadinessItem[] = [
    {
      key: "medical_decision_documented",
      label: "تم توثيق قرار الخروج الطبي",
      required: true,
      satisfied: input.medicalDecisionDocumented,
      reason: input.medicalDecisionDocumented ? "Documented" : "Missing documented discharge decision.",
    },
    {
      key: "risks_explained",
      label: "تم شرح المخاطر للمريض",
      required: true,
      satisfied: input.risksExplained,
      reason: input.risksExplained ? "Captured" : "Risk explanation has not been captured.",
    },
    {
      key: "refusal_form_completed",
      label: "تم إكمال نموذج refusal الصحيح",
      required: true,
      satisfied: input.refusalFormCompleted,
      reason: input.refusalFormCompleted ? "Available" : "Discharge refusal form is missing.",
    },
    {
      key: "signer_captured",
      label: "تم الحصول على توقيع المريض أو من يمثله",
      required: true,
      satisfied: input.signerCaptured,
      reason: input.signerCaptured ? "Captured" : "Patient/representative signature is missing.",
    },
    {
      key: "capacity_verified",
      label: "تم التحقق من الصفة/الأهلية",
      required: true,
      satisfied: input.capacityVerified,
      reason: input.capacityVerified ? "Verified" : "Capacity/authority verification is missing.",
    },
    {
      key: "minimum_witnesses_requirement",
      label: "Minimum witnesses requirement not met",
      required: true,
      satisfied: input.witnessIntegrity.minimumWitnessesMet,
      reason: input.witnessIntegrity.minimumWitnessesMet
        ? `Captured (${input.witnessIntegrity.witnessCount})`
        : "At least two legally valid witnesses are required.",
    },
    {
      key: "witness_identity_verified",
      label: "Witness identity not verified",
      required: true,
      satisfied: input.witnessIntegrity.identityVerified,
      reason: input.witnessIntegrity.identityVerified
        ? "All witness identity checks are verified"
        : "One or more witnesses have invalid, duplicate, or unverified identity.",
    },
    {
      key: "witness_roles_compliant",
      label: "Witness roles not compliant",
      required: true,
      satisfied: input.witnessIntegrity.roleCompositionValid,
      reason: input.witnessIntegrity.roleCompositionValid
        ? "Clinical and non-clinical witness roles are present"
        : "Witness role composition must include both clinical and non-clinical categories.",
    },
    {
      key: "witness_attestation_complete",
      label: "Witness attestation incomplete",
      required: true,
      satisfied: input.witnessIntegrity.attestationComplete,
      reason: input.witnessIntegrity.attestationComplete
        ? "Attestation and verification evidence are complete"
        : "Witness attestation, signature evidence, or OTP/manual fallback is incomplete.",
    },
    {
      key: "consent_record_saved",
      label: "تم حفظ consent record",
      required: true,
      satisfied: input.consentRecorded,
      reason: input.consentRecorded ? `Captured (${input.consentCount})` : "No consent record is stored.",
    },
    {
      key: "audit_trail_complete",
      label: "تم حفظ audit trail كامل",
      required: true,
      satisfied: input.auditTrailCaptured && input.auditChainVerified,
      reason:
        input.auditTrailCaptured && input.auditChainVerified
          ? "Tamper-evident chain verified"
          : "Audit trail is incomplete or hash chain verification failed.",
    },
    {
      key: "signer_identity_verified",
      label: "تم التحقق من هوية الموقع",
      required: true,
      satisfied: input.signerIdentityVerified,
      reason: input.signerIdentityVerified ? "Verified" : "Signer identity verification is missing.",
    },
    {
      key: "supporting_documents_attached",
      label: "تم إرفاق المستندات الداعمة المطلوبة",
      required: true,
      satisfied: input.supportingDocumentsAttached,
      reason: input.supportingDocumentsAttached ? `Attached (${input.documentCount})` : "Supporting documents are missing.",
    },
    {
      key: "financial_acknowledgment",
      label: "تم إكمال financial acknowledgment إذا كانت مطلوبة",
      required: input.financialAcknowledgmentRequired,
      satisfied: !input.financialAcknowledgmentRequired || input.financialAcknowledgmentCompleted,
      reason:
        !input.financialAcknowledgmentRequired || input.financialAcknowledgmentCompleted
          ? "Satisfied"
          : "Financial acknowledgment is required but incomplete.",
    },
    {
      key: "validation_errors_closed",
      label: "تم إغلاق أي validation errors",
      required: true,
      satisfied: input.openValidationErrors <= 0,
      reason:
        input.openValidationErrors <= 0
          ? "No open validation errors"
          : `${input.openValidationErrors} validation error(s) remain open.`,
    },
  ];

  const blockers = checklist
    .filter((item) => item.required && !item.satisfied)
    .map((item) => `${item.label}: ${item.reason}`);

  const satisfied = checklist.filter((item) => !item.required || item.satisfied).length;
  const readyForLegal = blockers.length === 0;
  const status = readyForLegal ? LegalReadinessStatus.COMPLIANT : LegalReadinessStatus.BLOCKED;

  return {
    caseId: input.caseId,
    status,
    readyForLegal,
    checkedAt: new Date().toISOString(),
    blockers,
    checklist,
    summary: {
      total: checklist.length,
      satisfied,
    },
    evidence: {
      consentCount: input.consentCount,
      documentCount: input.documentCount,
      auditChainVerified: input.auditChainVerified,
    },
  };
}

async function getAuthorizedCase(auth: AuthContext, caseId: string) {
  if (!auth.tenant_id) {
    throw new ApiError(403, "Tenant context is required");
  }

  const caseRecord = await prisma.case.findFirst({
    where: { id: caseId, tenantId: auth.tenant_id },
    include: {
      documents: true,
      auditLogs: {
        orderBy: { createdAt: "desc" },
        take: 100,
      },
      consentRecords: {
        orderBy: { consentedAt: "desc" },
      },
      auditChainEvents: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!caseRecord) {
    throw new ApiError(404, "Case not found");
  }

  return caseRecord;
}

export async function getLegalReadiness(auth: AuthContext, caseId: string) {
  const caseRecord = await getAuthorizedCase(auth, caseId);
  const metadata = asRecord(caseRecord.metadata);
  const workflow = asRecord(metadata?.workflow);
  const presentation = asRecord(metadata?.presentation);
  const signature = asRecord(metadata?.signature);
  const witness = asRecord(metadata?.witness);
  const witnessIntegrity = evaluateWitnessIntegrity(caseRecord.metadata);
  const legal = asRecord(metadata?.legal);
  const validation = asRecord(metadata?.validation);
  const financial = asRecord(metadata?.financial);
  const treatingPhysician =
    readString(workflow, "attending_physician") || readString(metadata, "attending_physician", "doctor_name");
  const decisionTimestamp =
    readString(workflow, "discharge_decision_at") || readString(metadata, "discharge_decision_at");

  const documentKeys = new Set(caseRecord.documents.map((item) => item.templateKey));
  const auditVerification = verifyAuditChain(caseRecord.auditChainEvents);

  const report = evaluateLegalReadinessFromSnapshot({
    caseId,
    medicalDecisionDocumented:
      (Boolean(treatingPhysician) && Boolean(decisionTimestamp)) ||
      Boolean(readString(workflow, "discussion_summary")) ||
      Boolean(readBoolean(legal, "medical_decision_documented")),
    risksExplained:
      Boolean(readBoolean(presentation, "risks_explained", "acknowledged_view")) ||
      Boolean(readBoolean(legal, "risks_explained")),
    refusalFormCompleted:
      documentKeys.has("discharge_refusal_form") || Boolean(readBoolean(legal, "refusal_form_completed")),
    signerCaptured:
      Boolean(readString(signature, "signer_name")) || Boolean(readBoolean(legal, "signature_obtained")),
    capacityVerified:
      Boolean(readBoolean(legal, "capacity_verified", "authority_verified")),
    witnessRequired:
      Boolean(readBoolean(legal, "witness_required")) || readString(signature, "outcome") === "refused_to_sign",
    witnessAdded: Boolean(readString(witness, "witness_name")) || witnessIntegrity.witnessCount > 0,
    witnessIntegrity: {
      witnessCount: witnessIntegrity.witnessCount,
      minimumWitnessesMet: witnessIntegrity.minimumWitnessesMet,
      identityVerified: witnessIntegrity.identityVerified,
      roleCompositionValid: witnessIntegrity.roleCompositionValid,
      attestationComplete: witnessIntegrity.attestationComplete,
    },
    consentRecorded: caseRecord.consentRecords.length > 0,
    auditTrailCaptured: caseRecord.auditLogs.length > 0 || caseRecord.auditChainEvents.length > 0,
    signerIdentityVerified:
      Boolean(readBoolean(signature, "identity_verified")) ||
      Boolean(readBoolean(presentation, "identity_verified")),
    supportingDocumentsAttached: caseRecord.documents.length > 0,
    financialAcknowledgmentRequired:
      Boolean(readBoolean(financial, "required")) || documentKeys.has("financial_responsibility_notice"),
    financialAcknowledgmentCompleted: Boolean(readBoolean(financial, "completed")),
    openValidationErrors: readNumber(validation, "open_errors") ?? 0,
    auditChainVerified: auditVerification.verified,
    consentCount: caseRecord.consentRecords.length,
    documentCount: caseRecord.documents.length,
  });

  await prisma.legalReadinessCheck.create({
    data: {
      tenantId: auth.tenant_id!,
      caseId,
      status: report.status,
      canFinalize: report.readyForLegal,
      checklistJson: report.checklist as unknown as object,
      blockersJson: report.blockers as unknown as object,
      checkedByUserId: auth.sub,
      checkedAt: new Date(report.checkedAt),
    },
  }).catch(() => undefined);

  return report;
}

export async function assertCaseReadyForLegalExport(auth: AuthContext, caseId: string) {
  const report = await getLegalReadiness(auth, caseId);
  if (!report.readyForLegal) {
    throw new ApiError(409, `Legal export blocked: ${report.blockers.join(" | ")}`);
  }
  return report;
}