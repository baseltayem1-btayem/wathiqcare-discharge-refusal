/**
 * Environment Governance Integration Guide
 *
 * How to integrate the Environment Governance System into WathiqCare app
 */

// ============================================================================
// STEP 1: Add to Root Layout
// ============================================================================

// File: apps/web/src/app/layout.tsx

import { EnvironmentBanner } from "@/components/environment/EnvironmentBanner";
import { EnvironmentBadge } from "@/components/environment/EnvironmentBadge";
import { useEnvironmentConfig } from "@/lib/environment/environment";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const config = useEnvironmentConfig();

  return (
    <html lang="en">
      <body>
        {/* Add environment banner at very top */}
        <EnvironmentBanner hideInProduction={false} />

        {/* Rest of app */}
        <main>{children}</main>

        {/* Optional: Add environment badge in footer/settings */}
        {config.isTestEnvironment && (
          <footer className="border-t p-4 bg-gray-50 text-xs text-gray-600">
            <div className="flex justify-between items-center">
              <div>
                Current Environment: <span className="font-mono font-bold">{config.env}</span>
              </div>
              <div className="flex gap-4">
                <div>SMS: {config.smsMode}</div>
                <div>TrakCare: {config.trakCareMode}</div>
                <div>Data: {config.dataMode}</div>
              </div>
            </div>
          </footer>
        )}
      </body>
    </html>
  );
}

// ============================================================================
// STEP 2: Filter Test Accounts in Account Selection
// ============================================================================

// File: apps/web/src/modules/auth/AccountSelector.tsx

"use client";

import { useAuth } from "@/hooks/useAuth";
import { useEnvironment } from "@/hooks/useEnvironment";
import { useCanSeeTestAccounts } from "@/hooks/useEnvironment";

