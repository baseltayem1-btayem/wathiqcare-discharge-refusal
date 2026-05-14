/**
 * Environment Audit Logging
 *
 * Track access to demo/test accounts and environment-sensitive operations
 */

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

/**
 * Log environment-related audit events
 *
 * These should be persisted to an audit trail in the database
 */
export function auditEnvironmentEvent(event: EnvironmentAuditEvent): void {
  // Log to console in development
  if (process.env.NODE_ENV === "development") {
    console.log(
      `[AUDIT ${event.severity.toUpperCase()}] ${event.eventType}`,
      {
        userId: event.userId,
        userRole: event.userRole,
        caseId: event.caseId,
        environment: event.environment,
        ...event.details,
      }
    );
  }

  // In production, this would be sent to:
  // - Audit trail database
  // - SIEM system
  // - Compliance logging service

  // TODO: Implement actual audit logging to database
  // This is a placeholder that should be replaced with real logging
}

/**
 * Helper to log test account access
 */
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

/**
 * Helper to log test SMS attempts
 */
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

/**
 * Helper to log test case creation
 */
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

/**
 * Helper to log evidence export attempts
 */
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

/**
 * Helper to log data mixing attempts
 */
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

/**
 * Helper to log test data in reports
 */
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
