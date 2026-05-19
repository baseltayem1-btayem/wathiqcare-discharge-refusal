import { enforceServerOnly } from "@/lib/server/enforce-server-only";

import { resolveEvidenceAccess } from "@/lib/pdf-engine/access-control/evidence-access";
import { buildAuditTimeline, serializeAuditTimeline } from "@/lib/pdf-engine/audit/audit-timeline";
import { buildAuditViewModel } from "@/lib/pdf-engine/audit/audit-view";
import { performForensicVerification } from "@/lib/pdf-engine/audit/forensic-verification";
import { buildComplianceDashboard } from "@/lib/pdf-engine/dashboard/compliance-dashboard";
import { buildEvidenceDashboard } from "@/lib/pdf-engine/dashboard/evidence-dashboard";
import { buildForensicDashboard } from "@/lib/pdf-engine/dashboard/forensic-dashboard";
import { buildLegalOperationsDashboard } from "@/lib/pdf-engine/dashboard/legal-operations-dashboard";
import { buildEvidenceAnalytics } from "@/lib/pdf-engine/management/evidence-analytics";
import { buildEvidenceLifecycleTrail, resolveEvidenceLifecycleState } from "@/lib/pdf-engine/management/evidence-lifecycle";
import { buildEvidenceSummary, registerEvidence } from "@/lib/pdf-engine/management/evidence-manager";
import { evaluateRetentionCompliance } from "@/lib/pdf-engine/management/retention-enforcement";
import { resolveTenantContext } from "@/lib/pdf-engine/multi-tenant/tenant-context";
import { registerTenant } from "@/lib/pdf-engine/multi-tenant/tenant-registry";
import { buildComplianceReview } from "@/lib/pdf-engine/operations/compliance-review";
import { buildEvidenceConsole } from "@/lib/pdf-engine/operations/evidence-console";
import { buildLegalDisclosurePackage } from "@/lib/pdf-engine/operations/legal-disclosure";
import { buildRetentionDashboard } from "@/lib/pdf-engine/operations/retention-dashboard";
import { buildJudicialEvidenceExport } from "@/lib/pdf-engine/persistence/judicial-export";
import { logEvidenceAccess, retrieveAccessAuditTrail } from "@/lib/pdf-engine/security/access-audit";
import { buildForensicAlerts } from "@/lib/pdf-engine/security/forensic-alerts";
import { buildIntegrityHealthReport, monitorEvidenceIntegrity } from "@/lib/pdf-engine/security/integrity-monitor";
import { buildEvidenceTimelineModel } from "@/lib/pdf-engine/ui-models/evidence-timeline-model";
import { buildForensicInspectionModel } from "@/lib/pdf-engine/ui-models/forensic-inspection-model";
import { buildJudicialExportModel } from "@/lib/pdf-engine/ui-models/judicial-export-model";
import { buildOperationsConsoleModel } from "@/lib/pdf-engine/ui-models/operations-console-model";
import { buildVerificationPageModel } from "@/lib/pdf-engine/ui-models/verification-page-model";
import { buildVerificationPresentation } from "@/lib/pdf-engine/verification/verification-presenter";
import { resolveVerificationRequest } from "@/lib/pdf-engine/verification/verification-resolver";
import { validateEvidencePackage } from "@/lib/pdf-engine/verification/verification-validator";
import {
  buildInformedConsentEvidenceHtmlPreview,
  isInformedConsentPdfEnginePreviewEnabled,
  type BuildInformedConsentEvidenceHtmlPreviewInput,
} from "@/lib/server/informed-consent-pdf-preview-adapter";

enforceServerOnly();

