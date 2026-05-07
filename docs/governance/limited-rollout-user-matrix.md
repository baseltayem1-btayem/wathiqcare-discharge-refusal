# Limited Rollout User Matrix

## Status

- Prepared on: 2026-05-07
- Baseline: `396cda6`
- Current state: `READY TO POPULATE, NOT READY TO EXECUTE`

## Allowed Groups Only

| Group | Canonical Role | Membership Mapping | Expected Dashboard | Rollout Status |
| --- | --- | --- | --- | --- |
| Legal Affairs | `legal_admin` | `ADMIN` | `/legal/dashboard` | Pending named invite |
| Selected Physician | `doctor` | `MANAGER` | `/doctor/dashboard` | Pending named invite |
| Medical Director | `medical_director` | `OWNER` | `/medical-director/dashboard` | Pending named invite |
| Quality | `quality` | `VIEWER` | `/compliance` and approved reporting surfaces | Pending named invite |
| Compliance | `compliance` | `VIEWER` | `/compliance` and approved reporting surfaces | Pending named invite |
| Limited IT Support | `tenant_admin` or `it_admin` | `ADMIN` | `/tenant/dashboard` or approved admin surface | Pending named invite |

## Required Restrictions

- No open registration
- No public onboarding
- Invite-only activation for every rollout user
- No rollout expansion beyond the table above without formal approval

## Live Blocking Issues

- `POST /api/auth/password/signup` is still publicly reachable on the live host and must be blocked or disabled for controlled rollout
- named invited accounts were not available during the 2026-05-07 live validation session
- Phase 1 release gate failed before RBAC validation because the live environment did not contain the release-gate identities

## Before First Rollout Login

- assign a named user to each approved row
- verify invitation delivery and first-login access
- verify dashboard routing per role
- verify audit and secure-link traceability per role
- confirm support and escalation owners
