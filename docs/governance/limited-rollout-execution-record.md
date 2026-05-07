# Limited Rollout Execution Record

## Status

- Phase: Limited Rollout
- Entry condition met from Phase 1: Yes / No
- Observation owner: ____________________
- Start date: ____________________
- End date: ____________________

## Limited Rollout Users

| User | Email | Role | Expected Dashboard | Status |
| --- | --- | --- | --- | --- |
| Legal Affairs | ____________________ | `legal_admin` | `/legal/dashboard` | Pending |
| Selected Physician 1 | ____________________ | `doctor` | `/doctor/dashboard` | Pending |
| Selected Physician 2 | ____________________ | `doctor` | `/doctor/dashboard` | Pending |
| Medical Director | ____________________ | `medical_director` | `/medical-director/dashboard` | Pending |
| Quality/Compliance | ____________________ | `compliance` or `quality` | `/compliance` and allowed reporting surfaces | Pending |

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
| `legal_admin` | Pending | Pending | Pending | Pending | Pending |
| `doctor` | Pending | Pending | Pending | Pending | Pending |
| `medical_director` | Pending | Pending | Pending | Pending | Pending |
| `quality` / `compliance` | Pending | Pending | Pending | Pending | Pending |

## User Onboarding Instructions

1. Use only the invitation link provided by the WathiqCare administrator.
2. Complete password setup or first-login flow immediately.
3. Access only the assigned dashboard and workflows.
4. Report any route, permission, OTP, secure-link, PDF, or legal package anomaly immediately.
5. Do not share secure links, screenshots containing patient data, or credentials.

## Operational Support Contacts

- IT support owner: ____________________
- Clinical workflow owner: ____________________
- Legal Affairs owner: ____________________
- Compliance owner: ____________________
- Escalation path: ____________________

## First-Use Monitoring Checklist

- review authentication failures after first login wave
- review OTP failures and replay blocks
- review secure-link rejections and decision events
- review PDF generation failures
- review legal package generation failures
- review audit write failures and API 500 errors
- confirm no unauthorized route access attempts succeeded

## Phase 2 Output Summary

- Limited rollout users: ____________________
- Role mapping: ____________________
- Access validation results: ____________________
- Operational support contacts: ____________________
- First-use monitoring checklist status: ____________________
