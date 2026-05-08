# WathiqCare Deployment SOP

## Scope

This SOP governs controlled deployment of the validated WathiqCare production-ready baseline. It is intended for low-change operational release execution, not feature rollout.

## Baseline

- Approved baseline commit: `396cda6`
- Do not substitute a newer build unless a release owner explicitly authorizes it.

## Preconditions

- Production environment variables reviewed against `docs/production-release-package.md`
- Database target confirmed as UTF-8 compatible for Arabic legal package persistence
- Rollback owner assigned
- Monitoring owner assigned
- Post-deploy smoke tester assigned
- Current backup and previous deployment references recorded before release

## Deployment Steps

1. Confirm the deployment is based on commit `396cda6`.
2. Confirm no unapproved code changes are included beyond governance or monitoring-safe updates.
3. Verify frontend and backend environment variables are present and aligned.
4. Verify database connectivity and target database encoding expectations.
5. Apply only approved database migrations, if any are required for the exact release package.
6. Deploy backend service.
7. Validate backend health endpoint and startup logs.
8. Deploy frontend service.
9. Validate application health, login availability, and authenticated routing.
10. Run the production smoke or production-like gate applicable to the environment.
11. Record deployment timestamp, operator, environment, and outcome in the release log.

## Mandatory Post-Deploy Checks

- Login succeeds for at least one authorized platform or tenant user
- Case workspace loads without blocking console or server errors
- Secure patient link generation path is reachable
- OTP issue and verify path is operational
- Arabic and English PDF generation path remains operational
- Legal package generation path remains operational
- Audit log writes and audit-chain writes are visible

## Release Stop Conditions

Stop deployment and move to rollback if any of the following occur:

- Authentication or session regression
- UTF-8 or encoding regression affecting Arabic legal output
- OTP replay, expiry, or resend protections no longer behave as validated
- Secure-link public flow fails or returns unexpected authorization behavior
- PDF or legal package generation fails in the target environment
- Audit writes fail for critical medico-legal actions

## Required Records

- Deployment operator
- Environment
- Commit hash
- Time started and completed
- Smoke test result
- Any deviations approved during release
