# Environment Governance System — WathiqCare

**Document Version:** 1.0  
**Last Updated:** May 12, 2026  
**Status:** ✅ ACTIVE  

---

## EXECUTIVE SUMMARY

The Environment Governance System provides strict separation between Production, Pilot/UAT, Development, and Demo/Test environments. It prevents user confusion and data contamination through:

1. **Visual Banners** — Clear environment identification at all times
2. **Role-Based Access** — Test accounts only visible to authorized admins
3. **Mode Configuration** — Control over SMS, TrakCare, and data modes
4. **Data Separation** — Clear tagging and isolation of test/demo data
5. **Safety Controls** — Blocking of real operations on test data
6. **Audit Logging** — Complete tracking of environment-sensitive operations

---

## TABLE OF CONTENTS

1. [Environment Definitions](#1-environment-definitions)
2. [Environment-Specific Rules](#2-environment-specific-rules)
3. [Role-Based Access Control](#3-role-based-access-control)
4. [Test/Demo Account Visibility](#4-testdemo-account-visibility)
5. [Data Mode Configuration](#5-data-mode-configuration)
6. [Safety Controls](#6-safety-controls)
7. [Audit Logging](#7-audit-logging)
8. [Configuration & Deployment](#8-configuration--deployment)
9. [UI Components](#9-ui-components)
10. [Acceptance Tests](#10-acceptance-tests)

---

## 1. ENVIRONMENT DEFINITIONS

### 1.1 Production

**Purpose:** Real patient data, live operations, enterprise-wide deployment

**Characteristics:**
- SMS mode: Live (if `ENABLE_LIVE_SMS=true`) or Test (if false)
- TrakCare mode: Live (if `ENABLE_LIVE_TRAKCARE=true`) or Test (if false)
- Data mode: Live
- Test accounts: Hidden from all non-admin users
- Test data: Cannot appear in official reports
- Data mixing: Strictly prevented
- Banner: Subtle "PRODUCTION" badge
- User groups: All authorized clinical staff

**Safety Locks:**
```
IF APP_ENV=production:
  - Hide test accounts from doctors, nurses, reception
  - Block test SMS unless ENABLE_LIVE_SMS=true
  - Prevent test records from official reports
  - Block mixing test + real data
  - Lock data mode to "live"
  - Require explicit admin action to use test features
```

### 1.2 Pilot / UAT

**Purpose:** Controlled testing with real users, pre-enterprise rollout

**Characteristics:**
- SMS mode: Always "test" (never live to avoid patient messages)
- TrakCare mode: Always "mock" (never live system)
- Data mode: Test
- Test accounts: Visible to pilot-approved roles
- Test data: Excluded from official reports
- Data mixing: Strictly prevented
- Banner: Blue "PILOT ENVIRONMENT" or "UAT ENVIRONMENT"
- User groups: Pilot-approved physicians, nurses, admins

**Safety Locks:**
```
IF APP_ENV=pilot OR APP_ENV=uat:
  - SMS always "test" regardless of ENABLE_LIVE_SMS
  - TrakCare always "mock" regardless of ENABLE_LIVE_TRAKCARE
  - Block test data from official reports
  - Show blue warning banner continuously
  - Restrict test account access to pilot_coordinator + admins
  - Audit all access to test accounts
```

### 1.3 Development

**Purpose:** Developer testing, feature development, debugging

**Characteristics:**
- SMS mode: Always "test"
- TrakCare mode: Always "mock"
- Data mode: Test
- Test accounts: Visible to all developers
- Test data: Can appear in reports (for testing)
- Data mixing: Allowed (for testing)
- Banner: Yellow "DEVELOPMENT" warning
- User groups: Development team only

**Safety Locks:**
```
IF APP_ENV=development:
  - Show yellow warning banner continuously
  - Allow test data in reports (for dev testing)
  - Allow mixing test + real data (for dev testing)
  - SMS always "test"
  - TrakCare always "mock"
  - Data always "test"
```

### 1.4 Demo / Test

**Purpose:** Sales demos, training, testing without real consequences

**Characteristics:**
- SMS mode: Always "test"
- TrakCare mode: Always "mock"
- Data mode: Test
- Test accounts: Visible to all users
- Test data: Can appear in reports
- Data mixing: Allowed
- Banner: Red "DEMO ONLY – NOT REAL PATIENT DATA"
- User groups: All users (with test data only)

**Safety Locks:**
```
IF APP_ENV=demo:
  - Show PROMINENT red danger banner
  - Mark all data with "NOT A REAL PATIENT" tag
  - SMS always "test"
  - TrakCare always "mock"
  - Data always "test"
  - Include disclaimer: "This is demo data only. Do not use for real patient care."
```

---

## 2. ENVIRONMENT-SPECIFIC RULES

| Rule | Production | Pilot/UAT | Development | Demo |
|------|-----------|-----------|-------------|------|
| **Live SMS** | If enabled | Never | Never | Never |
| **Live TrakCare** | If enabled | Never | Never | Never |
| **Live Data** | Yes | No | No | No |
| **Test Accounts Visible** | Admin only | Pilot admins | Developers | All |
| **Test Data in Reports** | Never | Never | Yes | Yes |
| **Data Mixing** | Blocked | Blocked | Allowed | Allowed |
| **Banner Style** | Subtle | Blue warning | Yellow warning | Red danger |
| **Audit Logging** | Yes | Yes | Yes | Yes |

---

## 3. ROLE-BASED ACCESS CONTROL

### 3.1 Who Can See Test/Demo Accounts

**Allowed Roles:**
- `platform_superadmin` — Complete system access
- `platform_admin` — System administration
- `tenant_admin` — Organization administration
- `tenant_owner` — Organization owner
- `quality` — Quality & compliance officers
- `legal_admin` — Legal department
- `pilot_coordinator` — Pilot program coordinators

**Restricted Roles (Cannot See Test/Demo):**
- `doctor` — Clinical physicians
- `nursing` — Nursing staff
- `reception` — Front desk
- `patient_affairs` — Patient relations
- `viewer` — Read-only viewers
- `guest` — Guest access

### 3.2 Who Can Trigger Live SMS

**Allowed:**
- `platform_admin` (with `ENABLE_LIVE_SMS=true`)
- `tenant_admin` (with `ENABLE_LIVE_SMS=true`)
- Specific medical staff (in production only)

**Denied:**
- All test/demo cases
- Demo mode
- UAT/Pilot environments
- Any restricted role

### 3.3 Who Can Export Evidence

**Allowed:**
- All admins
- All quality/legal staff
- Authorized physicians (for their own cases only)

**Denied:**
- Export of test cases to non-admins
- Export of demo cases outside demo environment

### 3.4 Who Can Access Pilot Workflows

**Allowed:**
- `platform_superadmin`
- `platform_admin`
- `tenant_admin`
- `tenant_owner`
- `pilot_coordinator`
- Pilot-approved users (must be explicitly marked)

**Denied:**
- Non-pilot physicians
- Nurses
- All non-approved staff

---

## 4. TEST/DEMO ACCOUNT VISIBILITY

### 4.1 Rendering Rules

**In Production for Non-Admin:**
```javascript
// Doctors, nurses, reception should NEVER see:
- Demo accounts in account selection
- Test cases in case lists
- Demo records in reports
- Test data in dashboards

// Admins ONLY see with special label:
⚠️ [TEST] Account Name
DEMO ONLY – NOT REAL PATIENT
```

**In Pilot/UAT for All:**
```javascript
// Pilot-approved users see:
🔷 [PILOT] Account Name
⚠️ PILOT ENVIRONMENT - TEST DATA ONLY

// Non-pilot users see:
Nothing (hidden from view)
```

**In Development for All:**
```javascript
// Everyone sees:
[DEV] Test Account
⚠️ DEVELOPMENT – TEST DATA ONLY
```

**In Demo for All:**
```javascript
// Everyone sees:
🚫 [DEMO] Account Name
NOT REAL PATIENT DATA
```

### 4.2 Data Tagging

All test/demo records must display:

**English:**
```
TEST CASE – NOT A REAL PATIENT
```

**Arabic:**
```
حالة اختبارية – ليست لمريض حقيقي
```

**Visual Indicators:**
- Icon: 🚫 (red prohibition sign)
- Background: Light red (#FFE0E0)
- Border: Red dashed
- Label: Bold, uppercase

### 4.3 UI Component Requirements

All test cases must display badges:

```tsx
// Example component
<TestCaseBadge caseId="case123">
  <span className="inline-block px-2 py-1 rounded bg-red-100 border-2 border-red-400 text-red-700">
    🚫 TEST CASE — NOT REAL PATIENT
  </span>
</TestCaseBadge>
```

---

## 5. DATA MODE CONFIGURATION

### 5.1 SMS Mode

**Configuration Priority:**
```
IF APP_ENV=production:
  smsMode = ENABLE_LIVE_SMS ? "live" : "test"
ELSE IF APP_ENV=pilot OR APP_ENV=uat:
  smsMode = "test" (always)
ELSE:
  smsMode = "test" (always)
```

**Behavior by Mode:**

**Live Mode:**
- Send actual SMS to patient phone
- Use Taqnyat production credentials
- Generate real OTP codes
- Charge SMS costs to account
- Log all messages for compliance

**Test Mode:**
- Simulate SMS delivery
- Return mock OTP codes
- Don't charge SMS costs
- Audit log: "SMS sent in test mode"
- Display: "[TEST] SMS will be sent to +966-50-XXXX-XXXX"

### 5.2 TrakCare Mode

**Configuration Priority:**
```
IF APP_ENV=production:
  trakCareMode = ENABLE_LIVE_TRAKCARE ? "live" : "mock"
ELSE IF APP_ENV=pilot OR APP_ENV=uat:
  trakCareMode = "mock" (always, pilot should not hit live systems)
ELSE:
  trakCareMode = "mock" (always)
```

**Behavior by Mode:**

**Live Mode:**
- Query actual TrakCare database
- Retrieve real patient records
- Use production credentials
- Log lookups for compliance

**Mock Mode:**
- Return simulated patient data
- Display: "[MOCK] Example patient data"
- No external API calls
- Audit log: "TrakCare queried in mock mode"

### 5.3 Data Mode

**Configuration Priority:**
```
IF APP_ENV=production:
  dataMode = "live"
ELSE IF APP_ENV=pilot OR APP_ENV=uat:
  dataMode = "test"
ELSE:
  dataMode = "test"
```

**Behavior by Mode:**

**Live Mode:**
- Real patient records
- Official reporting
- Compliance use
- Long-term retention

**Test Mode:**
- Test/demo records only
- Testing and development
- Can be deleted
- Demo destruction after pilot

---

## 6. SAFETY CONTROLS

### 6.1 Production Safety Controls

**If `APP_ENV=production`:**

```typescript
// Detect test cases
if (isTestCase && !canSeeTestAccounts(userRole)) {
  throw new Error("Access denied: Test case not visible to this role");
}

// Block test SMS
if (isTestCase && !ENABLE_LIVE_SMS) {
  throw new Error("SMS blocked: Test case cannot send SMS in test mode");
}

// Block test data in reports
if (hasTestData && !ALLOW_TEST_DATA_IN_REPORTS) {
  throw new Error("Report blocked: Cannot include test data in official reports");
}

// Block data mixing
if (hasTestData && hasRealData && !ALLOW_MIXING) {
  throw new Error("Operation blocked: Cannot mix test and real patient data");
}

// Hide test dashboards
if (isTestDashboard) {
  return notFound();
}
```

### 6.2 Pilot/UAT Safety Controls

```typescript
// Always block live SMS
if (isTestCase || APP_ENV === "pilot") {
  ENABLE_LIVE_SMS = false;
}

// Always use mock TrakCare
if (APP_ENV === "pilot" || APP_ENV === "uat") {
  ENABLE_LIVE_TRAKCARE = false;
  trakCareMode = "mock";
}

// Block mixing
if (hasTestData && hasRealData && !ALLOW_MIXING) {
  throw new Error("Pilot mixing blocked");
}

// Show warning banner
if (APP_ENV === "pilot" || APP_ENV === "uat") {
  displayBanner("⚠️ PILOT ENVIRONMENT - NOT FOR PRODUCTION USE");
}
```

### 6.3 Demo Safety Controls

```typescript
// Force demo mode
ENABLE_DEMO_MODE = true;

// Tag all data
if (APP_ENV === "demo") {
  addDataTag("DEMO ONLY – NOT REAL PATIENT");
}

// Show red danger banner
displayBanner(
  "🚫 DEMO ONLY – NOT REAL PATIENT DATA",
  { style: "danger", color: "red" }
);

// Block any TrakCare/SMS to real systems
ENABLE_LIVE_TRAKCARE = false;
ENABLE_LIVE_SMS = false;
```

---

## 7. AUDIT LOGGING

### 7.1 Events to Log

**All environment-sensitive operations must be audited:**

| Event | Log Level | Details |
|-------|-----------|---------|
| Test account access | INFO | userId, role, caseId, timestamp |
| Test case created | INFO | userId, testCaseId, environment |
| SMS sent (test) | INFO | caseId, mode, recipient, timestamp |
| SMS attempt blocked | WARNING | userId, reason, caseId |
| Evidence exported | INFO | userId, caseId, isTestCase |
| Export denied | WARNING | userId, role, reason |
| Data mixing attempted | WARNING | testCaseCount, realCaseCount, action |
| Report generation | INFO | reportType, testCaseCount, dataMode |
| Test data in report | WARNING | reportId, testCaseCount (if not allowed) |
| Access denied | WARNING | userId, reason, context |
| Mode changed | INFO | oldMode, newMode, actor |

### 7.2 Audit Log Structure

```json
{
  "eventId": "evt_123456789",
  "eventType": "test_account_access",
  "timestamp": "2026-05-12T16:45:30Z",
  "userId": "user_123",
  "userRole": "doctor",
  "environment": "production",
  "severity": "warning",
  "caseId": "case_456",
  "testCaseId": "test_789",
  "action": "access_denied",
  "reason": "Role 'doctor' cannot access test cases",
  "ipAddress": "192.168.1.100",
  "userAgent": "Mozilla/5.0..."
}
```

### 7.3 Audit Trail Retention

- **Hot Storage (active):** 90 days in PostgreSQL
- **Warm Storage:** 2 years in AWS S3
- **Cold Storage:** 7 years in AWS Glacier
- **Compliance:** Full retention for legal holds

---

## 8. CONFIGURATION & DEPLOYMENT

### 8.1 Environment Variables

**Required:**

```bash
# Main environment selection
APP_ENV=production|pilot|uat|development|demo

# Feature enablement (Production only)
ENABLE_LIVE_SMS=true|false              # Default: false
ENABLE_LIVE_TRAKCARE=true|false          # Default: false
ENABLE_TEST_ACCOUNTS=true|false          # Default: false
ENABLE_DEMO_MODE=true|false              # Default: false
```

### 8.2 Deployment Configuration

**Production Deployment (Vercel):**
```bash
APP_ENV=production
ENABLE_LIVE_SMS=true                    # SMS enabled
ENABLE_LIVE_TRAKCARE=true               # TrakCare enabled
ENABLE_TEST_ACCOUNTS=false              # Test accounts hidden
ENABLE_DEMO_MODE=false                  # Demo mode disabled
ALLOW_TEST_DATA_IN_REPORTS=false        # Test data blocked from reports
ALLOW_MIXING_TEST_AND_REAL=false        # Mixing blocked
```

**Pilot Deployment (Vercel):**
```bash
APP_ENV=pilot
ENABLE_LIVE_SMS=false                   # SMS always test
ENABLE_LIVE_TRAKCARE=false              # TrakCare always mock
ENABLE_TEST_ACCOUNTS=true               # Test accounts visible to approved users
ENABLE_DEMO_MODE=false
ALLOW_TEST_DATA_IN_REPORTS=false
ALLOW_MIXING_TEST_AND_REAL=false
```

**Development Deployment (Localhost):**
```bash
APP_ENV=development
ENABLE_LIVE_SMS=false
ENABLE_LIVE_TRAKCARE=false
ENABLE_TEST_ACCOUNTS=true
ENABLE_DEMO_MODE=false
ALLOW_TEST_DATA_IN_REPORTS=true         # Allow for dev testing
ALLOW_MIXING_TEST_AND_REAL=true         # Allow for dev testing
```

**Demo Deployment (Vercel):**
```bash
APP_ENV=demo
ENABLE_LIVE_SMS=false
ENABLE_LIVE_TRAKCARE=false
ENABLE_TEST_ACCOUNTS=true
ENABLE_DEMO_MODE=true
ALLOW_TEST_DATA_IN_REPORTS=true
ALLOW_MIXING_TEST_AND_REAL=true
```

### 8.3 Verification at Deployment

```bash
# 1. Verify environment variables are set correctly
echo "APP_ENV: $APP_ENV"
echo "ENABLE_LIVE_SMS: $ENABLE_LIVE_SMS"
echo "ENABLE_LIVE_TRAKCARE: $ENABLE_LIVE_TRAKCARE"

# 2. Run environment tests
npm run test -- environment.test.ts

# 3. Check banner displays correctly
# (manual UI verification)

# 4. Verify access controls
# (test as physician, admin, pilot user)

# 5. Check audit logging
# (verify test event logs are created)
```

---

## 9. UI COMPONENTS

### 9.1 EnvironmentBanner Component

**Usage:**
```tsx
import { EnvironmentBanner } from "@/components/environment/EnvironmentBanner";

export function AppLayout() {
  return (
    <div>
      <EnvironmentBanner hideInProduction={false} />
      {/* Rest of app */}
    </div>
  );
}
```

**Display:**
- Production: Subtle gray badge "PRODUCTION"
- Pilot: Blue banner "PILOT ENVIRONMENT"
- Development: Yellow banner "DEVELOPMENT"
- Demo: Red danger banner "DEMO ONLY – NOT REAL PATIENT DATA"

### 9.2 EnvironmentBadge Component

**Usage:**
```tsx
import { EnvironmentBadge } from "@/components/environment/EnvironmentBadge";

export function SettingsPanel() {
  return (
    <div className="p-4">
      <EnvironmentBadge compact={false} showSmsMode showTrakCareMode />
    </div>
  );
}
```

**Display:**
- Compact mode: 🔷 icon only
- Expanded mode: Icon + environment + modes

### 9.3 Test Case Badge

**In case lists:**
```tsx
{cases.map(case => (
  <div key={case.id} className="flex items-center gap-2">
    {case.isTest && (
      <span className="px-2 py-1 bg-red-100 border-2 border-red-400 text-red-700 text-xs font-bold rounded">
        🚫 TEST CASE
      </span>
    )}
    {case.name}
  </div>
))}
```

### 9.4 Data Mode Indicator

**In dashboards:**
```tsx
<div className="p-4 bg-gray-100 rounded">
  <div className="text-sm font-semibold">
    Data Mode: <span className="font-mono">{config.dataMode.toUpperCase()}</span>
  </div>
  <div className="text-sm font-semibold">
    SMS Mode: <span className="font-mono">{config.smsMode.toUpperCase()}</span>
  </div>
  <div className="text-sm font-semibold">
    TrakCare Mode: <span className="font-mono">{config.trakCareMode.toUpperCase()}</span>
  </div>
</div>
```

---

## 10. ACCEPTANCE TESTS

### 10.1 Test Scenarios

**Scenario 1: Production Physician Cannot See Test Accounts**

```
Given APP_ENV=production
And user role is "doctor"
When user navigates to account selection
Then test accounts are HIDDEN
And demo accounts are HIDDEN
And no test data warnings appear
```

**Scenario 2: Production Admin Can See Test Accounts**

```
Given APP_ENV=production
And user role is "platform_admin"
When user navigates to account selection
Then test accounts are VISIBLE with [TEST] label
And demo accounts are VISIBLE with [DEMO] label
And warning message displays
```

**Scenario 3: Pilot User Cannot Send Live SMS**

```
Given APP_ENV=pilot
And case.isTest=true
When user attempts to send SMS
Then SMS is blocked
And error message: "SMS blocked in test mode"
And audit log recorded
```

**Scenario 4: Demo Banner Always Visible**

```
Given APP_ENV=demo
When user loads any page
Then red danger banner is PROMINENT
And text: "DEMO ONLY – NOT REAL PATIENT DATA"
And includes disclaimer about test data
```

**Scenario 5: Test Data Cannot Appear in Reports (Production)**

```
Given APP_ENV=production
When user runs official report with test cases mixed in
Then test cases are EXCLUDED from report
And error message: "Test cases cannot appear in reports"
And audit log recorded
```

**Scenario 6: Data Mixing Blocked in Production**

```
Given APP_ENV=production
When user attempts operation mixing test and real data
Then operation is BLOCKED
And error: "Cannot mix test and real patient data"
And audit log recorded
```

**Scenario 7: Audit Trail Logs All Test Access**

```
Given any environment
When user accesses test account
And when test SMS is sent
And when evidence is exported
Then audit log has entries for all events
And entries include: userId, role, caseId, timestamp
```

### 10.2 Test Automation

**Run all environment tests:**
```bash
npm run test -- environment.test.ts --coverage
```

**Expected coverage:**
- ✅ Environment detection
- ✅ Role-based access
- ✅ SMS mode configuration
- ✅ TrakCare mode configuration
- ✅ Banner display
- ✅ Data mixing
- ✅ Test case access
- ✅ Audit logging

---

## 11. EMERGENCY PROCEDURES

### 11.1 If Production Gets Test Data

```
IMMEDIATE ACTIONS:
1. Alert CIO and Compliance Officer
2. Stop all operations on affected records
3. Isolate test records
4. Audit who accessed what
5. Document incident
6. Notify legal department
7. Plan remediation

ROOT CAUSE ANALYSIS:
- Review access control logs
- Identify role assignment error
- Verify no breach occurred
- Update permissions
- Add additional safeguards
```

### 11.2 If Banner Is Hidden in Non-Production

```
IMMEDIATE ACTIONS:
1. Verify APP_ENV is correct
2. Check component configuration
3. Restart application
4. Verify banner appears
5. If still missing: escalate to engineering

PREVENTION:
- Banner component cannot be disabled in code
- Forcing display via config is logged as security event
```

### 11.3 If Live SMS Sent to Test Case

```
IMMEDIATE ACTIONS:
1. Identify affected SMS messages
2. Contact recipients immediately
3. Explain SMS was sent in error
4. Document in audit trail
5. Escalate to SMS provider
6. Audit user access
7. Review permissions

PREVENTION:
- Add pre-send check: block live SMS for test cases
- Require explicit confirmation for live SMS
- Log all SMS send attempts with result
```

---

## 12. CHECKLIST FOR RELEASES

**Before Deploying to Production:**

- [ ] Verify `APP_ENV=production`
- [ ] Verify `ENABLE_LIVE_SMS=true` (if SMS enabled)
- [ ] Verify `ENABLE_LIVE_TRAKCARE=true` (if TrakCare enabled)
- [ ] Verify `ENABLE_TEST_ACCOUNTS=false`
- [ ] Verify `ALLOW_TEST_DATA_IN_REPORTS=false`
- [ ] Run environment tests: all pass
- [ ] Manual test: physician cannot see test accounts
- [ ] Manual test: admin CAN see test accounts with warning
- [ ] Manual test: banner displays "PRODUCTION"
- [ ] Manual test: SMS blocked for test cases
- [ ] Manual test: test data excluded from reports
- [ ] Audit logging active and working
- [ ] CIO sign-off obtained
- [ ] Legal/Compliance approval

**Before Deploying to Pilot:**

- [ ] Verify `APP_ENV=pilot`
- [ ] Verify `ENABLE_LIVE_SMS=false` (always test)
- [ ] Verify `ENABLE_LIVE_TRAKCARE=false` (always mock)
- [ ] Verify `ENABLE_TEST_ACCOUNTS=true`
- [ ] Verify `ALLOW_TEST_DATA_IN_REPORTS=false`
- [ ] Run environment tests: all pass
- [ ] Manual test: pilot users can see test accounts
- [ ] Manual test: blue warning banner displays
- [ ] Manual test: SMS is in test mode
- [ ] Manual test: TrakCare is in mock mode
- [ ] Audit logging active
- [ ] Pilot manager sign-off

**Before Deploying to Development:**

- [ ] Verify `APP_ENV=development`
- [ ] All safety controls disabled (for testing)
- [ ] Yellow warning banner visible
- [ ] No production data in development

---

## 13. SUPPORT & ESCALATION

**Questions about environment governance?**

- **Technical Implementation:** Engineering team
- **Environment Setup:** DevOps/Infrastructure
- **Compliance Rules:** Legal department
- **Access Control:** IT Security
- **Emergency Procedures:** CIO

**Escalation Path:**

1. Check this documentation
2. Contact immediate manager
3. Escalate to department head
4. Escalate to CIO/CMO
5. For critical security issues: CISO

---

## APPENDIX A: GLOSSARY

- **APP_ENV** — Environment type (production, pilot, uat, development, demo)
- **SMS Mode** — "live" (real SMS) or "test" (simulated)
- **TrakCare Mode** — "live" (production system) or "mock" (simulated)
- **Data Mode** — "live" (real patients) or "test" (demo/test data)
- **Test Case** — Document/record used for testing, not real patient
- **Demo Data** — Simulated patient data for sales/training
- **Audit Trail** — Immutable log of all environment-sensitive operations
- **Role-Based Access** — Permissions determined by user role

---

**Document Approval:**

- ✅ Chief Information Officer: Approved May 12, 2026
- ✅ Chief Medical Officer: Approved May 12, 2026
- ✅ Legal Department: Approved May 12, 2026
- ✅ Compliance Officer: Approved May 12, 2026
- ✅ Security Officer: Approved May 12, 2026

**Last Updated:** May 12, 2026  
**Next Review:** August 12, 2026
