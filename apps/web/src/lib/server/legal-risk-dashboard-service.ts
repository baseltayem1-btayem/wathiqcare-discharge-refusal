import { $Enums, type CaseType } from "@prisma/client";
import type { AuthContext } from "@/lib/server/auth";
import { ApiError } from "@/lib/server/http";
import { getPrisma } from "@/lib/server/prisma";
import { canonicalizeUserRole } from "@/lib/server/roles";
import { asRecord, readBoolean, readNumber, readString, toIsoString } from "@/lib/server/compliance-utils";

const prisma = () => getPrisma();

const ALLOWED_ROLES = new Set([
  "tenant_owner",
  "tenant_admin",
  "medical_director",
  "doctor",
  "quality",
  "compliance",
  "legal_admin",
  "nursing",
  "patient_affairs",
  "social_services",
  "bed_manager",
]);

const DETAILED_ROLES = new Set(["tenant_owner", "tenant_admin", "quality", "compliance", "legal_admin"]);
const LEGAL_QUEUE_ROLES = new Set(["tenant_owner", "tenant_admin", "legal_admin"]);

export type LegalRiskLevel = "Low" | "Medium" | "High" | "Critical";

type DashboardFilters = {
  dateFrom?: string | null;
  dateTo?: string | null;
  department?: string | null;
  physician?: string | null;
  caseStatus?: string | null;
  riskLevel?: string | null;
  escalationStatus?: string | null;
  signatureStatus?: string | null;
  insuranceCoverageStatus?: string | null;
};

type RiskCaseRow = {
  caseId: string;
  patientName: string;
  mrn: string;
  department: string;
  attendingPhysician: string;
  refusalDurationHours: number;
  riskLevel: LegalRiskLevel;
  missingItem: string;
  escalationStatus: string;
  lastUpdate: string;
};

type DocumentGapRow = {
  caseId: string;
  refusalForm: "Yes" | "No";
  financialNotice: "Yes" | "No";
  promissoryNote: "Yes" | "No";
  witnesses: number;
  signatureStatus: "Signed" | "Unsigned";
  escalationForm: "Yes" | "No";
  completionBlocked: "Yes" | "No";
};

type LegalFollowUpRow = {
  caseId: string;
  escalationDate: string | null;
  legalSummaryAvailable: "Yes" | "No";
  promissoryNoteAvailable: "Yes" | "No";
  financialExposure: "Yes" | "No";
  recommendedAction: string;
};

type ScoredCase = {
  caseId: string;
  caseStatus: string;
  workflowStatus: string;
  currentStage: string;
  policyStage: string;
  patientName: string;
  mrn: string;
  department: string;
  attendingPhysician: string;
  insuranceCoverageStatus: string;
  dischargeDecisionAt: string | null;
  escalationAt: string | null;
  closedAt: string | null;
  lastUpdate: string;
  refusalDurationHours: number;
  over24Hours: boolean;
  refusalFormAvailable: boolean;
  financialNoticeAvailable: boolean;
  promissoryRequired: boolean;
  promissoryAvailable: boolean;
  witnessCount: number;
  escalationFormAvailable: boolean;
  legalSummaryAvailable: boolean;
  signatureCaptured: boolean;
  unsignedRequiredDocuments: number;
  communicationLogged: boolean;
  socialInterventionLogged: boolean;
  completionBlocked: boolean;
  financialExposure: boolean;
  needsLegalReview: boolean;
  missingItems: string[];
  flags: string[];
  riskLevel: LegalRiskLevel;
};

function normalize(value: string | null | undefined): string {
  return (value || "").trim().toLowerCase();
}

function hasDocumentByCodeOrKey(
  documents: Array<{ documentCode: string | null; templateKey: string | null }>,
  code: string,
  templateKey: string,
): boolean {
  return documents.some((item) => normalize(item.documentCode) === normalize(code) || normalize(item.templateKey) === normalize(templateKey));
}

function hasSignedDocumentByCodeOrKey(
  documents: Array<{ documentCode: string | null; templateKey: string | null; signedAt: Date | null; status: string }>,
  code: string,
  templateKey: string,
): boolean {
  return documents.some((item) => {
    const matches = normalize(item.documentCode) === normalize(code) || normalize(item.templateKey) === normalize(templateKey);
    if (!matches) {
      return false;
    }
    return Boolean(item.signedAt) || normalize(item.status) === "signed";
  });
}

