# Phase 33 - Single-Tenant Controlled Pilot Runbook

Date: 2026-06-01
Repository: wathiqcare-discharge-refusal
Branch: phase24-evidence-package-final

## Runbook status
Preparation only.

Not executed in this phase:
- deployment
- migrations
- SMS enablement
- code changes
- OTP/signing/token/session logic changes
- Arabic guard changes
- broad patient delivery changes

## 1. Pilot objective
Validate WathiqCare controlled production readiness for one tenant only.

Pilot scope is limited to:
- Informed Consents
- Electronic Promissory Notes

Pilot decision basis:
- Single-tenant controlled pilot only.
- Multi-tenant rollout is not approved.
- Full production rollout is not approved.
- Phase 32E readiness outcome supports single-tenant pilot preparation with baseline waiver.

## 2. Pilot scope
Operational constraints for this pilot:
- Single tenant only.
- Limited approved users only.
- Limited approved departments only.
- Limited test or controlled cases only.
- Email-only delivery unless SMS is separately approved in a later gate.
- No broad patient delivery.
- No tenant expansion during pilot.
- No new module activation beyond the approved pilot modules.

## 3. Pre-deployment checklist
All items must be confirmed before deployment approval:

- [ ] Build passed.
- [ ] Protected-path TypeScript errors are zero.
- [ ] Baseline waiver approved.
- [ ] Phase 31H approval package exists.
- [ ] Phase 32 tenant isolation report reviewed.
- [ ] Phase 32E corrected report confirms readiness for single-tenant pilot.
- [ ] Pilot tenant identified and explicitly approved.
- [ ] Pilot user list approved.
- [ ] Pilot departments approved.
- [ ] Pilot monitoring contacts assigned.
- [ ] Rollback owner assigned.

Readiness evidence references:
- `docs/production-readiness/phase31h-final-controlled-pilot-baseline-waiver-approval.md`
- `docs/production-readiness/phase32-tenant-subscriber-isolation-verification-report.md`
- `docs/production-readiness/phase32e-focused-build-blocker-remediation-report.md`

## 4. Environment readiness
Verify the following without exposing secrets in chat, tickets, screenshots, or reports:

- [ ] Environment variables present and loaded for target environment.
- [ ] Application URL verified.
- [ ] Database connection verified.
- [ ] Email provider settings verified.
- [ ] SMS disabled.
- [ ] Arabic mojibake guard enabled.
- [ ] Logging enabled.
- [ ] Monitoring enabled.
- [ ] Error capture enabled.
- [ ] Audit logging enabled.
- [ ] Public signing telemetry visible.
- [ ] Access control configuration verified.

Required environment confirmation notes:
- Verify only presence, wiring, and expected behavior.
- Do not print secrets, tokens, passwords, or provider credentials.
- If any readiness item is uncertain, stop before deployment approval.

## 5. Pilot tenant configuration
Approved pilot model:
- One explicitly approved tenant only.
- Fixed allowlist only.
- No open self-service tenant access.
- No multi-tenant access paths.

Configuration checklist:
- [ ] Approved pilot tenant name recorded.
- [ ] Approved pilot tenant ID recorded.
- [ ] Fixed tenant allowlist confirmed.
- [ ] Modules enabled only for approved pilot modules.
- [ ] Informed Consents enabled.
- [ ] Electronic Promissory Notes enabled.
- [ ] No additional module exposure enabled for pilot by default.
- [ ] No cross-tenant access observed.
- [ ] Subscriber and tenant gating verified.

Pilot tenant record template:

| Field | Value | Owner | Verified on |
|---|---|---|---|
| Pilot tenant name | TBD | TBD | TBD |
| Pilot tenant ID | TBD | TBD | TBD |
| Allowlist enforced | TBD | TBD | TBD |
| Informed Consents enabled | TBD | TBD | TBD |
| Electronic Promissory Notes enabled | TBD | TBD | TBD |
| Multi-tenant access blocked | TBD | TBD | TBD |

## 6. Pilot users
Prepare and approve the user list before deployment.

Pilot user template:

| User name | Email | Role | Module access | Department | Pilot responsibility |
|---|---|---|---|---|---|
| TBD | TBD | TBD | TBD | TBD | TBD |
| TBD | TBD | TBD | TBD | TBD | TBD |
| TBD | TBD | TBD | TBD | TBD | TBD |

User governance checklist:
- [ ] Users belong to approved pilot tenant only.
- [ ] Least-privilege access applied.
- [ ] Department assignment verified.
- [ ] Named business owner assigned.
- [ ] Named technical escalation contact assigned.
- [ ] Pilot training completed.

## 7. Pilot test scenarios
Execute only controlled pilot scenarios for approved users and approved cases.

