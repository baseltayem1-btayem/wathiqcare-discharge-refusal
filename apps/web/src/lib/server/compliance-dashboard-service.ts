import { $Enums, type CaseType } from "@prisma/client";
import type { AuthContext } from "@/lib/server/auth";
import { requireTenantId } from "@/lib/server/auth";
import { getPrisma } from "@/lib/server/prisma";
import { asRecord, readBoolean, readNumber, readString } from "@/lib/server/compliance-utils";
import { deriveDsrSlaState } from "@/lib/server/dsr-service";
import { evaluateLegalReadinessFromSnapshot } from "@/lib/server/legal-readiness-service";
import { summarizeBackupReadiness } from "@/lib/server/backup-dr-service";
import { summarizeReportAccessActivity } from "@/lib/server/report-access-service";
import { summarizeSecurityIncidents } from "@/lib/server/incident-response-service";
import { extractPolicyAttestationRegister, summarizePolicyAttestations } from "@/lib/server/policy-attestation-service";
import { extractThirdPartyRiskRegister, summarizeThirdPartyRisk } from "@/lib/server/third-party-risk-service";
import { extractTrainingComplianceRegister, summarizeTrainingCompliance } from "@/lib/server/training-compliance-service";
import { extractRemediationTracker, summarizeRemediationTracker } from "@/lib/server/remediation-tracker-service";
import { verifyAuditChain } from "@/lib/server/audit-chain-service";
import { evaluateWitnessIntegrity } from "@/lib/server/witness-integrity-service";

const prisma = () => getPrisma();

type ComplianceCaseInput = {
  id: string;
  caseNumber?: string | null;
  patientName?: string | null;
  signer?: string | null;
  legalReady: boolean;
  consentRecorded: boolean;
  auditChainVerified: boolean;
  pdplEventCount: number;
  openValidationErrors: number;
};

type ComplianceOperationalInput = {
  overdueIncidents: number;
  failedBackups: number;
  overdueDsrs: number;
  deniedPrivilegedAccess: number;
  reportExportEvents: number;
  thirdPartyOverdueReviews?: number;
  thirdPartyCrossBorderFlags?: number;
  overduePolicyAttestations?: number;
  openPolicyExceptions?: number;
  overdueTraining?: number;
  criticalTrainingGaps?: number;
  overdueRemediations?: number;
  criticalOpenRemediations?: number;
};

type ControlStatus = "healthy" | "warning" | "critical";

type ControlCard = {
  status: ControlStatus;
  summary: string;
  metric: number;
};

type AttentionItem = {
  code: string;
  severity: ControlStatus;
  label: string;
  value: number;
};

type DashboardRow = {
  id: string;
  caseNumber?: string | null;
  patientName?: string | null;
  status?: string | null;
  signer?: string | null;
};

function toPercent(value: number, total: number): number {
  if (total <= 0) {
    return 0;
  }
  return Math.round((value / total) * 100);
}

function buildControlCard(metric: number, warningAt: number, criticalAt: number, labels: {
  healthy: string;
  warning: string;
  critical: string;
}): ControlCard {
  if (metric >= criticalAt) {
    return { status: "critical", summary: labels.critical, metric };
  }

  if (metric >= warningAt) {
    return { status: "warning", summary: labels.warning, metric };
  }

  return { status: "healthy", summary: labels.healthy, metric };
}