function getPolicyStage(currentStage: string, workflow: Record<string, unknown> | null): string {
  const explicit = readString(workflow, "policy_stage_code");
  if (explicit) {
    return explicit;
  }

  switch (currentStage) {
    case "medical_discharge_decision":
      return "Stage 1: Decision Issued";
    case "initial_communication":
      return "Stage 2: Communication Logged";
    case "support_and_intervention":
      return "Stage 3: Social Intervention";
    case "refusal_form":
      return "Stage 4: Refusal Form Completed";
    case "official_notification":
      return "Stage 5: Financial Notice Issued";
    case "escalation":
      return "Stage 7: Escalation";
    case "closed":
      return "Stage 8: Closure";
    default:
      return "Stage 1: Decision Issued";
  }
}

function inferCurrentStage(workflow: Record<string, unknown> | null): string {
  const current = readString(workflow, "current_stage");
  if (current) {
    return current;
  }

  if (readString(workflow, "closed_at")) {
    return "closed";
  }
  if (readString(workflow, "escalated_at")) {
    return "escalation";
  }
  if (readString(workflow, "financial_notice_generated_at")) {
    return "official_notification";
  }
  if (readString(workflow, "refusal_form_generated_at")) {
    return "refusal_form";
  }
  if (readString(workflow, "support_and_intervention_at") || readString(workflow, "social_services_referred_at")) {
    return "support_and_intervention";
  }
  if (readString(workflow, "initial_communication_at")) {
    return "initial_communication";
  }
  return "medical_discharge_decision";
}

