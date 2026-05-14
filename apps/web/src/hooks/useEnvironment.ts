"use client";

/**
 * useEnvironment Hook
 *
 * Provides environment configuration and helpers for components
 */

import { useMemo } from "react";
import {
  useEnvironmentConfig,
  AppEnvironment,
} from "@/lib/environment/environment";
import {
  canSeeTestAccounts,
  canAccessPilotWorkflows,
  isRestrictedRole,
  validateTestCaseAccess,
  validateLiveSmsAccess,
  validateEvidenceExportAccess,
  validateTestDataInReport,
  validateDataMixing,
} from "@/lib/environment/test-account-access";

/**
 * Hook providing environment utilities for React components
 */
export function useEnvironment() {
  const config = useEnvironmentConfig();

  return useMemo(
    () => ({
      // Config
      config,

      // Environment checks
      isProduction: config.isProduction,
      isPilot: config.isPilot,
      isUAT: config.isUAT,
      isDevelopment: config.isDevelopment,
      isDemo: config.isDemo,
      isTestEnvironment: config.isTestEnvironment,

      // Feature modes
      smsMode: config.smsMode,
      trakCareMode: config.trakCareMode,
      dataMode: config.dataMode,

      // Flags
      enableTestAccounts: config.enableTestAccounts,
      enableDemoMode: config.enableDemoMode,
      enableLiveSms: config.enableLiveSms,
      enableLiveTrakCare: config.enableLiveTrakCare,

      // Access control helpers (these should be wrapped in components that have userRole)
      canSeeTestAccounts,
      canAccessPilotWorkflows,
      isRestrictedRole,

      // Validation helpers
      validateTestCaseAccess,
      validateLiveSmsAccess,
      validateEvidenceExportAccess,
      validateTestDataInReport,
      validateDataMixing,

      // UI helpers
      shouldShowTestDataWarning: () =>
        !config.isProduction && config.enableTestAccounts,

      shouldHideTestAccounts: (userRole: string | null) =>
        !canSeeTestAccounts(userRole),

      shouldBlockLiveSms: (isTestCase: boolean) =>
        isTestCase && config.smsMode === "test",

      shouldBlockTestDataInReport: (isTestCase: boolean) =>
        isTestCase && !config.allowTestDataInReports,
    }),
    [config]
  );
}

/**
 * Hook specifically for checking if current user can see test accounts
 * Must be used in components that have access to user role
 */
export function useCanSeeTestAccounts(userRole: string | null) {
  return useMemo(() => canSeeTestAccounts(userRole), [userRole]);
}

/**
 * Hook specifically for checking if current user can access pilot workflows
 */
export function useCanAccessPilot(userRole: string | null) {
  return useMemo(() => canAccessPilotWorkflows(userRole), [userRole]);
}

/**
 * Hook for validating test case access with current environment and role
 */
export function useTestCaseAccessValidator(userRole: string | null) {
  const config = useEnvironmentConfig();

  return useMemo(
    () => ({
      canAccess: (isTestCase: boolean, context?: string) => {
        const error = validateTestCaseAccess(userRole, isTestCase, context);
        return error === null;
      },
      getError: (isTestCase: boolean, context?: string) => {
        return validateTestCaseAccess(userRole, isTestCase, context);
      },
      canSendSms: (isTestCase: boolean, context?: string) => {
        const error = validateLiveSmsAccess(
          userRole,
          isTestCase,
          config.enableLiveSms,
          context
        );
        return error === null;
      },
      canExportEvidence: (isTestCase: boolean, context?: string) => {
        const error = validateEvidenceExportAccess(userRole, isTestCase, context);
        return error === null;
      },
    }),
    [userRole, config.enableLiveSms]
  );
}

/**
 * Hook for validating data operations
 */
export function useDataValidator() {
  const config = useEnvironmentConfig();

  return useMemo(
    () => ({
      canIncludeInReport: (isTestCase: boolean, context?: string) => {
        const error = validateTestDataInReport(
          isTestCase,
          config.allowTestDataInReports,
          context
        );
        return error === null;
      },
      canMixData: (
        hasTestData: boolean,
        hasRealData: boolean,
        context?: string
      ) => {
        const error = validateDataMixing(
          hasTestData,
          hasRealData,
          config.allowMixingTestAndRealData,
          context
        );
        return error === null;
      },
    }),
    [config]
  );
}
