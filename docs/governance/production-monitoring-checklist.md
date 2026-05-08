# WathiqCare Production Monitoring Checklist

## Purpose

This checklist defines the minimum monitoring and operator review points for the validated WathiqCare release baseline.

## Existing Instrumentation Confirmed

The following monitoring-relevant coverage is already present in the application baseline:

- Live acknowledgment session telemetry for OTP-linked tablet workflows in `apps/web/app/api/discharge/cases/[caseId]/acknowledgment/start/route.ts`
- Live acknowledgment verification telemetry for OTP success and failure in `apps/web/app/api/discharge/cases/[caseId]/acknowledgment/[sessionId]/verify/route.ts`
- Shared searchable OTP runtime markers in `apps/web/src/lib/server/acknowledgment-telemetry.ts`
- Legal case PDF lifecycle and generation failure logging in `apps/web/src/lib/server/legal-case-pdf-service.ts`
- Automatic PDF generation failure audit writes in `apps/web/src/lib/server/dischargeRefusalWorkflow.ts`
- Legal package export events in `apps/web/src/lib/server/case-compliance-service.ts`
- Legal package module generation and signature events in `apps/web/src/lib/server/legal-package-module-service.ts`
- Authentication and session warning/error logging in `apps/web/src/lib/server/auth.ts`
- Audit-chain append failure logging in `apps/web/src/lib/server/saas-services.ts`
- Secure-link create, revoke, and public-decision success auditing in `apps/web/src/lib/server/secure-links.ts`

## Monitoring Addition Made In Governance Phase

Two minimal observability additions were made to close silent monitoring gaps:

- Structured server logging for rejected public secure-link lookup, access, and decision submission attempts in `apps/web/src/lib/server/secure-links.ts`
- Structured OTP dispatch and verification markers for the live acknowledgment API path in `apps/web/src/lib/server/acknowledgment-telemetry.ts`

## Daily Checks

- Review authentication failures and session anomalies
- Review OTP failure rates, resend throttling events, and replay-blocked events
- Review secure-link rejection spikes and secure-link decision failures
- Review PDF generation failures and legal package generation failures
- Review audit write failures and audit-chain append failures

## Release-Day Checks

- Confirm login success for authorized test account
- Confirm `ACKNOWLEDGMENT_OTP_DISPATCH` appears for OTP-linked acknowledgment sessions
- Confirm `ACKNOWLEDGMENT_OTP_VERIFY` appears for both successful and failed OTP verification attempts
- Confirm secure-link public flow availability
- Confirm Arabic PDF generation integrity
- Confirm legal package generation and export path
- Confirm audit events appear for critical workflow actions

## Alert Conditions

Investigate immediately if any of the following are observed:

- Repeated `public_secure_link_access_rejected` or `public_secure_link_decision_rejected` events
- Missing `ACKNOWLEDGMENT_OTP_DISPATCH` or `ACKNOWLEDGMENT_OTP_VERIFY` events during controlled acknowledgment tests
- OTP verification failure spikes inconsistent with expected traffic
- `pdf_generation_failed` events
- Legal package generation blocked or failed events during normal workflow
- Audit-chain append failures or audit persistence failures
- Authentication failures clustered by route, tenant, or environment change window
- Any sign of Arabic encoding corruption or malformed legal artifact output

## Escalation Rule

Escalate to IT and Quality/Compliance on the same business day for any issue affecting:

- legal defensibility
- audit continuity
- signature evidence
- Arabic PDF integrity
- patient-facing secure decision capture

## Operator Log Fields To Capture

- timestamp
- environment
- component
- event name
- route or runtime source when available
- tenant or case identifier when available
- session identifier for acknowledgment traces
- impact summary
- action taken