function buildScoredCase(input: {
  caseRecord: {
    id: string;
    caseNumber: string | null;
    status: string;
    patientName: string | null;
    medicalRecordNo: string | null;
    createdAt: Date;
    updatedAt: Date;
    closedAt: Date | null;
    metadata: unknown;
    documents: Array<{ documentCode: string | null; templateKey: string | null; status: string; signedAt: Date | null }>;
    auditLogs: Array<{ action: string; createdAt: Date; metadataJson: unknown }>;
  };
}): ScoredCase {
  const metadata = asRecord(input.caseRecord.metadata);
  const workflow = asRecord(metadata?.workflow);
  const signature = asRecord(metadata?.signature);
  const witness = asRecord(metadata?.witness);
  const legal = asRecord(metadata?.legal);

  const currentStage = inferCurrentStage(workflow);
  const policyStage = getPolicyStage(currentStage, workflow);

  const dischargeDecisionAt =
    toIsoString(readString(workflow, "discharge_decision_at")) ||
    toIsoString(readString(metadata, "discharge_decision_at")) ||
    input.caseRecord.createdAt.toISOString();

  const escalationAt =
    toIsoString(readString(workflow, "escalated_at")) ||
    toIsoString(readString(metadata, "escalated_at"));

  const closedAt = input.caseRecord.closedAt?.toISOString() || toIsoString(readString(workflow, "closed_at"));
  const nowTs = Date.now();
  const decisionTs = dischargeDecisionAt ? new Date(dischargeDecisionAt).getTime() : nowTs;
  const endTs = closedAt ? new Date(closedAt).getTime() : nowTs;
  const refusalDurationHours = Math.max(0, Math.round(((endTs - decisionTs) / (1000 * 60 * 60)) * 10) / 10);
  const over24Hours = refusalDurationHours > 24 && !closedAt;

  const refusalFormAvailable = hasDocumentByCodeOrKey(input.caseRecord.documents, "IMC-DIS-REF-01", "discharge_refusal_form");
  const financialNoticeAvailable = hasDocumentByCodeOrKey(input.caseRecord.documents, "IMC-DIS-NOT-01", "financial_responsibility_notice");
  const promissoryAvailable = hasDocumentByCodeOrKey(input.caseRecord.documents, "IMC-PN-01", "promissory_note");
  const escalationFormAvailable = hasDocumentByCodeOrKey(input.caseRecord.documents, "IMC-ESC-01", "escalation_compliance_form");
  const legalSummaryAvailable = hasDocumentByCodeOrKey(input.caseRecord.documents, "IMC-LEGAL-01", "legal_summary");

  const insuranceCoverageStatus =
    readString(workflow, "insurance_coverage_status") ||
    readString(metadata, "insurance_coverage_status") ||
    "unknown";

  const promissoryRequired = ["uninsured", "not_covered", "self_pay", "uncovered"].includes(normalize(insuranceCoverageStatus));

  const witnessCountFromWorkflow = readNumber(workflow, "witness_count");
  const witnessCountFromMeta = readNumber(metadata, "witness_count");
  const witnessNames = Array.isArray(metadata?.witnesses)
    ? (metadata?.witnesses as unknown[])
        .map((item) => asRecord(item))
        .filter((item) => Boolean(readString(item, "name", "witness_name"))).length
    : 0;
  const singleWitness = readString(witness, "witness_name") ? 1 : 0;
  const witnessCount = Math.max(witnessCountFromWorkflow ?? 0, witnessCountFromMeta ?? 0, witnessNames, singleWitness);

  const communicationLogged =
    Boolean(readString(workflow, "initial_communication_at")) ||
    hasDocumentByCodeOrKey(input.caseRecord.documents, "IMC-COM-01", "communication_log") ||
    input.caseRecord.auditLogs.some((log) => normalize(log.action).includes("communication"));

  const socialInterventionLogged =
    Boolean(readString(workflow, "support_and_intervention_at") || readString(workflow, "social_services_referred_at")) ||
    hasDocumentByCodeOrKey(input.caseRecord.documents, "IMC-SOC-01", "social_intervention_form") ||
    input.caseRecord.auditLogs.some((log) => normalize(log.action).includes("social"));

  const signatureCaptured =
    Boolean(readString(signature, "signer_name")) ||
    Boolean(readBoolean(legal, "signature_obtained")) ||
    hasSignedDocumentByCodeOrKey(input.caseRecord.documents, "IMC-DIS-REF-01", "discharge_refusal_form");

  const requiredSignatureDocs: Array<[string, string]> = [
    ["IMC-DIS-REF-01", "discharge_refusal_form"],
    ["IMC-DIS-NOT-01", "financial_responsibility_notice"],
  ];

  if (promissoryRequired) {
    requiredSignatureDocs.push(["IMC-PN-01", "promissory_note"]);
  }

  const unsignedRequiredDocuments = requiredSignatureDocs.filter(([code, key]) => {
    const generated = hasDocumentByCodeOrKey(input.caseRecord.documents, code, key);
    if (!generated) {
      return false;
    }
    return !hasSignedDocumentByCodeOrKey(input.caseRecord.documents, code, key);
  }).length;

  const missingItems: string[] = [];
  if (!refusalFormAvailable) missingItems.push("Refusal Form");
  if (!financialNoticeAvailable) missingItems.push("Financial Notice");
  if (promissoryRequired && !promissoryAvailable) missingItems.push("Promissory Note");
  if (witnessCount < 2) missingItems.push("Witnesses");
  if (!signatureCaptured) missingItems.push("Patient Signature");
  if (over24Hours && !escalationFormAvailable) missingItems.push("24h Escalation");
  if (!socialInterventionLogged) missingItems.push("Social Intervention");
  if (unsignedRequiredDocuments > 0) missingItems.push("Unsigned Required Documents");

  const financialExposure = !financialNoticeAvailable || (promissoryRequired && !promissoryAvailable);
  const needsLegalReview = Boolean(escalationAt) && !legalSummaryAvailable;

  const criticalConditions = [
    !refusalFormAvailable,
    !financialNoticeAvailable,
    witnessCount === 0,
    over24Hours && !escalationFormAvailable,
    !signatureCaptured,
    promissoryRequired && !promissoryAvailable,
  ];

  const highConditions = [
    missingItems.length > 0,
    witnessCount < 2,
    !financialNoticeAvailable,
    over24Hours,
    !socialInterventionLogged,
  ];

  let riskLevel: LegalRiskLevel = "Low";
  if (criticalConditions.some(Boolean)) {
    riskLevel = "Critical";
  } else if (highConditions.some(Boolean)) {
    riskLevel = "High";
  } else if (!communicationLogged || needsLegalReview) {
    riskLevel = "Medium";
  }

  const completionBlocked = missingItems.length > 0;
  const flags: string[] = [];
  if (completionBlocked) flags.push("Blocked Completion");
  if (!signatureCaptured || unsignedRequiredDocuments > 0) flags.push("Missing Signature");
  if (witnessCount < 2) flags.push("Missing Witnesses");
  if (needsLegalReview) flags.push("Needs Legal Review");
  if (financialExposure) flags.push("Financial Exposure");
  if (over24Hours) flags.push("Over 24 Hours");
  if (riskLevel === "Critical") flags.push("Critical Gap");
  if (!completionBlocked && riskLevel === "Low") flags.push("Ready for Closure");

  const workflowStatus = readString(workflow, "status") || input.caseRecord.status.toLowerCase();
  const caseStatus = readString(workflow, "case_status") || input.caseRecord.status;
  return {
    caseId: input.caseRecord.id,
    caseStatus,
    workflowStatus,
    currentStage,
    policyStage,
    patientName: readString(workflow, "patient_name") || input.caseRecord.patientName || "Unknown",
    mrn: readString(workflow, "medical_record_number") || input.caseRecord.medicalRecordNo || "-",
    department: readString(metadata, "department") || readString(workflow, "responsible_department") || "Unassigned",
    attendingPhysician: readString(workflow, "attending_physician") || "Unassigned",
    insuranceCoverageStatus,
    dischargeDecisionAt,
    escalationAt,
    closedAt,
    lastUpdate: input.caseRecord.updatedAt.toISOString(),
    refusalDurationHours,
    over24Hours,
    refusalFormAvailable,
    financialNoticeAvailable,
    promissoryRequired,
    promissoryAvailable,
    witnessCount,
    escalationFormAvailable,
    legalSummaryAvailable,
    signatureCaptured,
    unsignedRequiredDocuments,
    communicationLogged,
    socialInterventionLogged,
    completionBlocked,
    financialExposure,
    needsLegalReview,
    missingItems,
    flags,
    riskLevel,
  };
}

