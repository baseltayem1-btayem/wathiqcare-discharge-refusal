# Daily Validation Checklist

## Session Header

- Date: ____________________
- Environment: Controlled UAT / Limited Rollout
- Reviewer: ____________________

## Daily Checks

- login succeeds for approved users only
- no public signup or onboarding path is exposed
- dashboard routing matches approved role mapping
- OTP issue, resend, expiry, and replay protections behave as expected
- secure-link generation and secure patient flow remain available
- signature submission succeeds where expected
- audit events remain visible for critical actions
- Arabic PDF generation succeeds without corruption
- English PDF generation succeeds
- legal-package generation succeeds
- downloads remain available
- logout and session cleanup succeed

## Daily Monitoring Checks

- authentication failures reviewed
- OTP failures reviewed
- secure-link failures reviewed
- PDF failures reviewed
- legal-package failures reviewed
- audit failures reviewed
- storage failures reviewed
- API 500 errors reviewed

## Outcome

- Result: Pass / Fail / Hold
- Issues observed: ____________________
- Mitigations applied: ____________________
- Escalations opened: ____________________