export function summarizeComplianceDashboard(input: {
  cases: ComplianceCaseInput[];
  operational: ComplianceOperationalInput;
}) {
  const totalCases = input.cases.length;
  const cbahiCases = input.cases.filter((item) => item.legalReady && item.auditChainVerified && item.openValidationErrors <= 0);
  const jciCases = input.cases.filter((item) => item.consentRecorded);
  const missingConsentCases = input.cases.filter((item) => !item.consentRecorded);
  const blockedCases = input.cases.filter((item) => !item.legalReady || !item.auditChainVerified || item.openValidationErrors > 0);
  const pdplLogIndicators = input.cases.reduce((sum, item) => sum + item.pdplEventCount, 0);

  const attention: AttentionItem[] = [];

  if (blockedCases.length > 0) {
    attention.push({
      code: "blocked_cases",
      severity: blockedCases.length >= 3 ? "critical" : "warning",
      label: "Cases blocked from legal export",
      value: blockedCases.length,
    });
  }

  if (input.operational.overdueIncidents > 0) {
    attention.push({
      code: "overdue_incidents",
      severity: input.operational.overdueIncidents >= 2 ? "critical" : "warning",
      label: "Open incidents with overdue notifications",
      value: input.operational.overdueIncidents,
    });
  }

  if (input.operational.failedBackups > 0) {
    attention.push({
      code: "failed_backups",
      severity: input.operational.failedBackups >= 2 ? "critical" : "warning",
      label: "Failed or unverified backup jobs",
      value: input.operational.failedBackups,
    });
  }

  if (input.operational.overdueDsrs > 0) {
    attention.push({
      code: "overdue_dsrs",
      severity: input.operational.overdueDsrs >= 3 ? "critical" : "warning",
      label: "Data subject requests beyond SLA",
      value: input.operational.overdueDsrs,
    });
  }

  if (input.operational.deniedPrivilegedAccess > 0) {
    attention.push({
      code: "denied_privileged_access",
      severity: input.operational.deniedPrivilegedAccess >= 5 ? "critical" : "warning",
      label: "Denied privileged actions requiring review",
      value: input.operational.deniedPrivilegedAccess,
    });
  }

  if ((input.operational.thirdPartyOverdueReviews ?? 0) > 0) {
    attention.push({
      code: "third_party_overdue_reviews",
      severity: (input.operational.thirdPartyOverdueReviews ?? 0) >= 2 ? "critical" : "warning",
      label: "Third-party processor reviews are overdue",
      value: input.operational.thirdPartyOverdueReviews ?? 0,
    });
  }

  if ((input.operational.thirdPartyCrossBorderFlags ?? 0) > 0) {
    attention.push({
      code: "third_party_cross_border",
      severity: (input.operational.thirdPartyCrossBorderFlags ?? 0) >= 2 ? "critical" : "warning",
      label: "Cross-border processors need safeguard review",
      value: input.operational.thirdPartyCrossBorderFlags ?? 0,
    });
  }

  if ((input.operational.overduePolicyAttestations ?? 0) > 0) {
    attention.push({
      code: "policy_attestations_overdue",
      severity: (input.operational.overduePolicyAttestations ?? 0) >= 2 ? "critical" : "warning",
      label: "Policy or control attestations are overdue",
      value: input.operational.overduePolicyAttestations ?? 0,
    });
  }

  if ((input.operational.openPolicyExceptions ?? 0) > 0) {
    attention.push({
      code: "policy_exceptions_open",
      severity: (input.operational.openPolicyExceptions ?? 0) >= 2 ? "critical" : "warning",
      label: "Temporary governance exceptions remain open",
      value: input.operational.openPolicyExceptions ?? 0,
    });
  }

  if ((input.operational.overdueTraining ?? 0) > 0) {
    attention.push({
      code: "training_overdue",
      severity: (input.operational.overdueTraining ?? 0) >= 2 ? "critical" : "warning",
      label: "Mandatory training modules are overdue",
      value: input.operational.overdueTraining ?? 0,
    });
  }

  if ((input.operational.criticalTrainingGaps ?? 0) > 0) {
    attention.push({
      code: "training_critical_gap",
      severity: (input.operational.criticalTrainingGaps ?? 0) >= 2 ? "critical" : "warning",
      label: "Critical workforce readiness gaps remain open",
      value: input.operational.criticalTrainingGaps ?? 0,
    });
  }

  if ((input.operational.overdueRemediations ?? 0) > 0) {
    attention.push({
      code: "remediation_overdue",
      severity: (input.operational.overdueRemediations ?? 0) >= 2 ? "critical" : "warning",
      label: "Corrective actions are overdue",
      value: input.operational.overdueRemediations ?? 0,
    });
  }

  if ((input.operational.criticalOpenRemediations ?? 0) > 0) {
    attention.push({
      code: "remediation_critical_open",
      severity: (input.operational.criticalOpenRemediations ?? 0) >= 2 ? "critical" : "warning",
      label: "Critical remediation actions remain open",
      value: input.operational.criticalOpenRemediations ?? 0,
    });
  }

  const legalRiskCount = blockedCases.length;
  const privacyRiskCount = missingConsentCases.length + input.operational.overdueDsrs;
  const resilienceRiskCount = input.operational.failedBackups;
  const securityRiskCount = input.operational.overdueIncidents + input.operational.deniedPrivilegedAccess;
  const thirdPartyRiskCount = (input.operational.thirdPartyOverdueReviews ?? 0) + (input.operational.thirdPartyCrossBorderFlags ?? 0);
  const policyGovernanceRiskCount = (input.operational.overduePolicyAttestations ?? 0) + (input.operational.openPolicyExceptions ?? 0);
  const workforceReadinessRiskCount = (input.operational.overdueTraining ?? 0) + (input.operational.criticalTrainingGaps ?? 0);
  const remediationRiskCount = (input.operational.overdueRemediations ?? 0) + (input.operational.criticalOpenRemediations ?? 0);

  return {
    totals: {
      cases: totalCases,
      cbahiCompliant: cbahiCases.length,
      jciCompliant: jciCases.length,
      pdplLogIndicators,
      missingConsents: missingConsentCases.length,
    },
    rates: {
      cbahi: toPercent(cbahiCases.length, totalCases),
      jci: toPercent(jciCases.length, totalCases),
    },
    tables: {
      cbahi: cbahiCases.map<DashboardRow>((item) => ({
        id: item.id,
        caseNumber: item.caseNumber,
        patientName: item.patientName,
        status: "Compliant",
      })),
      jci: jciCases.map<DashboardRow>((item) => ({
        id: item.id,
        caseNumber: item.caseNumber,
        signer: item.signer,
        status: "Compliant",
      })),
      missingConsents: missingConsentCases.map<DashboardRow>((item) => ({
        id: item.id,
        caseNumber: item.caseNumber,
        patientName: item.patientName,
        status: "Missing Consent Signature",
      })),
      blockedCases: blockedCases.map<DashboardRow>((item) => ({
        id: item.id,
        caseNumber: item.caseNumber,
        patientName: item.patientName,
        signer: item.signer,
        status: item.legalReady ? "Review Required" : "Blocked",
      })),
    },
    controls: {
      legalReadiness: buildControlCard(legalRiskCount, 1, 3, {
        healthy: "Legal readiness is within target thresholds.",
        warning: "Some cases remain blocked or require evidence completion.",
        critical: "A high number of cases are blocked from legal export.",
      }),
      privacyGovernance: buildControlCard(privacyRiskCount, 1, 3, {
        healthy: "Consent and DSR governance are on track.",
        warning: "Privacy tasks need attention before SLA drift increases.",
        critical: "Privacy governance has critical overdue or missing controls.",
      }),
      resilience: buildControlCard(resilienceRiskCount, 1, 2, {
        healthy: "Backup and recovery posture is healthy.",
        warning: "Backup resiliency needs review.",
        critical: "Backup failures are threatening recovery readiness.",
      }),
      securityResponse: buildControlCard(securityRiskCount, 1, 5, {
        healthy: "Security response posture is healthy.",
        warning: "Security exceptions need review.",
        critical: "Security posture has critical open incidents or denied actions.",
      }),
      thirdPartyRisk: buildControlCard(thirdPartyRiskCount, 1, 2, {
        healthy: "Third-party processor governance is within policy thresholds.",
        warning: "Vendor reviews or transfer safeguards need attention.",
        critical: "Third-party processor exposure is creating PDPL transfer risk.",
      }),
      policyGovernance: buildControlCard(policyGovernanceRiskCount, 1, 2, {
        healthy: "Policy attestations and governance exceptions are under control.",
        warning: "Some policy reviews or waivers need follow-up.",
        critical: "Governance attestations are overdue or exceptions remain open.",
      }),
      workforceReadiness: buildControlCard(workforceReadinessRiskCount, 1, 2, {
        healthy: "Mandatory workforce training is on track.",
        warning: "Some teams have training completion gaps.",
        critical: "Critical medico-legal or PDPL training is overdue.",
      }),
      remediationActions: buildControlCard(remediationRiskCount, 1, 2, {
        healthy: "Corrective actions are being closed on schedule.",
        warning: "Some remediation work needs follow-up before it slips.",
        critical: "Critical or overdue corrective actions are still open.",
      }),
    },
    attention,
    operational: input.operational,
  };
}