export interface InformedConsentPdfRuntimeProbeResult {
  accessEvaluation: ReturnType<typeof resolveEvidenceAccess>;
  analyticsSummary: ReturnType<typeof buildEvidenceAnalytics>;
  auditChainHash: string;
  auditTimeline: string;
  auditView: ReturnType<typeof buildAuditViewModel>;
  complianceDashboard: ReturnType<typeof buildComplianceDashboard>;
  complianceReview: ReturnType<typeof buildComplianceReview>;
  evidenceDashboard: ReturnType<typeof buildEvidenceDashboard>;
  evidenceTimelineModel: ReturnType<typeof buildEvidenceTimelineModel>;
  forensicAlerts: ReturnType<typeof buildForensicAlerts>;
  forensicDashboard: ReturnType<typeof buildForensicDashboard>;
  forensicVerificationReport: ReturnType<typeof performForensicVerification>;
  forensicInspectionModel: ReturnType<typeof buildForensicInspectionModel>;
  integrityHealthReport: ReturnType<typeof buildIntegrityHealthReport>;
  immutableSeal: string;
  judicialExportPayload: ReturnType<typeof buildJudicialEvidenceExport>;
  judicialExportModel: ReturnType<typeof buildJudicialExportModel>;
  legalEvidencePackage: Awaited<ReturnType<typeof buildInformedConsentEvidenceHtmlPreview>>["legalEvidencePackage"];
  legalDisclosurePackage: ReturnType<typeof buildLegalDisclosurePackage>;
  legalOperationsDashboard: ReturnType<typeof buildLegalOperationsDashboard>;
  lifecycleState: ReturnType<typeof resolveEvidenceLifecycleState>;
  lifecycleTrail: ReturnType<typeof buildEvidenceLifecycleTrail>;
  operationsConsoleModel: ReturnType<typeof buildOperationsConsoleModel>;
  registeredEvidenceSummary: ReturnType<typeof buildEvidenceSummary>;
  retentionComplianceSummary: ReturnType<typeof evaluateRetentionCompliance>;
  retentionDashboardModel: ReturnType<typeof buildRetentionDashboard>;
  tenantPartitionInfo: ReturnType<typeof registerEvidence>["tenantPartition"];
  verificationDto: ReturnType<typeof buildVerificationPresentation>;
  verificationPageModel: ReturnType<typeof buildVerificationPageModel>;
  verificationResolution: ReturnType<typeof resolveVerificationRequest>;
  verificationPayload: string;
  archivedEvidence: ReturnType<typeof registerEvidence>["archivedEvidence"];
}

export { isInformedConsentPdfEnginePreviewEnabled };