export function AccountSelector() {
  const { user } = useAuth();
  const canSeeTestAccounts = useCanSeeTestAccounts(user?.role || null);
  const { config } = useEnvironment();

  // Fetch all accounts
  const allAccounts = useGetAccounts(); // Your existing hook

  // Filter accounts based on environment and role
  const visibleAccounts = allAccounts.filter((account) => {
    if (account.isTest && !canSeeTestAccounts) {
      return false; // Hide test accounts from non-admins in production
    }
    return true;
  });

  return (
    <div className="space-y-2">
      {visibleAccounts.map((account) => (
        <div key={account.id} className="flex items-center gap-2 p-2 border rounded">
          {account.isTest && (
            <span className="px-2 py-1 bg-red-100 border border-red-400 text-red-700 text-xs font-bold rounded">
              🚫 TEST
            </span>
          )}
          {account.isDemo && (
            <span className="px-2 py-1 bg-red-100 border border-red-400 text-red-700 text-xs font-bold rounded">
              🚫 DEMO
            </span>
          )}
          <span>{account.name}</span>
          {account.isTest && config.enableTestAccounts && (
            <span className="text-xs text-gray-500 ml-auto">
              حالة اختبارية – ليست لمريض حقيقي
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// STEP 3: Block Test SMS
// ============================================================================

// File: apps/web/src/modules/cases/SendSmsAction.tsx

"use client";

import { useEnvironment } from "@/hooks/useEnvironment";
import { useTestCaseAccessValidator } from "@/hooks/useEnvironment";
import { useAuth } from "@/hooks/useAuth";

export function SendSmsButton({ caseId, isTestCase }: Props) {
  const { config } = useEnvironment();
  const { user } = useAuth();
  const validator = useTestCaseAccessValidator(user?.role || null);

  const handleSendSms = async () => {
    // Check if SMS can be sent
    const error = validateLiveSmsAccess(user?.role || null, isTestCase, config.enableLiveSms);
    if (error) {
      showError(error);
      return;
    }

    // SMS is allowed, proceed with sending
    await sendSms(caseId);
  };

  // Disable SMS button if it's a test case and SMS mode is test
  const isDisabled = isTestCase && config.smsMode === "test";

  return (
    <button
      onClick={handleSendSms}
      disabled={isDisabled}
      title={
        isDisabled
          ? "SMS blocked: This is a test case in test SMS mode"
          : undefined
      }
    >
      {isDisabled ? "SMS Disabled (Test Case)" : "Send SMS"}
    </button>
  );
}

// ============================================================================
// STEP 4: Exclude Test Data from Reports
// ============================================================================

// File: apps/web/src/modules/reports/ReportGenerator.tsx

"use client";

import { useEnvironment } from "@/hooks/useEnvironment";
import { useDataValidator } from "@/hooks/useEnvironment";

export function GenerateReport({ caseIds }: Props) {
  const { config } = useEnvironment();
  const dataValidator = useDataValidator();

  const handleGenerateReport = async () => {
    // Check if test data is in the report
    const hasTestCases = caseIds.some((id) => isCaseTest(id));
    const canIncludeTest = dataValidator.canIncludeInReport(hasTestCases);

    if (!canIncludeTest) {
      showError("Test cases cannot be included in official reports");
      return;
    }

    // Generate report, excluding test cases if needed
    const reportData = caseIds
      .filter((id) => {
        if (isCaseTest(id) && !config.allowTestDataInReports) {
          return false; // Filter out test cases
        }
        return true;
      });

    await generateReport(reportData);
  };

  return (
    <button onClick={handleGenerateReport}>
      Generate Report
    </button>
  );
}

// ============================================================================
// STEP 5: Audit Logging
// ============================================================================

// File: apps/web/src/modules/cases/CaseAccess.tsx

"use client";

import { auditTestAccountAccess } from "@/lib/environment/audit-logging";
import { useAuth } from "@/hooks/useAuth";
import { useEnvironment } from "@/hooks/useEnvironment";

export function CaseDetails({ caseId }: Props) {
  const { user } = useAuth();
  const { config } = useEnvironment();
  const case = useGetCase(caseId);

  // When accessing test case, log it
  React.useEffect(() => {
    if (case?.isTest) {
      auditTestAccountAccess(
        user?.id || "",
        user?.role || "",
        caseId,
        true, // allowed
        config.env,
        { action: "viewed_test_case" }
      );
    }
  }, [caseId, case?.isTest, user, config.env]);

  return <div>{/* Case details */}</div>;
}

// ============================================================================
// STEP 6: Environment Configuration in .env files
// ============================================================================

// File: .env.production
APP_ENV=production
ENABLE_LIVE_SMS=true
ENABLE_LIVE_TRAKCARE=true
ENABLE_TEST_ACCOUNTS=false
ENABLE_DEMO_MODE=false

// File: .env.pilot
APP_ENV=pilot
ENABLE_LIVE_SMS=false
ENABLE_LIVE_TRAKCARE=false
ENABLE_TEST_ACCOUNTS=true
ENABLE_DEMO_MODE=false

// File: .env.development
APP_ENV=development
ENABLE_LIVE_SMS=false
ENABLE_LIVE_TRAKCARE=false
ENABLE_TEST_ACCOUNTS=true
ENABLE_DEMO_MODE=false

// File: .env.demo
APP_ENV=demo
ENABLE_LIVE_SMS=false
ENABLE_LIVE_TRAKCARE=false
ENABLE_TEST_ACCOUNTS=true
ENABLE_DEMO_MODE=true

// ============================================================================
// STEP 7: Deployment Configuration
// ============================================================================

// Vercel Production Environment Variables:
// Settings > Environment Variables (for https://wathiqcare.online)

APP_ENV: production
ENABLE_LIVE_SMS: true
ENABLE_LIVE_TRAKCARE: true
ENABLE_TEST_ACCOUNTS: false
ENABLE_DEMO_MODE: false

// Vercel Pilot Environment Variables:
// (Different deployment or branch)

APP_ENV: pilot
ENABLE_LIVE_SMS: false
ENABLE_LIVE_TRAKCARE: false
ENABLE_TEST_ACCOUNTS: true
ENABLE_DEMO_MODE: false

// ============================================================================
// STEP 8: Run Tests
// ============================================================================

// Command:
// npm run test -- environment.test.ts --coverage

// Expected output:
// PASS environment.test.ts
//   ✓ Environment Detection (6 tests)
//   ✓ SMS Mode Configuration (4 tests)
//   ✓ TrakCare Mode Configuration (3 tests)
//   ✓ Banner Display Configuration (4 tests)
//   ✓ Test Account Access Control (4 tests)
//   ✓ Pilot Workflow Access (3 tests)
//   ✓ Restricted Role Detection (4 tests)
//   ✓ Test Case Access Validation (4 tests)
//   ✓ Live SMS Access Validation (3 tests)
//   ✓ Evidence Export Validation (3 tests)
//   ✓ Test Data in Reports (3 tests)
//   ✓ Data Mixing (4 tests)
//   ✓ Production Safety Checks (5 tests)
//   ✓ Environment Assertions (2 tests)

// ============================================================================
// IMPLEMENTATION CHECKLIST
// ============================================================================

// [ ] Create environment detection utilities
//     ✓ /lib/environment/environment.ts
//     ✓ /lib/environment/test-account-access.ts
//     ✓ /lib/environment/audit-logging.ts

// [ ] Create React components
//     ✓ /components/environment/EnvironmentBanner.tsx
//     ✓ /components/environment/EnvironmentBadge.tsx

// [ ] Create hooks
//     ✓ /hooks/useEnvironment.ts

// [ ] Create tests
//     ✓ /lib/environment/environment.test.ts

// [ ] Create documentation
//     ✓ /ENVIRONMENT_GOVERNANCE.md

// [ ] Integrate into layout
//     [ ] Add EnvironmentBanner to root layout
//     [ ] Add EnvironmentBadge to settings

// [ ] Integrate into features
//     [ ] Account selector filters test accounts
//     [ ] SMS sending checks environment
//     [ ] Reports exclude test data
//     [ ] Audit logging captures access

// [ ] Configure environments
//     [ ] .env.production
//     [ ] .env.pilot
//     [ ] .env.development
//     [ ] .env.demo

// [ ] Verify all tests pass
//     [ ] npm run test -- environment.test.ts
//     [ ] npm run build

// [ ] Manual testing
//     [ ] Production: physician cannot see test accounts
//     [ ] Production: admin CAN see test accounts
//     [ ] Pilot: banner displays blue warning
//     [ ] Demo: banner displays red danger
//     [ ] SMS blocked for test cases in test mode
//     [ ] Test data excluded from reports

// [ ] Deploy to Vercel
//     [ ] Set environment variables
//     [ ] Deploy production
//     [ ] Verify banner
//     [ ] Verify access controls
//     [ ] Test as different roles

// [ ] Documentation & Training
//     [ ] Share ENVIRONMENT_GOVERNANCE.md with team
//     [ ] Train admins on test account visibility
//     [ ] Train physicians on safety controls
//     [ ] Document for audit/compliance

// ============================================================================

export const ENVIRONMENT_INTEGRATION_COMPLETE = true;