Core scenarios:
- [ ] Landing page loads.
- [ ] Request demo page loads.
- [ ] Informed consent creation succeeds.
- [ ] Secure link creation succeeds.
- [ ] OTP request succeeds.
- [ ] OTP verify succeeds.
- [ ] Education acknowledgement succeeds.
- [ ] Acceptance signing succeeds.
- [ ] Refusal signing succeeds, if included in pilot scope.
- [ ] Promissory note creation succeeds.
- [ ] Promissory note secure signing flow succeeds.
- [ ] Evidence package generation or verification succeeds.
- [ ] Audit trail writes succeed.
- [ ] Tenant isolation remains intact throughout scenario execution.
- [ ] Arabic content displays without corruption.

Scenario execution template:

| Scenario | Tenant | User | Test case ID | Expected result | Actual result | Evidence link | Status |
|---|---|---|---|---|---|---|---|
| Landing page loads | TBD | TBD | TBD | Page loads | TBD | TBD | TBD |
| Request demo page loads | TBD | TBD | TBD | Page loads | TBD | TBD | TBD |
| Informed consent creation | TBD | TBD | TBD | Success | TBD | TBD | TBD |
| Secure link creation | TBD | TBD | TBD | Success | TBD | TBD | TBD |
| OTP request/verify | TBD | TBD | TBD | Success | TBD | TBD | TBD |
| Education acknowledgement | TBD | TBD | TBD | Success | TBD | TBD | TBD |
| Acceptance signing | TBD | TBD | TBD | Success | TBD | TBD | TBD |
| Refusal signing | TBD | TBD | TBD | Success if in scope | TBD | TBD | TBD |
| Promissory note creation | TBD | TBD | TBD | Success | TBD | TBD | TBD |
| Promissory note secure signing | TBD | TBD | TBD | Success | TBD | TBD | TBD |
| Evidence or audit verification | TBD | TBD | TBD | Success | TBD | TBD | TBD |

## 8. Monitoring plan
Monitor continuously during pilot execution:
- OTP failures
- email delivery failures
- public signing errors
- evidence package failures
- audit write failures
- Arabic mojibake errors
- tenant isolation warnings
- API 500 errors

Monitoring checklist:
- [ ] Application logs monitored.
- [ ] Error dashboard monitored.
- [ ] Email delivery dashboard monitored.
- [ ] Public signing events monitored.
- [ ] Evidence package generation monitored.
- [ ] Audit persistence monitored.
- [ ] Tenant isolation anomalies monitored.
- [ ] Arabic corruption signals monitored.
- [ ] Alert routing to on-call or escalation contacts confirmed.

Suggested monitoring cadence:
- Pre-launch: verify dashboards and alert receivers.
- Launch window: active observation throughout first pilot cases.
- Day 1: review failures, warnings, retries, and delivery outcomes.
- Daily during pilot: review trend lines and incident log.

## 9. Rollback plan
Rollback is operational only and should be triggered immediately if pilot safety is in doubt.

Rollback triggers:
- protected-path runtime failure
- cross-tenant exposure signal
- signing failure
- evidence or audit failure
- Arabic corruption
- unexpected public link exposure

Rollback actions:
- [ ] Stop new pilot case creation.
- [ ] Disable pilot tenant access if needed.
- [ ] Disable affected module exposure if needed through approved operational controls.
- [ ] Preserve logs and audit evidence.
- [ ] Capture incident timeline.
- [ ] Notify technical owner, business owner, and compliance stakeholders.
- [ ] Reassess tenant isolation, signing integrity, and audit integrity before any restart.

Rollback ownership template:

| Role | Name | Contact | Responsibility |
|---|---|---|---|
| Technical owner | TBD | TBD | Execute operational rollback |
| Business owner | TBD | TBD | Approve pilot pause |
| Compliance owner | TBD | TBD | Review audit and exposure implications |
| Support contact | TBD | TBD | Coordinate user communications |

## 10. Go/No-Go checklist
Final gate must be completed immediately before any actual deployment approval.

Go checklist:
- [ ] Single approved tenant identified.
- [ ] User and department scope approved.
- [ ] Build validation confirmed passed.
- [ ] Protected-path validation confirmed zero real errors.
- [ ] Baseline waiver approved.
- [ ] Tenant isolation review accepted.
- [ ] Monitoring active.
- [ ] Rollback owners assigned.
- [ ] Email provider verified.
- [ ] SMS confirmed disabled.
- [ ] Arabic guard confirmed enabled.
- [ ] No unresolved critical runtime risk for pilot scope.

Final decision:
- READY FOR SINGLE-TENANT CONTROLLED PILOT DEPLOYMENT
- STOP - PILOT PRECONDITIONS NOT MET

## Current recommendation for preparation package
READY FOR SINGLE-TENANT CONTROLLED PILOT DEPLOYMENT

Reason:
- Build validation passed.
- Real protected-path TypeScript errors were verified as zero in the corrected Phase 32E report.
- Baseline waiver path exists via Phase 31H approval package.
- Pilot classification remains explicitly limited to single-tenant controlled pilot only.
- This runbook does not authorize deployment execution by itself; it prepares the operational gate package for that decision.