export async function getComplianceDashboard(auth: AuthContext) {
  const tenantId = requireTenantId(auth);

  const [cases, incidents, backupJobs, restoreTests, dsrRequests, privilegedAccess, reportAccess, tenant] = await Promise.all([
    prisma().case.findMany({
      where: {
        tenantId,
        OR: [
          { caseType: $Enums.CaseType.DISCHARGE_REFUSAL },
          { workflowType: "discharge_refusal" },
        ],
      },
      include: {
        documents: true,
        auditLogs: { take: 100, orderBy: { createdAt: "desc" } },
        consentRecords: { take: 20, orderBy: { consentedAt: "desc" } },
        auditChainEvents: { take: 200, orderBy: { createdAt: "asc" } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }).catch(() => []),
    prisma().securityIncident.findMany({ where: { tenantId }, orderBy: { detectedAt: "desc" }, take: 100 }).catch(() => []),
    prisma().backupJob.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" }, take: 100 }).catch(() => []),
    prisma().backupRestoreTest.findMany({ where: { tenantId }, orderBy: { executedAt: "desc" }, take: 100 }).catch(() => []),
    prisma().dataSubjectRequest.findMany({ where: { tenantId }, orderBy: { requestedAt: "desc" }, take: 200 }).catch(() => []),
    prisma().privilegedAccessLog.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" }, take: 100 }).catch(() => []),
    prisma().reportAccessLog.findMany({ where: { tenantId }, orderBy: { accessedAt: "desc" }, take: 100 }).catch(() => []),
    prisma().tenant.findUnique({ where: { id: tenantId }, select: { metadata: true } }).catch(() => null),
  ]);

  const complianceCases: ComplianceCaseInput[] = cases.map((caseRecord) => {
    const metadata = asRecord(caseRecord.metadata);
    const workflow = asRecord(metadata?.workflow);
    const presentation = asRecord(metadata?.presentation);
    const signature = asRecord(metadata?.signature);
    const witness = asRecord(metadata?.witness);
    const legal = asRecord(metadata?.legal);
    const validation = asRecord(metadata?.validation);
    const financial = asRecord(metadata?.financial);
    const pdpl = asRecord(metadata?.pdpl);

    const documentKeys = new Set(caseRecord.documents.map((item) => item.templateKey));
    const auditVerification = verifyAuditChain(caseRecord.auditChainEvents);
    const witnessIntegrity = evaluateWitnessIntegrity(caseRecord.metadata);
    const signer = readString(signature, "signer_name") || readString(workflow, "signer_name") || null;
    const pdplEventCount =
      (readNumber(pdpl, "log_count", "event_count") ?? 0) +
      ((Array.isArray((pdpl as Record<string, unknown> | null)?.logs) && ((pdpl as Record<string, unknown>).logs as unknown[]).length) || 0);

    const report = evaluateLegalReadinessFromSnapshot({
      caseId: caseRecord.id,
      medicalDecisionDocumented:
        Boolean(readString(workflow, "discussion_summary", "discharge_decision_at")) ||
        Boolean(readBoolean(legal, "medical_decision_documented")),
      risksExplained:
        Boolean(readBoolean(presentation, "risks_explained", "acknowledged_view")) ||
        Boolean(readBoolean(legal, "risks_explained")),
      refusalFormCompleted:
        documentKeys.has("discharge_refusal_form") || Boolean(readBoolean(legal, "refusal_form_completed")),
      signerCaptured: Boolean(signer) || Boolean(readBoolean(legal, "signature_obtained")),
      capacityVerified: Boolean(readBoolean(legal, "capacity_verified", "authority_verified")),
      witnessRequired:
        Boolean(readBoolean(legal, "witness_required")) || readString(signature, "outcome") === "refused_to_sign",
      witnessAdded: Boolean(readString(witness, "witness_name")),
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

    return {
      id: caseRecord.id,
      caseNumber: caseRecord.caseNumber,
      patientName: caseRecord.patientName,
      signer,
      legalReady: report.readyForLegal,
      consentRecorded: caseRecord.consentRecords.length > 0,
      auditChainVerified: auditVerification.verified,
      pdplEventCount,
      openValidationErrors: readNumber(validation, "open_errors") ?? 0,
    };
  });

  const incidentSummary = summarizeSecurityIncidents(incidents);
  const backupSummary = summarizeBackupReadiness(backupJobs, restoreTests);
  const overdueDsrs = dsrRequests.filter((request) => deriveDsrSlaState(request) === "breached").length;
  const deniedPrivilegedAccess = privilegedAccess.filter((item) => item.result === "denied").length;
  const reportSummary = summarizeReportAccessActivity(reportAccess);
  const thirdPartySummary = summarizeThirdPartyRisk(extractThirdPartyRiskRegister(tenant?.metadata));
  const policySummary = summarizePolicyAttestations(extractPolicyAttestationRegister(tenant?.metadata));
  const trainingSummary = summarizeTrainingCompliance(extractTrainingComplianceRegister(tenant?.metadata));
  const remediationSummary = summarizeRemediationTracker(extractRemediationTracker(tenant?.metadata));

  return summarizeComplianceDashboard({
    cases: complianceCases,
    operational: {
      overdueIncidents: incidentSummary.overdueNotificationCount,
      failedBackups: backupSummary.failedJobs,
      overdueDsrs,
      deniedPrivilegedAccess,
      reportExportEvents: reportSummary.exportEvents,
      thirdPartyOverdueReviews: thirdPartySummary.overdueReviews,
      thirdPartyCrossBorderFlags: thirdPartySummary.crossBorderFlags,
      overduePolicyAttestations: policySummary.overdueAttestations,
      openPolicyExceptions: policySummary.openExceptions,
      overdueTraining: trainingSummary.overdueCount,
      criticalTrainingGaps: trainingSummary.criticalGapCount,
      overdueRemediations: remediationSummary.overdueCount,
      criticalOpenRemediations: remediationSummary.criticalOpenCount,
    },
  });
}