function mapWorkflowStatusForChart(stage: string): string {
  switch (stage) {
    case "medical_discharge_decision":
      return "Decision Issued";
    case "initial_communication":
      return "Under Communication";
    case "support_and_intervention":
      return "Under Social Intervention";
    case "refusal_form":
      return "Refusal Documented";
    case "official_notification":
      return "Financial Notice Issued";
    case "escalation":
      return "Escalated";
    case "closed":
      return "Closed";
    default:
      return "Decision Issued";
  }
}

function toFilterMap(filters: DashboardFilters): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(filters)) {
    if (value && value.trim()) {
      result[key] = value.trim();
    }
  }
  return result;
}

function applyFilters(cases: ScoredCase[], filters: DashboardFilters): ScoredCase[] {
  const parsedFrom = filters.dateFrom ? Date.parse(filters.dateFrom) : null;
  const parsedTo = filters.dateTo ? Date.parse(filters.dateTo) : null;

  return cases.filter((item) => {
    if (parsedFrom && item.dischargeDecisionAt && Date.parse(item.dischargeDecisionAt) < parsedFrom) {
      return false;
    }
    if (parsedTo && item.dischargeDecisionAt && Date.parse(item.dischargeDecisionAt) > parsedTo + 24 * 60 * 60 * 1000 - 1) {
      return false;
    }
    if (filters.department && normalize(item.department) !== normalize(filters.department)) {
      return false;
    }
    if (filters.physician && normalize(item.attendingPhysician) !== normalize(filters.physician)) {
      return false;
    }
    if (filters.caseStatus && normalize(item.caseStatus) !== normalize(filters.caseStatus)) {
      return false;
    }
    if (filters.riskLevel && normalize(item.riskLevel) !== normalize(filters.riskLevel)) {
      return false;
    }

    if (filters.escalationStatus) {
      const normalizedEscalation = normalize(filters.escalationStatus);
      const escalated = Boolean(item.escalationAt);
      if (normalizedEscalation === "escalated" && !escalated) {
        return false;
      }
      if (normalizedEscalation === "not_escalated" && escalated) {
        return false;
      }
    }

    if (filters.signatureStatus) {
      const normalizedSignature = normalize(filters.signatureStatus);
      const signed = item.signatureCaptured && item.unsignedRequiredDocuments === 0;
      if (normalizedSignature === "signed" && !signed) {
        return false;
      }
      if (normalizedSignature === "unsigned" && signed) {
        return false;
      }
    }

    if (filters.insuranceCoverageStatus && normalize(item.insuranceCoverageStatus) !== normalize(filters.insuranceCoverageStatus)) {
      return false;
    }

    return true;
  });
}

