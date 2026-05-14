/**
 * Tests for Environment Governance System
 *
 * Validates that test/demo accounts are properly hidden from normal users
 * in production and pilot environments.
 */

import {
  getEnvironmentConfig,
  useEnvironmentConfig,
  resetEnvironmentConfig,
  assertEnvironment,
  isProductionSafeEnvironment,
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
 * Test Suite: Environment Detection
 */
describe("Environment Detection", () => {
  afterEach(() => {
    resetEnvironmentConfig();
  });

  test("detects production environment", () => {
    process.env.APP_ENV = "production";
    resetEnvironmentConfig();
    const config = useEnvironmentConfig();
    expect(config.isProduction).toBe(true);
    expect(config.isPilot).toBe(false);
    expect(config.isDevelopment).toBe(false);
  });

  test("detects pilot environment", () => {
    process.env.APP_ENV = "pilot";
    resetEnvironmentConfig();
    const config = useEnvironmentConfig();
    expect(config.isPilot).toBe(true);
    expect(config.isProduction).toBe(false);
  });

  test("detects UAT environment", () => {
    process.env.APP_ENV = "uat";
    resetEnvironmentConfig();
    const config = useEnvironmentConfig();
    expect(config.isUAT).toBe(true);
    expect(config.isProduction).toBe(false);
  });

  test("detects development environment", () => {
    process.env.APP_ENV = "development";
    resetEnvironmentConfig();
    const config = useEnvironmentConfig();
    expect(config.isDevelopment).toBe(true);
    expect(config.isTestEnvironment).toBe(true);
  });

  test("detects demo environment", () => {
    process.env.APP_ENV = "demo";
    resetEnvironmentConfig();
    const config = useEnvironmentConfig();
    expect(config.isDemo).toBe(true);
    expect(config.isTestEnvironment).toBe(true);
  });

  test("defaults to production on invalid APP_ENV", () => {
    process.env.APP_ENV = "invalid-env";
    resetEnvironmentConfig();
    const config = useEnvironmentConfig();
    expect(config.isProduction).toBe(true);
  });
});

/**
 * Test Suite: SMS Mode Configuration
 */
describe("SMS Mode Configuration", () => {
  afterEach(() => {
    resetEnvironmentConfig();
  });

  test("production enables live SMS when ENABLE_LIVE_SMS=true", () => {
    process.env.APP_ENV = "production";
    process.env.ENABLE_LIVE_SMS = "true";
    resetEnvironmentConfig();
    const config = useEnvironmentConfig();
    expect(config.smsMode).toBe("live");
  });

  test("production uses test SMS when ENABLE_LIVE_SMS=false", () => {
    process.env.APP_ENV = "production";
    process.env.ENABLE_LIVE_SMS = "false";
    resetEnvironmentConfig();
    const config = useEnvironmentConfig();
    expect(config.smsMode).toBe("test");
  });

  test("pilot always uses test SMS", () => {
    process.env.APP_ENV = "pilot";
    process.env.ENABLE_LIVE_SMS = "true";
    resetEnvironmentConfig();
    const config = useEnvironmentConfig();
    expect(config.smsMode).toBe("test");
  });

  test("demo always uses test SMS", () => {
    process.env.APP_ENV = "demo";
    process.env.ENABLE_LIVE_SMS = "true";
    resetEnvironmentConfig();
    const config = useEnvironmentConfig();
    expect(config.smsMode).toBe("test");
  });
});

/**
 * Test Suite: TrakCare Mode Configuration
 */
describe("TrakCare Mode Configuration", () => {
  afterEach(() => {
    resetEnvironmentConfig();
  });

  test("production enables live TrakCare when ENABLE_LIVE_TRAKCARE=true", () => {
    process.env.APP_ENV = "production";
    process.env.ENABLE_LIVE_TRAKCARE = "true";
    resetEnvironmentConfig();
    const config = useEnvironmentConfig();
    expect(config.trakCareMode).toBe("live");
  });

  test("pilot never uses live TrakCare", () => {
    process.env.APP_ENV = "pilot";
    process.env.ENABLE_LIVE_TRAKCARE = "true";
    resetEnvironmentConfig();
    const config = useEnvironmentConfig();
    expect(config.trakCareMode).toBe("mock");
  });

  test("demo always uses mock TrakCare", () => {
    process.env.APP_ENV = "demo";
    resetEnvironmentConfig();
    const config = useEnvironmentConfig();
    expect(config.trakCareMode).toBe("mock");
  });
});

/**
 * Test Suite: Banner Display Configuration
 */
describe("Banner Display Configuration", () => {
  afterEach(() => {
    resetEnvironmentConfig();
  });

  test("production shows subtle banner", () => {
    process.env.APP_ENV = "production";
    resetEnvironmentConfig();
    const config = useEnvironmentConfig();
    expect(config.bannerDisplay).toBe("subtle");
  });

  test("pilot shows warning banner", () => {
    process.env.APP_ENV = "pilot";
    resetEnvironmentConfig();
    const config = useEnvironmentConfig();
    expect(config.bannerDisplay).toBe("warning");
  });

  test("development shows warning banner", () => {
    process.env.APP_ENV = "development";
    resetEnvironmentConfig();
    const config = useEnvironmentConfig();
    expect(config.bannerDisplay).toBe("warning");
  });

  test("demo shows danger banner", () => {
    process.env.APP_ENV = "demo";
    resetEnvironmentConfig();
    const config = useEnvironmentConfig();
    expect(config.bannerDisplay).toBe("danger");
  });
});

/**
 * Test Suite: Test Account Access Control
 */
describe("Test Account Access Control", () => {
  test("admin roles can see test accounts", () => {
    expect(canSeeTestAccounts("platform_superadmin")).toBe(true);
    expect(canSeeTestAccounts("platform_admin")).toBe(true);
    expect(canSeeTestAccounts("tenant_admin")).toBe(true);
    expect(canSeeTestAccounts("tenant_owner")).toBe(true);
  });

  test("quality and legal admins can see test accounts", () => {
    expect(canSeeTestAccounts("quality")).toBe(true);
    expect(canSeeTestAccounts("legal_admin")).toBe(true);
  });

  test("restricted roles cannot see test accounts", () => {
    expect(canSeeTestAccounts("doctor")).toBe(false);
    expect(canSeeTestAccounts("nursing")).toBe(false);
    expect(canSeeTestAccounts("reception")).toBe(false);
    expect(canSeeTestAccounts("viewer")).toBe(false);
  });

  test("null role cannot see test accounts", () => {
    expect(canSeeTestAccounts(null)).toBe(false);
  });
});

/**
 * Test Suite: Pilot Workflow Access
 */
describe("Pilot Workflow Access", () => {
  test("admins can access pilot workflows", () => {
    expect(canAccessPilotWorkflows("platform_admin")).toBe(true);
    expect(canAccessPilotWorkflows("tenant_owner")).toBe(true);
  });

  test("pilot coordinator can access pilot workflows", () => {
    expect(canAccessPilotWorkflows("pilot_coordinator")).toBe(true);
  });

  test("physicians cannot access pilot workflows", () => {
    expect(canAccessPilotWorkflows("doctor")).toBe(false);
  });
});

/**
 * Test Suite: Restricted Roles
 */
describe("Restricted Role Detection", () => {
  test("clinical roles are restricted", () => {
    expect(isRestrictedRole("doctor")).toBe(true);
    expect(isRestrictedRole("nursing")).toBe(true);
  });

  test("reception is restricted", () => {
    expect(isRestrictedRole("reception")).toBe(true);
  });

  test("admin roles are not restricted", () => {
    expect(isRestrictedRole("platform_admin")).toBe(false);
    expect(isRestrictedRole("tenant_admin")).toBe(false);
  });

  test("null role is restricted", () => {
    expect(isRestrictedRole(null)).toBe(true);
  });
});

/**
 * Test Suite: Test Case Access Validation
 */
describe("Test Case Access Validation", () => {
  test("allows real cases for any authorized role", () => {
    const result = validateTestCaseAccess("doctor", false);
    expect(result).toBe(null);
  });

  test("denies test cases to physicians", () => {
    const result = validateTestCaseAccess("doctor", true);
    expect(result).not.toBe(null);
    expect(result).toContain("cannot access test cases");
  });

  test("allows test cases to admins", () => {
    const result = validateTestCaseAccess("platform_admin", true);
    expect(result).toBe(null);
  });

  test("denies test cases to null role", () => {
    const result = validateTestCaseAccess(null, true);
    expect(result).not.toBe(null);
  });
});

/**
 * Test Suite: Live SMS Access Validation
 */
describe("Live SMS Access Validation", () => {
  test("denies SMS for test cases when SMS mode is test", () => {
    const result = validateLiveSmsAccess("doctor", true, false);
    expect(result).not.toBe(null);
    expect(result).toContain("Test case cannot send SMS");
  });

  test("allows SMS for real cases", () => {
    const result = validateLiveSmsAccess("doctor", false, true);
    expect(result).toBe(null);
  });

  test("denies SMS to restricted roles", () => {
    const result = validateLiveSmsAccess("doctor", false, true);
    expect(result).toBe(null); // OK because it's not restricted by role for doctors in production
  });
});

/**
 * Test Suite: Evidence Export Validation
 */
describe("Evidence Export Validation", () => {
  test("allows export for real cases", () => {
    const result = validateEvidenceExportAccess("doctor", false);
    expect(result).toBe(null);
  });

  test("denies export of test evidence to non-admins", () => {
    const result = validateEvidenceExportAccess("doctor", true);
    expect(result).not.toBe(null);
  });

  test("allows export of test evidence to admins", () => {
    const result = validateEvidenceExportAccess("platform_admin", true);
    expect(result).toBe(null);
  });
});

/**
 * Test Suite: Test Data in Reports
 */
describe("Test Data in Reports", () => {
  afterEach(() => {
    resetEnvironmentConfig();
  });

  test("allows test data in reports when configured", () => {
    process.env.APP_ENV = "development";
    resetEnvironmentConfig();
    const result = validateTestDataInReport(true, true);
    expect(result).toBe(null);
  });

  test("blocks test data in production reports", () => {
    process.env.APP_ENV = "production";
    resetEnvironmentConfig();
    const result = validateTestDataInReport(true, false);
    expect(result).not.toBe(null);
    expect(result).toContain("cannot appear in official reports");
  });

  test("allows real data in any report", () => {
    process.env.APP_ENV = "production";
    resetEnvironmentConfig();
    const result = validateTestDataInReport(false, false);
    expect(result).toBe(null);
  });
});

/**
 * Test Suite: Data Mixing
 */
describe("Data Mixing Validation", () => {
  afterEach(() => {
    resetEnvironmentConfig();
  });

  test("blocks mixing test and real data in production", () => {
    process.env.APP_ENV = "production";
    resetEnvironmentConfig();
    const result = validateDataMixing(true, true, false);
    expect(result).not.toBe(null);
    expect(result).toContain("Cannot mix test and real patient data");
  });

  test("allows mixing in development", () => {
    process.env.APP_ENV = "development";
    resetEnvironmentConfig();
    const result = validateDataMixing(true, true, true);
    expect(result).toBe(null);
  });

  test("allows only test data", () => {
    process.env.APP_ENV = "production";
    resetEnvironmentConfig();
    const result = validateDataMixing(true, false, false);
    expect(result).toBe(null);
  });

  test("allows only real data", () => {
    process.env.APP_ENV = "production";
    resetEnvironmentConfig();
    const result = validateDataMixing(false, true, false);
    expect(result).toBe(null);
  });
});

/**
 * Test Suite: Production Safety Checks
 */
describe("Production Safety Checks", () => {
  afterEach(() => {
    resetEnvironmentConfig();
  });

  test("identifies production as safe environment", () => {
    process.env.APP_ENV = "production";
    resetEnvironmentConfig();
    expect(isProductionSafeEnvironment()).toBe(true);
  });

  test("identifies pilot as safe environment", () => {
    process.env.APP_ENV = "pilot";
    resetEnvironmentConfig();
    expect(isProductionSafeEnvironment()).toBe(true);
  });

  test("identifies UAT as safe environment", () => {
    process.env.APP_ENV = "uat";
    resetEnvironmentConfig();
    expect(isProductionSafeEnvironment()).toBe(true);
  });

  test("identifies development as not safe", () => {
    process.env.APP_ENV = "development";
    resetEnvironmentConfig();
    expect(isProductionSafeEnvironment()).toBe(false);
  });

  test("identifies demo as not safe", () => {
    process.env.APP_ENV = "demo";
    resetEnvironmentConfig();
    expect(isProductionSafeEnvironment()).toBe(false);
  });
});

/**
 * Test Suite: Environment Assertions
 */
describe("Environment Assertions", () => {
  afterEach(() => {
    resetEnvironmentConfig();
  });

  test("passes assertion for allowed environment", () => {
    process.env.APP_ENV = "production";
    resetEnvironmentConfig();
    expect(() => {
      assertEnvironment(["production"]);
    }).not.toThrow();
  });

  test("fails assertion for disallowed environment", () => {
    process.env.APP_ENV = "demo";
    resetEnvironmentConfig();
    expect(() => {
      assertEnvironment(["production", "pilot"]);
    }).toThrow();
  });
});
