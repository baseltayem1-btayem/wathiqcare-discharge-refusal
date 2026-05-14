/**
 * Environment Module Index
 *
 * Central export point for all environment governance utilities
 */

// Core environment configuration
export {
  type AppEnvironment,
  type FeatureMode,
  type EnvironmentConfig,
  getEnvironmentConfig,
  useEnvironmentConfig,
  resetEnvironmentConfig,
  assertEnvironment,
  isProductionSafeEnvironment,
} from "./environment";

// Role-based access control
export {
  type TestAccountVisibilityRole,
  canSeeTestAccounts,
  canAccessPilotWorkflows,
  isRestrictedRole,
  validateTestCaseAccess,
  validateLiveSmsAccess,
  validateEvidenceExportAccess,
  validateTestDataInReport,
  validateDataMixing,
} from "./test-account-access";

// Audit logging
export {
  type EnvironmentAuditEventType,
  type EnvironmentAuditEvent,
  auditEnvironmentEvent,
  auditTestAccountAccess,
  auditTestSmsSent,
  auditTestCaseCreated,
  auditEvidenceExport,
  auditDataMixing,
  auditTestDataInReport,
} from "./audit-logging";
