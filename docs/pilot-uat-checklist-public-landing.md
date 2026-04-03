# Pilot UAT Checklist: Public Landing + Internal App Continuity

Date baseline: March 9, 2026
Target domain: https://wathiqcare.online

## Scope
- Validate public landing page at root route
- Validate bilingual behavior (Arabic/English)
- Validate continuity of authenticated workflows
- Validate no regression to consent/refusal/legal/audit modules

## Tester Profiles
- Clinical lead
- Legal officer
- Compliance officer
- Admin operator

## Pre-Checks
1. Confirm deployment includes latest frontend build.
2. Confirm backend API is reachable by frontend environment.
3. Confirm pilot test user credentials are valid.

## Test Cases

### TC-01 Public Root Page
- Step: Open https://wathiqcare.online/
- Expected:
  - Public WathiqCare landing is displayed
  - No forced redirect to internal dashboard

### TC-02 English Experience
- Step: Set language to English on landing
- Expected:
  - Page content appears in English
  - Layout direction is LTR
  - CTA text is English

### TC-03 Arabic Experience
- Step: Set language to Arabic on landing
- Expected:
  - Page content appears in Arabic
  - Layout direction is RTL
  - CTA text is Arabic

### TC-04 Enter System CTA
- Step: Click Enter System CTA
- Expected:
  - Navigates to https://wathiqcare.online/login
  - Login page loads successfully

### TC-05 Request Demo CTA
- Step: Click Request Demo CTA
- Expected:
  - Opens configured contact action (mailto placeholder accepted)

### TC-06 Login Continuity
- Step: Login with valid pilot account
- Expected:
  - Authentication succeeds
  - User reaches the system (dashboard/app)

### TC-07 Core Routes Reachability
- Step: Navigate to each route after login
  - /dashboard
  - /cases
  - /consents
  - /workflow
  - /escalation-timeline
  - /audit-log
  - /legal-case-file
  - /admin
  - /bundles
- Expected:
  - All routes load with no auth/routing regressions

### TC-08 Consent Flow Continuity
- Step:
  1. Open a case
  2. Open informed consent
  3. Open refusal form
- Expected:
  - Pages load and remain usable
  - No new errors introduced by landing release

### TC-09 Audit and Compliance Continuity
- Step:
  1. Open audit log viewer
  2. Open compliance page
- Expected:
  - Data loads for pilot tenant
  - No blocking errors

## Sign-Off Matrix
- Product sign-off: PASS / FAIL
- Clinical sign-off: PASS / FAIL
- Legal sign-off: PASS / FAIL
- Compliance sign-off: PASS / FAIL
- Engineering sign-off: PASS / FAIL

## Defect Severity Guide
- Sev 1: Production blocker (login broken, routes inaccessible, major data loss risk)
- Sev 2: Critical workflow degradation (consent/refusal/escalation blocked)
- Sev 3: Functional issue with workaround
- Sev 4: Cosmetic or copy issue only

## Go/No-Go Rule
- GO only if all Sev 1 and Sev 2 defects are closed.
- No-Go if any Sev 1 remains open.

## Known Asset Gap
- Official WathiqCare logo file is not yet provided in repository assets.
- Current landing uses text + monogram placeholder branding until official logo is supplied.
