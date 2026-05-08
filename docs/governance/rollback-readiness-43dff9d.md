# Rollback Readiness: 43dff9d

## Principles
- Prefer rapid containment first, then full rollback if needed.
- Preserve discharge-refusal continuity as highest workflow priority.
- Do not run destructive data rollback unless explicitly approved.

## Scenario A: Failed Migration
Rollback triggers:
- Migration step fails or partial schema state blocks startup.
- Module API errors indicate missing promissory schema objects.
Rollback scope:
- Revert application deployment to prior stable artifact.
- Disable module route exposure for promissory-notes until schema is healthy.
Verification after rollback:
- App startup succeeds.
- Baseline discharge-refusal routes and APIs work.
- Error rate returns to pre-release baseline.

## Scenario B: RBAC Regression
Rollback triggers:
- Over-permission or under-permission observed in role matrix checks.
- Unauthorized module access by tenant users.
Rollback scope:
- Revert to previous stable artifact or disable affected module route exposure.
- Enforce temporary restrictive access policy while triaging.
Verification after rollback:
- Role matrix checks pass for critical roles.
- Blocked routes are denied/redirected as expected.

## Scenario C: Auth Regression
Rollback triggers:
- Elevated login failures, session invalidation loops, or claim parsing failures.
Rollback scope:
- Roll back application artifact.
- Restore prior auth/session configuration profile.
Verification after rollback:
- Login success and session persistence return to baseline.
- Protected route access succeeds for valid users.

## Scenario D: Routing Regression
Rollback triggers:
- Module routes or compatibility aliases return 404/500 unexpectedly.
Rollback scope:
- Revert deployment and disable newly exposed route surface.
Verification after rollback:
- Core routes resolve.
- Module and compatibility paths align with baseline behavior.

## Scenario E: Discharge-Refusal Compatibility Regression
Rollback triggers:
- Legacy discharge-refusal operational path fails or redirects incorrectly.
Rollback scope:
- Immediate rollback to prior stable release.
- Keep discharge-refusal entry points pinned to validated baseline.
Verification after rollback:
- Discharge-refusal end-to-end smoke path passes.
- Legal evidence/audit output path remains available.

## Rollback Command and Governance Checklist
- [ ] Incident owner assigned.
- [ ] Trigger condition recorded with timestamp.
- [ ] Rollback scope selected (full artifact or route exposure containment).
- [ ] Post-rollback verification suite executed.
- [ ] Stakeholders notified with closure summary.