export async function buildInformedConsentPdfRuntimeProbe(
  input: BuildInformedConsentEvidenceHtmlPreviewInput,
): Promise<InformedConsentPdfRuntimeProbeResult> {
  if (!isInformedConsentPdfEnginePreviewEnabled()) {
    throw new Error("Informed consent PDF runtime probe is disabled.");
  }

  const preview = await buildInformedConsentEvidenceHtmlPreview(input);
  registerTenant({
    code: "mock-tenant",
    displayName: "Mock Preview Tenant",
    region: "Riyadh",
    status: "preview",
    tenantId: input.document.tenantId,
  });
  const tenantContext = resolveTenantContext({
    actorId: "internal-management-preview",
    legalPrivilege: true,
    role: "legal-admin",
    tenantId: input.document.tenantId,
  });
  const { archivedEvidence, tenantPartition } = registerEvidence({
    legalEvidencePackage: preview.legalEvidencePackage,
    sensitivity: "restricted",
    tenantId: tenantContext.tenantId,
  });
  const validation = validateEvidencePackage(preview.legalEvidencePackage);
  const verificationDto = buildVerificationPresentation(preview.legalEvidencePackage, validation);
  const forensicVerificationReport = performForensicVerification({
    archivedEvidence,
    legalEvidencePackage: preview.legalEvidencePackage,
    verificationToken: preview.verificationToken,
  });
  const judicialExportPayload = buildJudicialEvidenceExport({
    archivedEvidence,
    forensicVerificationReference: forensicVerificationReport.reference,
    legalEvidencePackage: preview.legalEvidencePackage,
  });
  const auditTimelineModel = buildAuditTimeline({
    archivedEvidence,
    forensicVerificationReference: forensicVerificationReport.reference,
    legalEvidencePackage: preview.legalEvidencePackage,
  });
  const accessEvaluation = resolveEvidenceAccess({
    action: "view",
    actorId: tenantContext.actorId,
    actorTenantId: tenantContext.tenantId,
    department: "legal",
    evidenceId: preview.legalEvidencePackage.evidenceId,
    evidenceSensitivity: tenantPartition.sensitivity,
    evidenceTenantId: tenantPartition.tenantId,
    legalPrivilege: tenantContext.legalPrivilege,
    role: tenantContext.role,
  });
  logEvidenceAccess({
    action: "view",
    actorId: tenantContext.actorId,
    actorTenantId: tenantContext.tenantId,
    department: "legal",
    evidenceId: preview.legalEvidencePackage.evidenceId,
    outcome: accessEvaluation.allowed ? "allowed" : "denied",
    reason: accessEvaluation.reason,
    role: tenantContext.role,
  });
  const evidenceTimelineModel = buildEvidenceTimelineModel({
    auditTimeline: auditTimelineModel,
    legalEvidencePackage: preview.legalEvidencePackage,
  });
  const retentionDashboardModel = buildRetentionDashboard([archivedEvidence]);
  const retentionItem = retentionDashboardModel[0] || null;
  const retentionComplianceSummary = evaluateRetentionCompliance([archivedEvidence]);
  const verificationPageModel = buildVerificationPageModel({
    forensicVerificationReport,
    legalEvidencePackage: preview.legalEvidencePackage,
    retentionItem,
  });
  const forensicInspectionModel = buildForensicInspectionModel({
    forensicVerificationReport,
    legalEvidencePackage: preview.legalEvidencePackage,
  });
  const judicialExportModel = buildJudicialExportModel(judicialExportPayload);
  const operationsConsoleModel = buildOperationsConsoleModel(buildEvidenceConsole([archivedEvidence]));
  const lifecycleState = resolveEvidenceLifecycleState({
    archivedEvidence,
    judicialExported: true,
    legalEvidencePackage: preview.legalEvidencePackage,
  });
  const lifecycleTrail = buildEvidenceLifecycleTrail({
    archivedEvidence,
    judicialExported: true,
    legalEvidencePackage: preview.legalEvidencePackage,
  });
  const registeredEvidenceSummary = buildEvidenceSummary(archivedEvidence);
  const complianceReview = buildComplianceReview({
    archivedEvidence,
    forensicVerificationReport,
    legalEvidencePackage: preview.legalEvidencePackage,
    retentionItem,
  });
  const legalDisclosurePackage = buildLegalDisclosurePackage({
    judicialExportReference: judicialExportPayload.judicialExportReference,
    legalEvidencePackage: preview.legalEvidencePackage,
    timelineModel: evidenceTimelineModel,
    verificationPageModel,
  });
  const forensicAlerts = buildForensicAlerts({
    accessAuditTrail: retrieveAccessAuditTrail({ evidenceId: preview.legalEvidencePackage.evidenceId }),
    evidenceId: preview.legalEvidencePackage.evidenceId,
    forensicVerificationReport,
    retentionViolations: retentionComplianceSummary.violations,
    tenantIsolationValid: accessEvaluation.allowed,
  });
  const analyticsSummary = buildEvidenceAnalytics([archivedEvidence], forensicAlerts);
  const integrityHealthReport = buildIntegrityHealthReport(monitorEvidenceIntegrity([archivedEvidence]));
  const evidenceDashboard = buildEvidenceDashboard({
    analytics: analyticsSummary,
    evidenceSummaries: [registeredEvidenceSummary],
  });
  const complianceDashboard = buildComplianceDashboard(retentionComplianceSummary);
  const forensicDashboard = buildForensicDashboard({
    alerts: forensicAlerts,
    integrityHealthReport,
  });
  const legalOperationsDashboard = buildLegalOperationsDashboard({
    accessEvaluation,
    lifecycleState,
  });
  const verificationResolution = resolveVerificationRequest({
    evidenceId: preview.legalEvidencePackage.evidenceId,
    verificationToken: preview.verificationToken,
  });

  return {
    accessEvaluation,
    analyticsSummary,
    archivedEvidence,
    auditChainHash: preview.legalEvidencePackage.auditChain.currentChainHash,
    auditTimeline: serializeAuditTimeline(auditTimelineModel),
    auditView: buildAuditViewModel(auditTimelineModel),
    complianceDashboard,
    complianceReview,
    evidenceDashboard,
    evidenceTimelineModel,
    forensicAlerts,
    forensicDashboard,
    forensicVerificationReport,
    forensicInspectionModel,
    integrityHealthReport,
    immutableSeal: preview.legalEvidencePackage.immutableSeal.fingerprint,
    judicialExportPayload,
    judicialExportModel,
    legalEvidencePackage: preview.legalEvidencePackage,
    legalDisclosurePackage,
    legalOperationsDashboard,
    lifecycleState,
    lifecycleTrail,
    operationsConsoleModel,
    registeredEvidenceSummary,
    retentionComplianceSummary,
    retentionDashboardModel,
    tenantPartitionInfo: tenantPartition,
    verificationDto,
    verificationPageModel,
    verificationResolution,
    verificationPayload: preview.legalEvidencePackage.qrVerificationPayload,
  };
}