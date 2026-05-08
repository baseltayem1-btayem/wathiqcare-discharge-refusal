# WathiqCare Rollback SOP

## Purpose

This SOP defines rollback actions for the validated WathiqCare release baseline when production behavior deviates from the approved state.

## Rollback Triggers

Initiate rollback immediately when any critical control fails:

- Login or session issuance failure
- Forced-reset logic failure
- OTP control failure, including resend throttling or replay protection regression
- Secure-link patient decision flow failure
- Signature or audit persistence failure
- Arabic PDF rendering failure
- Legal package generation failure
- Database encoding issue affecting medico-legal content

## Rollback Decision Rule

If the issue blocks legal defensibility, patient-flow completion, or production authentication, rollback takes precedence over in-place debugging.

## Rollback Procedure

1. Freeze further deployment activity.
2. Notify IT, Operations, and Quality/Compliance that rollback is in progress.
3. Revert frontend to the previous known-good deployment.
4. Revert backend to the previous known-good deployment.
5. Revert environment variable changes introduced in the failed release if applicable.
6. Do not run ad hoc schema changes during rollback unless they are part of the approved rollback script.
7. Re-test login, case workspace, secure-link flow, OTP flow, PDF generation, and audit visibility.
8. Record the rollback time, operator, reason, and restored version.

## Data Protection During Rollback

- Do not delete audit logs.
- Do not purge generated legal artifacts.
- Do not modify production case records manually unless approved by Legal Affairs and IT.
- Preserve all failed-release logs for incident review.

## Incident Follow-Up

After rollback, create an incident record containing:

- Trigger condition
- First observed time
- User or workflow affected
- Restored version
- Root-cause owner
- Whether the issue impacted legal defensibility or patient-flow continuity
