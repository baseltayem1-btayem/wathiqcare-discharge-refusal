/**
 * Role-Based Access Control for Test/Demo Accounts
 *
 * Determines which roles can see, create, or interact with test/demo accounts
 */

export type TestAccountVisibilityRole =
  | "platform_superadmin"
  | "platform_admin"
  | "tenant_admin"
  | "tenant_owner"
  | "quality"
  | "legal_admin"
  | "pilot_coordinator";

/**
 * Roles that can see test/demo accounts in any environment
 */
const TEST_ACCOUNT_ADMIN_ROLES: Set<TestAccountVisibilityRole> = new Set([
  "platform_superadmin",
  "platform_admin",
  "tenant_admin",
  "tenant_owner",
  "quality",
  "legal_admin",
]);

/**
 * Roles that can see pilot-specific workflows and test accounts
 */
const PILOT_APPROVED_ROLES: Set<TestAccountVisibilityRole> = new Set([
  ...Array.from(TEST_ACCOUNT_ADMIN_ROLES),
  "pilot_coordinator",
]);

/**
 * Roles that CANNOT see test/demo accounts
 */
const RESTRICTED_ROLES = new Set([
  "doctor",
  "nursing",
  "reception",
  "patient_affairs",
  "viewer",
  "guest",
]);

/**
 * Check if user role can see test/demo accounts
 */
export function canSeeTestAccounts(userRole: string | null): boolean {
  if (!userRole) return false;
  return TEST_ACCOUNT_ADMIN_ROLES.has(userRole as TestAccountVisibilityRole);
}

/**
 * Check if user role can access pilot workflows
 */
export function canAccessPilotWorkflows(userRole: string | null): boolean {
  if (!userRole) return false;
  return PILOT_APPROVED_ROLES.has(userRole as TestAccountVisibilityRole);
}

/**
 * Check if user is in a restricted role (should never see test data)
 */
export function isRestrictedRole(userRole: string | null): boolean {
  if (!userRole) return true;
  return RESTRICTED_ROLES.has(userRole.toLowerCase());
}

/**
 * Validate that a user can access a test case
 * Returns error message if access denied, null if allowed
 */
export function validateTestCaseAccess(
  userRole: string | null,
  isTestCase: boolean,
  context?: string
): string | null {
  if (!isTestCase) {
    // Real cases should be accessible to anyone authorized for that case
    return null;
  }

  // This is a test case
  if (!userRole) {
    return `Access denied: No user role provided${context ? ` (${context})` : ""}`;
  }

  if (isRestrictedRole(userRole)) {
    return `Access denied: Role "${userRole}" cannot access test cases${context ? ` (${context})` : ""}`;
  }

  if (!canSeeTestAccounts(userRole)) {
    return `Access denied: Role "${userRole}" not authorized for test cases${context ? ` (${context})` : ""}`;
  }

  return null; // Access granted
}

/**
 * Validate that a user can trigger live SMS for a case
 */
export function validateLiveSmsAccess(
  userRole: string | null,
  isTestCase: boolean,
  isLiveSmsEnabled: boolean,
  context?: string
): string | null {
  if (!userRole) {
    return `Access denied: No user role provided${context ? ` (${context})` : ""}`;
  }

  // Test cases should NEVER send live SMS
  if (isTestCase && !isLiveSmsEnabled) {
    return `SMS blocked: Test case cannot send SMS when SMS mode is "test"${context ? ` (${context})` : ""}`;
  }

  // Restricted roles should never send SMS
  if (isRestrictedRole(userRole)) {
    return `Access denied: Role "${userRole}" cannot send SMS${context ? ` (${context})` : ""}`;
  }

  return null; // Access granted
}

/**
 * Validate that a user can export evidence package
 */
export function validateEvidenceExportAccess(
  userRole: string | null,
  isTestCase: boolean,
  context?: string
): string | null {
  if (!userRole) {
    return `Access denied: No user role provided${context ? ` (${context})` : ""}`;
  }

  // Test cases can only be exported by admins
  if (isTestCase && !canSeeTestAccounts(userRole)) {
    return `Export denied: Role "${userRole}" cannot export test evidence${context ? ` (${context})` : ""}`;
  }

  return null; // Access granted
}

/**
 * Validate that test data can appear in reports
 */
export function validateTestDataInReport(
  isTestCase: boolean,
  allowTestDataInReports: boolean,
  context?: string
): string | null {
  if (isTestCase && !allowTestDataInReports) {
    return `Report generation blocked: Test cases cannot appear in official reports${context ? ` (${context})` : ""}`;
  }

  return null; // Allowed
}

/**
 * Validate that test and real data can be mixed in operations
 */
export function validateDataMixing(
  hasTestData: boolean,
  hasRealData: boolean,
  allowMixing: boolean,
  context?: string
): string | null {
  if (hasTestData && hasRealData && !allowMixing) {
    return `Operation blocked: Cannot mix test and real patient data${context ? ` (${context})` : ""}`;
  }

  return null; // Allowed
}
