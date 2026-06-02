# Pilot Rollback Authorization

Date: 2026-06-01
Phase: 33A
Purpose: Define rollback triggers and authority.

## Rollback triggers
- protected-path runtime failure
- signing failure
- OTP failure
- evidence/audit failure
- Arabic mojibake/corruption
- tenant isolation warning
- unexpected public link exposure
- API 500 spike
- unauthorized data visibility

## Rollback authority
- Rollback decision owner: TBD
- Rollback executor: TBD
- Communication owner: TBD

## Post-rollback validation checklist
- [ ] New pilot activity stopped.
- [ ] Affected tenant access reviewed or disabled if required.
- [ ] Signing and public-link exposure rechecked.
- [ ] Evidence and audit integrity reviewed.
- [ ] Arabic content integrity reviewed.
- [ ] Tenant isolation revalidated.
- [ ] Incident log updated.
- [ ] Stakeholders notified.
- [ ] Restart blocked pending approval.
