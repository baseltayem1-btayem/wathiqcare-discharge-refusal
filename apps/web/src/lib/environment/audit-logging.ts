import { logRuntimeEvent, sanitizeLogDetails } from "@/lib/server/runtime-observability";

export type EnvironmentAuditEventType =
  | "test_account_access"
  | "test_case_created"
  | "test_sms_sent"
  | "test_evidence_exported"
  | "environment_mode_changed"
  | "test_data_in_report"
  | "data_mixing_attempted"
  | "access_denied_test_account"
  | "access_denied_demo_account"
  | "demo_sms_attempted";

export interface EnvironmentAuditEvent {
  eventType: EnvironmentAuditEventType;
  userId: string;
  userRole: string;
  caseId?: string;
  testCaseId?: string;
  timestamp: Date;
  environment: string;
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, unknown>;
  severity: "info" | "warning" | "error";
}

export function auditEnvironmentEvent(event: EnvironmentAuditEvent): void {
  logRuntimeEvent({
    module: "environment_audit",
    event: event.eventType,
    severity: event.severity === "warning" ? "warn" : event.severity,
    details: {
      userId: event.userId,
      userRole: event.userRole,
      caseId: event.caseId,
      testCaseId: event.testCaseId,
      environment: event.environment,
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
      ...sanitizeLogDetails(event.details ?? {}),
    },
  });
}

export function auditTestAccountAccess(
  userId: string,
  userRole: string,
  caseId: string,
  allowed: boolean,
  environment: string,
  details?: Record<string, unknown>
): void {
  auditEnvironmentEvent({
    eventType: allowed ? "test_account_access" : "access_denied_test_account",
    userId,
    userRole,
    caseId,
    timestamp: new Date(),
    environment,
    severity: allowed ? "info" : "warning",
    details,
  });
}

export function auditTestSmsSent(
  userId: string,
  userRole: string,
  caseId: string,
  allowed: boolean,
  environment: string,
  smsMode: string,
  details?: Record<string, unknown>
): void {
  auditEnvironmentEvent({
    eventType: allowed ? "test_sms_sent" : "demo_sms_attempted",
    userId,
    userRole,
    caseId,
    timestamp: new Date(),
    environment,
    severity: allowed ? "info" : "warning",
    details: {
      smsMode,
      ...details,
    },
  });
}

export function auditTestCaseCreated(
  userId: string,
  userRole: string,
  testCaseId: string,
  environment: string,
  details?: Record<string, unknown>
): void {
  auditEnvironmentEvent({
    eventType: "test_case_created",
    userId,
    userRole,
    testCaseId,
    timestamp: new Date(),
    environment,
    severity: "info",
    details,
  });
}

export function auditEvidenceExport(
  userId: string,
  userRole: string,
  caseId: string,
  allowed: boolean,
  environment: string,
  isTestCase: boolean,
  details?: Record<string, unknown>
): void {
  auditEnvironmentEvent({
    eventType: "test_evidence_exported",
    userId,
    userRole,
    caseId,
    timestamp: new Date(),
    environment,
    severity: allowed ? "info" : "warning",
    details: {
      allowed,
      isTestCase,
      ...details,
    },
  });
}

export function auditDataMixing(
  userId: string,
  userRole: string,
  allowed: boolean,
  environment: string,
  details?: Record<string, unknown>
): void {
  auditEnvironmentEvent({
    eventType: "data_mixing_attempted",
    userId,
    userRole,
    timestamp: new Date(),
    environment,
    severity: allowed ? "info" : "error",
    details,
  });
}

export function auditTestDataInReport(
  userId: string,
  userRole: string,
  allowed: boolean,
  environment: string,
  reportType: string,
  testCaseCount: number,
  details?: Record<string, unknown>
): void {
  auditEnvironmentEvent({
    eventType: "test_data_in_report",
    userId,
    userRole,
    timestamp: new Date(),
    environment,
    severity: allowed ? "info" : "warning",
    details: {
      allowed,
      reportType,
      testCaseCount,
      ...details,
    },
  });
}