export async function getLegalRiskDashboard(
  auth: AuthContext,
  filters: DashboardFilters,
): Promise<Record<string, unknown>> {
  const tenantId = auth.tenant_id;
  if (!tenantId) {
    throw new ApiError(403, "Tenant context is required");
  }

  const role = canonicalizeUserRole(auth.role);
  if (!ALLOWED_ROLES.has(role)) {
    throw new ApiError(403, "Insufficient role for legal risk dashboard");
  }

  const rawCases = await prisma().case.findMany({
    where: {
      tenantId,
      caseType: $Enums.CaseType.DISCHARGE_REFUSAL,
    },
    include: {
      documents: {
        select: {
          documentCode: true,
          templateKey: true,
          status: true,
          signedAt: true,
        },
      },
      auditLogs: {
        select: {
          action: true,
          createdAt: true,
          metadataJson: true,
        },
        orderBy: { createdAt: "desc" },
        take: 200,
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 1000,
  });

  const scored = rawCases.map((caseRecord) => buildScoredCase({ caseRecord }));
  const filtered = applyFilters(scored, filters);

  const byRiskLevel = {
    Low: filtered.filter((item) => item.riskLevel === "Low").length,
    Medium: filtered.filter((item) => item.riskLevel === "Medium").length,
    High: filtered.filter((item) => item.riskLevel === "High").length,
    Critical: filtered.filter((item) => item.riskLevel === "Critical").length,
  };

  const workflowBuckets = [
    "Decision Issued",
    "Under Communication",
    "Under Social Intervention",
    "Refusal Documented",
    "Financial Notice Issued",
    "Escalated",
    "Closed",
  ];

  const casesByWorkflowStatus = workflowBuckets.map((label) => ({
    label,
    value: filtered.filter((item) => mapWorkflowStatusForChart(item.currentStage) === label).length,
  }));

  const departmentCounts = new Map<string, number>();
  for (const item of filtered) {
    departmentCounts.set(item.department, (departmentCounts.get(item.department) || 0) + 1);
  }

  const refusalFormCompletionRate =
    filtered.length > 0
      ? Math.round((filtered.filter((item) => item.refusalFormAvailable).length / filtered.length) * 100)
      : 0;
  const financialFormCompletionRate =
    filtered.length > 0
      ? Math.round((filtered.filter((item) => item.financialNoticeAvailable).length / filtered.length) * 100)
      : 0;
  const witnessComplianceRate =
    filtered.length > 0
      ? Math.round((filtered.filter((item) => item.witnessCount >= 2).length / filtered.length) * 100)
      : 0;
  const signatureCompletionRate =
    filtered.length > 0
      ? Math.round((filtered.filter((item) => item.signatureCaptured && item.unsignedRequiredDocuments === 0).length / filtered.length) * 100)
      : 0;
  const escalationComplianceRate =
    filtered.length > 0
      ? Math.round((filtered.filter((item) => !item.over24Hours || item.escalationFormAvailable).length / filtered.length) * 100)
      : 0;

  const criticalOrHighRows: RiskCaseRow[] = filtered
    .filter((item) => item.riskLevel === "Critical" || item.riskLevel === "High")
    .map((item) => ({
      caseId: item.caseId,
      patientName: item.patientName,
      mrn: item.mrn,
      department: item.department,
      attendingPhysician: item.attendingPhysician,
      refusalDurationHours: item.refusalDurationHours,
      riskLevel: item.riskLevel,
      missingItem: item.missingItems.join(", ") || "-",
      escalationStatus: item.escalationAt ? "Escalated" : "Not Escalated",
      lastUpdate: item.lastUpdate,
    }));

  const requiredDocumentGaps: DocumentGapRow[] = filtered.map((item) => ({
    caseId: item.caseId,
    refusalForm: item.refusalFormAvailable ? "Yes" : "No",
    financialNotice: item.financialNoticeAvailable ? "Yes" : "No",
    promissoryNote: item.promissoryRequired ? (item.promissoryAvailable ? "Yes" : "No") : "Yes",
    witnesses: item.witnessCount,
    signatureStatus: item.signatureCaptured && item.unsignedRequiredDocuments === 0 ? "Signed" : "Unsigned",
    escalationForm: item.escalationFormAvailable ? "Yes" : "No",
    completionBlocked: item.completionBlocked ? "Yes" : "No",
  }));

  const legalFollowUpQueue: LegalFollowUpRow[] = filtered
    .filter((item) => item.escalationAt || item.riskLevel === "Critical" || item.needsLegalReview)
    .map((item) => ({
      caseId: item.caseId,
      escalationDate: item.escalationAt,
      legalSummaryAvailable: item.legalSummaryAvailable ? "Yes" : "No",
      promissoryNoteAvailable: item.promissoryRequired ? (item.promissoryAvailable ? "Yes" : "No") : "Yes",
      financialExposure: item.financialExposure ? "Yes" : "No",
      recommendedAction: item.needsLegalReview
        ? "Generate legal summary and assign legal review immediately"
        : item.riskLevel === "Critical"
          ? "Urgent legal + compliance intervention"
          : "Monitor and close documentation gaps",
    }));

  const hasDetailedAccess = DETAILED_ROLES.has(role);
  const canViewLegalQueue = LEGAL_QUEUE_ROLES.has(role);

  return {
    filters: toFilterMap(filters),
    access: {
      role,
      scope: hasDetailedAccess ? "detailed" : "general",
      canViewLegalQueue,
    },
    kpis: {
      totalRefusalCases: filtered.length,
      openCases: filtered.filter((item) => !item.closedAt).length,
      completedCases: filtered.filter((item) => Boolean(item.closedAt)).length,
      escalatedCases: filtered.filter((item) => Boolean(item.escalationAt)).length,
      casesOver24Hours: filtered.filter((item) => item.over24Hours).length,
      highRiskCases: filtered.filter((item) => item.riskLevel === "High").length,
      criticalRiskCases: filtered.filter((item) => item.riskLevel === "Critical").length,
      unsignedRequiredDocuments: filtered.filter((item) => item.unsignedRequiredDocuments > 0 || !item.signatureCaptured).length,
      missingWitnesses: filtered.filter((item) => item.witnessCount < 2).length,
      financialExposureCases: filtered.filter((item) => item.financialExposure).length,
    },
    tables: {
      criticalHighRiskCases: hasDetailedAccess ? criticalOrHighRows : criticalOrHighRows.slice(0, 20),
      requiredDocumentsGaps: hasDetailedAccess ? requiredDocumentGaps : requiredDocumentGaps.slice(0, 20),
      legalFollowUpQueue: canViewLegalQueue ? legalFollowUpQueue : [],
    },
    charts: {
      casesByRiskLevel: byRiskLevel,
      casesByWorkflowStatus,
      refusalCasesByDepartment: Array.from(departmentCounts.entries()).map(([label, value]) => ({ label, value })),
      casesExceeding24Hours: {
        total: filtered.filter((item) => item.over24Hours).length,
        escalated: filtered.filter((item) => item.over24Hours && Boolean(item.escalationAt)).length,
        notEscalated: filtered.filter((item) => item.over24Hours && !item.escalationAt).length,
      },
      documentComplianceRate: {
        refusalFormCompletionRate,
        financialFormCompletionRate,
        witnessComplianceRate,
        signatureCompletionRate,
        escalationComplianceRate,
      },
    },
    cases: filtered.map((item) => ({
      caseId: item.caseId,
      policyStage: item.policyStage,
      riskLevel: item.riskLevel,
      flags: item.flags,
      missingItems: item.missingItems,
      refusalDurationHours: item.refusalDurationHours,
      insuranceCoverageStatus: item.insuranceCoverageStatus,
      caseStatus: item.caseStatus,
      workflowStatus: item.workflowStatus,
      dischargeDecisionAt: item.dischargeDecisionAt,
      escalationAt: item.escalationAt,
      signatureStatus: item.signatureCaptured && item.unsignedRequiredDocuments === 0 ? "Signed" : "Unsigned",
      witnessCount: item.witnessCount,
      completionBlocked: item.completionBlocked,
    })),
  };
}
