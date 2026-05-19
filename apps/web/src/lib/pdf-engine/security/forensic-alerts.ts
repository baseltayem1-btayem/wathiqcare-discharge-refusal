import type { ForensicVerificationReport } from "@/lib/pdf-engine/audit/forensic-verification";
import type { RetentionViolation } from "@/lib/pdf-engine/management/retention-enforcement";
import type { AccessAuditEvent } from "@/lib/pdf-engine/security/access-audit";

export type ForensicAlertType =
  | "failed-integrity"
  | "forensic-mismatch"
  | "repeated-access-attempts"
  | "retention-violation"
  | "suspicious-verification"
  | "tenant-boundary-violation";

export interface ForensicAlert {
  alertId: string;
  createdAt: string;
  evidenceId: string;
  message: string;
  severity: "high" | "medium" | "low";
  type: ForensicAlertType;
}

function createAlert(input: Omit<ForensicAlert, "alertId" | "createdAt">): ForensicAlert {
  return {
    ...input,
    alertId: `${input.type}:${input.evidenceId}:${input.severity}`,
    createdAt: new Date().toISOString(),
  };
}

export function buildForensicAlerts(input: {
  accessAuditTrail?: AccessAuditEvent[];
  evidenceId: string;
  forensicVerificationReport?: ForensicVerificationReport | null;
  retentionViolations?: RetentionViolation[];
  tenantIsolationValid?: boolean;
}): ForensicAlert[] {
  const alerts: ForensicAlert[] = [];
  const deniedEvents = (input.accessAuditTrail || []).filter((event) => event.outcome === "denied");

  if (input.forensicVerificationReport && !input.forensicVerificationReport.valid) {
    alerts.push(
      createAlert({
        evidenceId: input.evidenceId,
        message: "Evidence integrity verification failed.",
        severity: "high",
        type: "failed-integrity",
      }),
    );
  }
  if (input.forensicVerificationReport && (!input.forensicVerificationReport.qrVerificationValid || !input.forensicVerificationReport.tokenValid)) {
    alerts.push(
      createAlert({
        evidenceId: input.evidenceId,
        message: "Suspicious verification token or QR validation detected.",
        severity: "medium",
        type: "suspicious-verification",
      }),
    );
  }
  if (input.forensicVerificationReport && !input.forensicVerificationReport.auditChainIntegrityValid) {
    alerts.push(
      createAlert({
        evidenceId: input.evidenceId,
        message: "Forensic audit chain mismatch detected.",
        severity: "high",
        type: "forensic-mismatch",
      }),
    );
  }
  if (deniedEvents.length >= 3) {
    alerts.push(
      createAlert({
        evidenceId: input.evidenceId,
        message: "Repeated denied access attempts detected for the same evidence.",
        severity: "medium",
        type: "repeated-access-attempts",
      }),
    );
  }
  if (input.tenantIsolationValid === false) {
    alerts.push(
      createAlert({
        evidenceId: input.evidenceId,
        message: "Tenant boundary violation detected.",
        severity: "high",
        type: "tenant-boundary-violation",
      }),
    );
  }
  for (const violation of input.retentionViolations || []) {
    alerts.push(
      createAlert({
        evidenceId: violation.evidenceId,
        message: violation.reason,
        severity: violation.severity,
        type: "retention-violation",
      }),
    );
  }

  return alerts;
}