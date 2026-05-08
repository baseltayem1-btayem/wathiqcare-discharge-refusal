# Limited Rollout Execution Record

## Status

- Phase: Limited Rollout
- Entry condition met from Phase 1: No
- Observation owner: Pending successful controlled UAT completion
- Start date: Not started
- End date: Not started
- Current gating note: public-signup blocking is prepared in code and locally validated, but limited rollout remains blocked until that control is deployed and externally verified on the live host alongside controlled UAT account provisioning

## Limited Rollout Users

| User | Email | Role | Expected Dashboard | Status |
| --- | --- | --- | --- | --- |
| Legal Affairs | Pending named invite | `legal_admin` | `/legal/dashboard` | Blocked until Phase 1 passes |
| Selected Physician 1 | Pending named invite | `doctor` | `/doctor/dashboard` | Blocked until Phase 1 passes |
| Selected Physician 2 | Pending named invite | `doctor` | `/doctor/dashboard` | Blocked until Phase 1 passes |
| Medical Director | Pending named invite | `medical_director` | `/medical-director/dashboard` | Blocked until Phase 1 passes |
| Quality/Compliance | Pending named invite | `compliance` or `quality` | `/compliance` and allowed reporting surfaces | Blocked until Phase 1 passes |

## Role Mapping

- Legal Affairs -> `legal_admin` -> membership `ADMIN`
- Selected physicians -> `doctor` -> membership `MANAGER`
- Medical Director -> `medical_director` -> membership `OWNER`
- Quality/Compliance -> `quality` or `compliance` -> membership `VIEWER`

## Access Validation

Required checks:

- each user reaches only the permitted dashboard and workflow surfaces
- no unauthorized routes are accessible
- audit trail records user activity
- secure-link actions are logged
- PDF and legal package generation remain functional

Validation results:

| Role | Dashboard Access | Unauthorized Route Blocked | Audit Visible | Secure-Link Logging Visible | PDF/Legal Package Pass |
| --- | --- | --- | --- | --- | --- |
| `legal_admin` | Blocked pending invited account | Blocked pending invited account | Blocked pending Phase 1 | Blocked pending Phase 1 | Blocked pending Phase 1 |
| `doctor` | Blocked pending invited account | Blocked pending invited account | Blocked pending Phase 1 | Blocked pending Phase 1 | Blocked pending Phase 1 |
| `medical_director` | Blocked pending invited account | Blocked pending invited account | Blocked pending Phase 1 | Blocked pending Phase 1 | Blocked pending Phase 1 |
| `quality` / `compliance` | Blocked pending invited account | Blocked pending invited account | Blocked pending Phase 1 | Blocked pending Phase 1 | Blocked pending Phase 1 |

## User Onboarding Instructions

1. Use only the invitation link provided by the WathiqCare administrator.
2. Complete password setup or first-login flow immediately.
3. Access only the assigned dashboard and workflows.
4. Report any route, permission, OTP, secure-link, PDF, or legal package anomaly immediately.
5. Do not share secure links, screenshots containing patient data, or credentials.

## Operational Support Contacts

- IT support owner: Pending named owner from hospital operations
- Clinical workflow owner: Pending named owner from clinical leadership
- Legal Affairs owner: Pending named owner from Legal Affairs
- Compliance owner: Pending named owner from Quality/Compliance
- Escalation path: Use `docs/governance/incident-log-template.md` and `docs/governance/operational-observation-checklist.md`; named on-call path still required before rollout start

## First-Use Monitoring Checklist

- review authentication failures after first login wave
- review OTP failures and replay blocks
- review secure-link rejections and decision events
- review PDF generation failures
- review legal package generation failures
- review audit write failures and API 500 errors
- confirm no unauthorized route access attempts succeeded

## Phase 2 Output Summary

- Limited rollout users: Not yet provisioned
- Role mapping: Prepared, not yet exercised live
- Access validation results: Blocked pending successful Phase 1 controlled UAT
- Operational support contacts: Framework prepared, named contacts pending
- First-use monitoring checklist status: Prepared, not started
- Remaining Phase 1 blockers: live platform access unavailable due to credential/rate-limit failures, signup hardening not yet externally verified, and DB/backup/log access not provided
