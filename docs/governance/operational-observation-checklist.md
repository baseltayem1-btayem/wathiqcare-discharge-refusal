# Operational Observation Checklist

## Window

- Observation period start: ____________________
- Observation period end: ____________________
- Environment: Controlled UAT / Limited Rollout
- Monitoring owner: ____________________

## Priority Signals

- authentication failures
- OTP failures
- OTP replay attempts
- OTP resend throttling
- secure-link failures
- expired secure-link access
- rejected public decision attempts
- PDF generation failures
- legal-package generation failures
- audit write failures
- storage failures
- API 500 errors
- database encoding errors

## Hourly Or Shift Review

- check login failures and role-routing anomalies
- check OTP failures, replay blocks, and resend throttling spikes
- check secure-link access rejection and decision rejection events
- check PDF and legal-package generation failures
- check audit write failures and storage failures
- check API 500 spikes
- check any evidence of unexpected role access

## Stop Conditions

- repeated authentication failures affecting approved users
- secure-link workflow failure affecting patient decision capture
- OTP control failure or replay protection regression
- PDF or legal-package generation failure for approved rollout users
- missing audit persistence for critical actions
- evidence of encoding corruption in Arabic output
- unexpected access outside the approved rollout group

## Action On Stop Condition

- pause new user onboarding
- log incident using `docs/governance/incident-log-template.md`
- notify IT, Legal Affairs, Medical Director, and Quality/Compliance
- evaluate rollback against `docs/governance/rollback-sop.md`
